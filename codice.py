# Core imports for the Flask web server, data processing, and graph analysis.
from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
import networkx as nx
import networkx.algorithms.community as nx_comm
import infomap
import io
from datetime import datetime
import community.community_louvain as community_louvain
import matplotlib.colors as mcolors
from nilearn import datasets, surface
import re
from collections import defaultdict

# Initialize the Flask application
app = Flask(__name__)

# In-memory store for graph objects shared between the /upload and /run_mulan routes.
# These are populated on upload and consumed by the MuLaN alignment endpoint.
GLOBAL_DATA = {
    'G_sani':    None,
    'G_depr':    None,
    'aligned_G': None,
}

# Load the fsaverage5 surface mesh at startup so it is ready when the first upload request arrives. Both hemispheres are merged into a single coordinate and face array, with right-hemisphere face indices offset by the number of left-hemisphere vertices to avoid collisions.
fsaverage    = datasets.fetch_surf_fsaverage(mesh='fsaverage5')
coords_l, faces_l = surface.load_surf_data(fsaverage.pial_left)
coords_r, faces_r = surface.load_surf_data(fsaverage.pial_right)
faces_r_offset = faces_r + len(coords_l)
mesh_data = {
    "x": np.concatenate([coords_l[:, 0], coords_r[:, 0]]).tolist(),
    "y": np.concatenate([coords_l[:, 1], coords_r[:, 1]]).tolist(),
    "z": np.concatenate([coords_l[:, 2], coords_r[:, 2]]).tolist(),
    "i": np.concatenate([faces_l[:, 0], faces_r_offset[:, 0]]).tolist(),
    "j": np.concatenate([faces_l[:, 1], faces_r_offset[:, 1]]).tolist(),
    "k": np.concatenate([faces_l[:, 2], faces_r_offset[:, 2]]).tolist()
}


def extract_coords(name):
    """
    Parses MNI coordinates from a ROI name string of the form 'Label (x,y,z)'.
    Returns a list of three integers on success, or [NaN, NaN, NaN] if the
    pattern is absent or the input is not a string.
    """
    if not isinstance(name, str):
        return [np.nan] * 3
    m = re.search(r'\(([-]?\d+),([-]?\d+),([-]?\d+)\)', name)
    return [int(m.group(1)), int(m.group(2)), int(m.group(3))] if m else [np.nan] * 3


def create_multilayer_graph(nodes_df, edges_df):
    """
    Builds a nx.MultiGraph from the nodes DataFrame and the edges DataFrame.

    MultiGraph is used instead of a plain Graph because a simple Graph silently
    overwrites duplicate (u, v) pairs — any edge in layer 1 that also appears
    in layer 2 would be lost. MultiGraph preserves every edge instance, so
    both intra-layer and inter-layer connections survive intact.

    Only edges whose source_id and target_id both appear in nodes_df are
    kept; rows with non-numeric or missing IDs are dropped beforehand.
    """
    valid_ids  = set(nodes_df.index.tolist())
    edges_df   = edges_df.copy()
    edges_df['source_id'] = pd.to_numeric(edges_df['source_id'], errors='coerce')
    edges_df['target_id'] = pd.to_numeric(edges_df['target_id'], errors='coerce')
    edges_df   = edges_df.dropna(subset=['source_id', 'target_id'])
    edges_df['source_id'] = edges_df['source_id'].astype(int)
    edges_df['target_id'] = edges_df['target_id'].astype(int)
    edges = edges_df[
        edges_df['source_id'].isin(valid_ids) &
        edges_df['target_id'].isin(valid_ids)
    ]
    G = nx.MultiGraph()
    G.add_nodes_from(nodes_df.index.tolist())
    for _, r in edges.iterrows():
        G.add_edge(
            int(r['source_id']), int(r['target_id']),
            weight=float(r.get('weight', 1.0)),
            layer=int(r.get('layer', 1))
        )
    return G


def get_layer_subgraph(G, layer_num):
    """
    Returns a simple nx.Graph containing only the edges that belong to the
    specified layer. Nodes without any edge in that layer are still included
    so that node-level metrics remain aligned with the master node list.
    """
    H = nx.Graph()
    H.add_nodes_from(G.nodes(data=True))
    for u, v, d in G.edges(data=True):
        if d.get('layer') == layer_num:
            H.add_edge(u, v, weight=d.get('weight', 1.0))
    return H


def multigraph_to_simple(G):
    """
    Converts a MultiGraph into a simple Graph for algorithms that do not
    support multi-edges (e.g. community detection, betweenness centrality).
    When multiple edges exist between the same pair of nodes, the one with
    the highest weight is retained.
    """
    S = nx.Graph()
    S.add_nodes_from(G.nodes(data=True))
    for u, v, d in G.edges(data=True):
        if S.has_edge(u, v):
            if d.get('weight', 1.0) > S[u][v].get('weight', 1.0):
                S[u][v]['weight'] = d.get('weight', 1.0)
        else:
            S.add_edge(u, v, weight=d.get('weight', 1.0), layer=d.get('layer', 1))
    return S


def small_world_index(G):
    """
    Computes the small-world index σ = (C/C_rand) / (L/L_rand) for the
    largest connected component of G.

    For graphs with more than 150 nodes, the average path length is
    estimated by sampling 50 source nodes to avoid prohibitive runtime.
    Returns None when the graph is too small, disconnected, or degenerate.
    """
    if len(G.nodes()) < 5 or len(G.edges()) == 0:
        return None
    largest_cc = max(nx.connected_components(G), key=len)
    G_cc = G.subgraph(largest_cc).copy()
    n = len(G_cc.nodes())
    if n < 5:
        return None
    k_avg = np.mean(list(dict(G_cc.degree()).values()))
    if k_avg < 1:
        return None
    C = nx.average_clustering(G_cc)
    try:
        if n <= 150:
            L = nx.average_shortest_path_length(G_cc)
        else:
            rng    = np.random.default_rng(42)
            sample = rng.choice(list(G_cc.nodes()), size=min(50, n), replace=False).tolist()
            lengths = []
            for src in sample:
                d = nx.single_source_shortest_path_length(G_cc, src)
                lengths.extend(d.values())
            L = float(np.mean(lengths)) if lengths else float('inf')
    except Exception:
        return None
    if L in (float('inf'), 0):
        return None
    C_rand = k_avg / n
    L_rand = np.log(n) / np.log(k_avg) if k_avg > 1 else 1.0
    if C_rand <= 0 or L_rand <= 0:
        return None
    sigma = (C / C_rand) / (L / L_rand)
    return round(float(sigma), 3)


def get_graph_metrics(G):
    """
    Returns a dictionary of topological metrics for a simple graph G:
    arc count, density, modularity (Louvain), global efficiency, mean
    clustering coefficient, transitivity, and the small-world index.

    For large graphs (>200 nodes) global efficiency is replaced by local
    efficiency to keep computation time reasonable.
    """
    if len(G.edges()) == 0:
        return {"arc": 0, "den": 0, "mod": 0, "eff": 0, "clu": 0, "tra": 0, "small_world": None}
    part = community_louvain.best_partition(G)
    mod  = community_louvain.modularity(part, G)
    n    = len(G.nodes())
    eff  = round(nx.global_efficiency(G), 4) if n <= 200 else round(nx.local_efficiency(G), 4)
    return {
        "arc": len(G.edges()),
        "den": round(nx.density(G), 4),
        "mod": round(mod, 4),
        "eff": eff,
        "clu": round(nx.average_clustering(G), 4),
        "tra": round(nx.transitivity(G), 4),
        "small_world": small_world_index(G)
    }


def get_node_metrics(G, valid_ids):
    """
    Computes per-node degree, betweenness centrality, and clustering
    coefficient for every node in valid_ids, returning lists in the same
    order as the input so they map directly onto the node name array.
    """
    deg = dict(G.degree())
    bet = nx.betweenness_centrality(G)
    clu = nx.clustering(G)
    return {
        "deg": [deg.get(n, 0) for n in valid_ids],
        "bet": [round(bet.get(n, 0), 4) for n in valid_ids],
        "clu": [round(clu.get(n, 0), 4) for n in valid_ids]
    }


def get_hub_vulnerables(nodes_df, node_metrics_sani, sim_scores, top_n=10):
    """
    Ranks all nodes by their vulnerability score, defined as:
        vuln = betweenness_G1 × (1 − conservation_score)

    High betweenness means the node is topologically central in the healthy
    network; low conservation means it was significantly altered in the
    depressed group. Nodes that score high on both are the most clinically
    interesting. Only the top_n entries are returned.
    """
    nodes = []
    for i, node_id in enumerate(nodes_df.index):
        roi_name = (
            nodes_df.loc[node_id].get('roi_name', '')
            if hasattr(nodes_df.loc[node_id], 'get')
            else nodes_df.loc[node_id]['roi_name']
        )
        name  = re.sub(r'\s*\(.*?\)', '', str(roi_name)).strip()
        bet_s = node_metrics_sani['bet'][i]
        score = float(sim_scores.get(node_id, 0.0))
        vuln  = round(bet_s * (1.0 - score), 6)
        nodes.append({
            'name':     name,
            'bet_sani': round(bet_s, 4),
            'score':    round(score, 3),
            'deg_sani': node_metrics_sani['deg'][i],
            'vuln_score': vuln
        })
    nodes.sort(key=lambda x: x['vuln_score'], reverse=True)
    return nodes[:top_n]


def run_mulan_alignment(MLN1, MLN2, valid_ids):
    """
    Performs the MuLaN (Multilayer Network Alignment) local alignment between
    two multilayer graphs. For every edge (s1, s2) that exists in MLN1, the
    algorithm assigns a weight based on whether the same edge also exists in
    MLN2 (MATCH), is reachable within DELTA hops (MISMATCH), or is far away
    (GAP). The result is an alignment supergraph whose edge weights encode
    structural conservation between the two networks.

    Both inputs are converted to simple graphs before comparison because
    has_edge and shortest-path queries are undefined on MultiGraph.
    """
    pars = {'DELTA': 3, 'MATCH': 1.0, 'MISMATCH': 0.5, 'GAP': 0.2}
    S1 = multigraph_to_simple(MLN1)
    S2 = multigraph_to_simple(MLN2)
    all_lengths_2 = dict(nx.all_pairs_shortest_path_length(S2, cutoff=pars['DELTA']))
    aligned  = nx.Graph()
    int_ids  = [int(n) for n in valid_ids]
    for i, s1 in enumerate(int_ids):
        for s2 in int_ids[i + 1:]:
            if not S1.has_edge(s1, s2):
                continue
            layer_info = S1.get_edge_data(s1, s2).get('layer', 1)
            if S2.has_edge(s1, s2):
                w = pars['MATCH']
            else:
                path_len = all_lengths_2.get(s1, {}).get(s2, 10000)
                w = pars['MISMATCH'] if path_len <= pars['DELTA'] else pars['GAP']
            aligned.add_edge(f"{s1}-{s1}", f"{s2}-{s2}", weight=w, layer=layer_info)
    return aligned


def get_layer_edges(G, nodes_df, layer_num, z_offset):
    """
    Extracts 3-D line segments for all edges in the given layer of G.
    Each edge produces three coordinate triples: source, target, and a None
    separator — the None is required by Plotly's scatter3d line mode to break
    between disconnected segments without drawing a joining line.
    """
    ex, ey, ez = [], [], []
    for u, v, d in G.edges(data=True):
        if d.get('layer') == layer_num:
            try:
                ux = int(nodes_df.loc[int(u)]['X'])
                uy = int(nodes_df.loc[int(u)]['Y'])
                uz = int(nodes_df.loc[int(u)]['Z'])
                vx = int(nodes_df.loc[int(v)]['X'])
                vy = int(nodes_df.loc[int(v)]['Y'])
                vz = int(nodes_df.loc[int(v)]['Z'])
                ex.extend([ux, vx, None])
                ey.extend([uy, vy, None])
                ez.extend([uz + z_offset, vz + z_offset, None])
            except KeyError:
                continue
    return ex, ey, ez


def get_inter_edges(G, nodes_df, z_offset_1, z_offset_2):
    """
    Builds vertical line segments connecting the two layers of each node
    (layer 3 edges in the MultiGraph represent inter-layer couplings).
    Each node appears at most once: the first time it is encountered as a
    source of a layer-3 edge its vertical connector is emitted and the node
    is added to seen_nodes to prevent duplication.
    """
    ex, ey, ez = [], [], []
    seen_nodes = set()
    for u, v, d in G.edges(data=True):
        if d.get('layer') == 3 and u not in seen_nodes:
            seen_nodes.add(u)
            try:
                ux = int(nodes_df.loc[int(u)]['X'])
                uy = int(nodes_df.loc[int(u)]['Y'])
                uz = int(nodes_df.loc[int(u)]['Z'])
                ex.extend([ux, ux, None])
                ey.extend([uy, uy, None])
                ez.extend([uz + z_offset_1, uz + z_offset_2, None])
            except KeyError:
                continue
    return ex, ey, ez


@app.route('/')
def home():
    """Serves the single-page HTML application."""
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload():
    """
    Receives three CSV files (atlas, edges_sani, edges_depr), builds the
    multilayer graphs, runs MuLaN alignment, computes all metrics and node
    coordinates, and returns a JSON payload that the front-end uses to render
    the 3-D visualization and the analytics dashboard.

    The separator for edge files is detected automatically by comparing the
    frequency of ';' and ',' in the raw content — whichever appears more
    often is used as the delimiter.
    """
    try:
        f_atlas = request.files.get('atlas')
        f_sani  = request.files.get('edges_sani')
        f_depr  = request.files.get('edges_depr')

        if not f_atlas or not f_sani or not f_depr:
            return jsonify({"error": "All three files are required."}), 400

        nodes_df = pd.read_csv(f_atlas, sep=';')
        coords   = nodes_df['roi_name'].apply(extract_coords).apply(pd.Series)
        coords.columns = ['X', 'Y', 'Z']
        nodes_df = pd.concat([nodes_df, coords], axis=1).dropna(subset=['X', 'Y', 'Z'])
        nodes_df = nodes_df.set_index('roi_id')

        def read_edges(f):
            """Reads an edge file and auto-detects its column separator."""
            content = f.read().decode('utf-8')
            f.seek(0)
            sep = ';' if content.count(';') > content.count(',') else ','
            return pd.read_csv(io.StringIO(content), sep=sep)

        G_sani    = create_multilayer_graph(nodes_df, read_edges(f_sani))
        G_depr    = create_multilayer_graph(nodes_df, read_edges(f_depr))
        aligned_G = run_mulan_alignment(G_sani, G_depr, nodes_df.index.tolist())

        # Persist graphs in memory so the /run_mulan endpoint can access them
        GLOBAL_DATA['G_sani']    = G_sani
        GLOBAL_DATA['G_depr']    = G_depr
        GLOBAL_DATA['aligned_G'] = aligned_G

        # Derive per-node conservation scores from the alignment supergraph.
        # Each super-node "id-id" accumulates alignment weights from its incident
        # edges; the mean of those weights is the node's conservation score.
        sim_scores = {}
        for node in nodes_df.index:
            super_node = f"{int(node)}-{int(node)}"
            if super_node in aligned_G:
                weights = [d['weight'] for _, _, d in aligned_G.edges(super_node, data=True)]
                sim_scores[node] = round(sum(weights) / len(weights), 4) if weights else 0.0
            else:
                sim_scores[node] = 0.0

        # Node and topological metrics require simple graphs; MultiGraph edges
        # would produce misleading degree and centrality values.
        G_sani_simple = multigraph_to_simple(G_sani)
        G_depr_simple = multigraph_to_simple(G_depr)

        node_metrics_sani = get_node_metrics(G_sani_simple, nodes_df.index.tolist())
        node_metrics_depr = get_node_metrics(G_depr_simple, nodes_df.index.tolist())
        hub_vulnerables   = get_hub_vulnerables(nodes_df, node_metrics_sani, sim_scores)

        # Strip MNI coordinate suffix from display names (e.g. "PFC (10,20,30)" → "PFC")
        node_names = [
            re.sub(r'\s*\(.*?\)', '', str(row['roi_name'])).strip()
            for _, row in nodes_df.iterrows()
        ]

        # Z offsets that vertically separate the four brain layers in 3-D space:
        # Group 1 layer 1 at z+0, layer 2 at z+80; Group 2 layer 1 at z+200, layer 2 at z+280.
        z_off   = {'s1': 0, 's2': 80, 'd1': 200, 'd2': 280}
        base_x  = nodes_df['X'].tolist()
        base_y  = nodes_df['Y'].tolist()
        base_z  = nodes_df['Z'].tolist()

        es1_x, es1_y, es1_z = get_layer_edges(G_sani, nodes_df, 1, z_off['s1'])
        es2_x, es2_y, es2_z = get_layer_edges(G_sani, nodes_df, 2, z_off['s2'])
        esi_x, esi_y, esi_z = get_inter_edges(G_sani, nodes_df, z_off['s1'], z_off['s2'])

        ed1_x, ed1_y, ed1_z = get_layer_edges(G_depr, nodes_df, 1, z_off['d1'])
        ed2_x, ed2_y, ed2_z = get_layer_edges(G_depr, nodes_df, 2, z_off['d2'])
        edi_x, edi_y, edi_z = get_inter_edges(G_depr, nodes_df, z_off['d1'], z_off['d2'])

        # Compute per-layer topological metrics separately, so the dashboard
        # can display Layer 1 vs Layer 2 comparisons within each group.
        metrics_sani_L1 = get_graph_metrics(get_layer_subgraph(G_sani, 1))
        metrics_sani_L2 = get_graph_metrics(get_layer_subgraph(G_sani, 2))
        metrics_depr_L1 = get_graph_metrics(get_layer_subgraph(G_depr, 1))
        metrics_depr_L2 = get_graph_metrics(get_layer_subgraph(G_depr, 2))

        return jsonify({
            "mesh":    mesh_data,
            "offsets": z_off,
            "nodes": {
                "names":        node_names,
                "base_x":       base_x,
                "base_y":       base_y,
                "base_z":       base_z,
                "scores":       [float(sim_scores.get(n, 0)) for n in nodes_df.index],
                "metrics_sani": node_metrics_sani,
                "metrics_depr": node_metrics_depr
            },
            "edges": {
                "s1": {"x": es1_x, "y": es1_y, "z": es1_z},
                "s2": {"x": es2_x, "y": es2_y, "z": es2_z},
                "si": {"x": esi_x, "y": esi_y, "z": esi_z},
                "d1": {"x": ed1_x, "y": ed1_y, "z": ed1_z},
                "d2": {"x": ed2_x, "y": ed2_y, "z": ed2_z},
                "di": {"x": edi_x, "y": edi_y, "z": edi_z}
            },
            "metrics": {
                "sani_L1":    metrics_sani_L1,
                "sani_L2":    metrics_sani_L2,
                "depr_L1":    metrics_depr_L1,
                "depr_L2":    metrics_depr_L2,
                "global_sim": round(sum(sim_scores.values()) / len(sim_scores) * 100, 2) if sim_scores else 0
            },
            "hub_vulnerables": hub_vulnerables
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/run_mulan', methods=['POST'])
def run_mulan():
    """
    Runs the community detection step of the MuLaN pipeline on the graphs
    stored in GLOBAL_DATA. Supports three algorithms:
      - 'louvain'  : Louvain modularity optimisation (default, fast)
      - 'greedy'   : Greedy modularity communities (deterministic)
      - 'infomap'  : Infomap random-walk compression algorithm

    Returns the aligned supergraph as an edgelist, the detected communities
    for both groups as a formatted text block, a human-readable summary log,
    and the wall-clock runtime string.
    """
    try:
        algo      = request.json.get('algo', 'louvain')
        G_sani    = GLOBAL_DATA.get('G_sani')
        G_depr    = GLOBAL_DATA.get('G_depr')
        aligned_G = GLOBAL_DATA.get('aligned_G')

        if G_sani is None or G_depr is None or aligned_G is None:
            return jsonify({"error": "Data not found in memory. Please reload the files."}), 400

        time_start = datetime.now()

        # Community detection requires simple graphs; MultiGraph is not supported
        # by any of the three algorithms used here.
        G_sani_s = multigraph_to_simple(G_sani)
        G_depr_s = multigraph_to_simple(G_depr)

        def compute_communities(G, algorithm):
            """
            Dispatches community detection to the selected algorithm and
            returns the result as a list of node sets, regardless of the
            internal format used by each library.
            """
            if algorithm == 'infomap':
                im = infomap.Infomap(silent=True, num_trials=50)
                fwd_mapping = im.add_networkx_graph(G, weight='weight')
                inv_mapping = {v: k for k, v in fwd_mapping.items()}
                im.run()
                comms = defaultdict(set)
                for node in im.nodes:
                    orig = inv_mapping.get(node.node_id)
                    if orig is not None:
                        comms[node.module_id].add(orig)
                return list(comms.values())
            elif algorithm == 'greedy':
                return list(nx_comm.greedy_modularity_communities(G, weight='weight'))
            else:
                comm_dict = community_louvain.best_partition(G, weight='weight')
                temp = defaultdict(set)
                for n, c in comm_dict.items():
                    temp[c].add(n)
                return list(temp.values())

        comms_sani = compute_communities(G_sani_s, algo)
        comms_depr = compute_communities(G_depr_s, algo)

        # Modularity score requires at least two communities; fall back to 0 otherwise
        mod_sani = nx_comm.modularity(G_sani_s, comms_sani) if len(comms_sani) > 1 else 0
        mod_depr = nx_comm.modularity(G_depr_s, comms_depr) if len(comms_depr) > 1 else 0

        runtime = str(datetime.now() - time_start)

        # Serialize the alignment supergraph as a weighted edgelist
        edgelist_str = io.StringIO()
        for u, v, d in aligned_G.edges(data=True):
            edgelist_str.write(f"{u} {v} {d.get('weight', 1.0)} {d.get('layer', 1)}\n")

        # Build the communities text output
        comm_str  = "--- COMMUNITIES GROUP 1 (HEALTHY) ---\n"
        for ci, c in enumerate(comms_sani):
            comm_str += f"Community {ci+1} ({len(c)} nodes): {sorted(list(c))}\n"
        comm_str += f"\n--- COMMUNITIES GROUP 2 (DEPRESSED) ---\n"
        for ci, c in enumerate(comms_depr):
            comm_str += f"Community {ci+1} ({len(c)} nodes): {sorted(list(c))}\n"

        # Build the human-readable summary log
        log_str  = "MULAN ALIGNMENT & COMMUNITY DETECTION RESULTS\n"
        log_str += "==============================================\n"
        log_str += f"Algorithm: {algo.upper()}\n"
        log_str += f"Runtime: {runtime}\n\n"
        log_str += "[ALIGNMENT SUPERGRAPH]\n"
        log_str += f"Nodes: {aligned_G.number_of_nodes()} | Edges: {aligned_G.number_of_edges()}\n\n"
        log_str += "[GROUP 1 - HEALTHY]\n"
        log_str += f"Communities found: {len(comms_sani)} | Modularity Q: {mod_sani:.5f}\n\n"
        log_str += "[GROUP 2 - DEPRESSED]\n"
        log_str += f"Communities found: {len(comms_depr)} | Modularity Q: {mod_depr:.5f}\n\n"
        log_str += "[COMMUNITY DETAIL - GROUP 1]\n"
        for ci, c in enumerate(comms_sani):
            log_str += f"  C{ci+1}: {len(c)} nodes\n"
        log_str += "\n[COMMUNITY DETAIL - GROUP 2]\n"
        for ci, c in enumerate(comms_depr):
            log_str += f"  C{ci+1}: {len(c)} nodes\n"

        return jsonify({
            "edgelist":    edgelist_str.getvalue(),
            "communities": comm_str,
            "log":         log_str,
            "time":        runtime
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5001)
