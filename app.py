# app.py
# ----------
# Flask application entry point.
# All heavy logic lives in the modules/ package; this file is responsible for:
#   - initialising the Flask app and static/template paths
#   - loading the fsaverage5 brain mesh at startup
#   - defining the three HTTP routes (/, /upload, /run_mulan)
#   - starting the development server

from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
import networkx as nx
import networkx.algorithms.community as nx_comm
import io
import json
import time
from datetime import datetime
import matplotlib.colors as mcolors
from nilearn import datasets, surface
import google.generativeai as genai

# ── Local modules ──────────────────────────────────────────────────────────────
from modules.roi_utils      import (extract_coords, clean_roi_name,
                                    infer_lobe_from_coords, infer_hemisphere_from_x,
                                    infer_macro_area)
from modules.graph_utils    import create_multilayer_graph, get_layer_subgraph, multigraph_to_simple
from modules.metrics        import get_graph_metrics, get_node_metrics
from modules.community      import compute_simple_graph_communities, build_named_communities
from modules.mulan          import run_mulan_alignment
from modules.visualization  import get_layer_edges, get_inter_edges, get_hub_vulnerables, get_strong_layer_edges

import re

# ── Gemini AI configuration ───────────────────────────────────────────────────
import os
_gemini_key = os.environ.get("GEMINI_API_KEY", "AIzaSyBZk9Gz8vn0tIkhquP8FD65L6Hsboto7r4")
genai.configure(api_key=_gemini_key)
# Models to try in order — if the primary model's quota is exhausted, we
# automatically fall back to alternatives.
GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash-lite"]

# ── Flask app ──────────────────────────────────────────────────────────────────
app = Flask(__name__)

# ── In-memory store ────────────────────────────────────────────────────────────
# Graph objects shared between /upload and /run_mulan.
# Populated on upload, consumed by the MuLaN alignment endpoint.
GLOBAL_DATA = {
    'G_sani':    None,
    'G_depr':    None,
    'aligned_G': None,
    'nodes_df':  None,
}

# ── Brain mesh (loaded once at startup) ────────────────────────────────────────
# Both hemispheres are merged into a single coordinate and face array.
# Right-hemisphere face indices are offset by the number of left-hemisphere
# vertices to avoid collisions.
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


# ── Routes ─────────────────────────────────────────────────────────────────────

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
    the 3-D visualisation and the analytics dashboard.

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
        GLOBAL_DATA['nodes_df']  = nodes_df.copy()

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

        # F3/F5: Build adjacency lists for node detail modal
        adj_sani, adj_depr = {}, {}
        for node_id in nodes_df.index:
            nid = int(node_id)
            ns = []
            if G_sani_simple.has_node(nid):
                for nb in G_sani_simple.neighbors(nid):
                    w = float(G_sani_simple[nid][nb].get('weight', 1.0))
                    ns.append({"id": int(nb), "w": round(w, 4)})
            adj_sani[str(nid)] = ns
            nd_list = []
            if G_depr_simple.has_node(nid):
                for nb in G_depr_simple.neighbors(nid):
                    w = float(G_depr_simple[nid][nb].get('weight', 1.0))
                    nd_list.append({"id": int(nb), "w": round(w, 4)})
            adj_depr[str(nid)] = nd_list

        node_info_lookup = {}
        for node_id, row in nodes_df.iterrows():
            roi_name  = str(row.get('roi_name', ''))
            area_name = clean_roi_name(roi_name)
            x = float(row['X'])
            y = float(row['Y'])
            z = float(row['Z'])
            node_info_lookup[int(node_id)] = {
                "id":           int(node_id),
                "name":         area_name,
                "roi_name_raw": roi_name,
                "x": x, "y": y, "z": z,
                "lobe":       infer_lobe_from_coords(x, y, z),
                "hemisphere": infer_hemisphere_from_x(x),
                "macro_area": infer_macro_area(roi_name, x, y, z)
            }

        # Strip MNI coordinate suffix from display names (e.g. "PFC (10,20,30)" → "PFC")
        node_names = [
            re.sub(r'\s*\(.*?\)', '', str(row['roi_name'])).strip()
            for _, row in nodes_df.iterrows()
        ]

        layer_communities = {}
        for group_name, G_ref in (('sani', G_sani), ('depr', G_depr)):
            g_l1     = get_layer_subgraph(G_ref, 1)
            g_l2     = get_layer_subgraph(G_ref, 2)
            comm_l1  = compute_simple_graph_communities(g_l1, algorithm='louvain')
            comm_l2  = compute_simple_graph_communities(g_l2, algorithm='louvain')
            named_l1 = build_named_communities(comm_l1, node_info_lookup)
            named_l2 = build_named_communities(comm_l2, node_info_lookup)
            layer_communities[group_name] = {
                "layer_1":       named_l1,
                "layer_2":       named_l2,
                "layer_1_count": len(named_l1),
                "layer_2_count": len(named_l2)
            }

        # F9: Build per-node community colour maps for 3-D visualisation
        _palette = list(mcolors.TABLEAU_COLORS.values())
        community_node_map = {}
        for grp in ('sani', 'depr'):
            community_node_map[grp] = {}
            for lk in ('layer_1', 'layer_2'):
                comms = layer_communities[grp][lk]
                nm = {}
                for ci, comm in enumerate(comms):
                    clr = _palette[ci % len(_palette)]
                    for nd in comm.get('nodes', []):
                        nm[str(nd['id'])] = {"name": comm['name'], "color": clr}
                community_node_map[grp][lk] = nm

        # Z offsets that vertically separate the four brain layers in 3-D space:
        # Group 1 layer 1 at z+0, layer 2 at z+80; Group 2 layer 1 at z+200, layer 2 at z+280.
        z_off  = {'s1': 0, 's2': 80, 'd1': 200, 'd2': 280}
        base_x = nodes_df['X'].tolist()
        base_y = nodes_df['Y'].tolist()
        base_z = nodes_df['Z'].tolist()

        es1_x, es1_y, es1_z = get_layer_edges(G_sani, nodes_df, 1, z_off['s1'])
        es2_x, es2_y, es2_z = get_layer_edges(G_sani, nodes_df, 2, z_off['s2'])
        esi_x, esi_y, esi_z = get_inter_edges(G_sani, nodes_df, z_off['s1'], z_off['s2'])

        ed1_x, ed1_y, ed1_z = get_layer_edges(G_depr, nodes_df, 1, z_off['d1'])
        ed2_x, ed2_y, ed2_z = get_layer_edges(G_depr, nodes_df, 2, z_off['d2'])
        edi_x, edi_y, edi_z = get_inter_edges(G_depr, nodes_df, z_off['d1'], z_off['d2'])

        # B2 — Strong-edge overlays: 75th-percentile weight threshold per layer.
        # These arrays feed the four additional Plotly traces (idx 14-17) that
        # are shown as thick overlays when the user enables edge-weight mode.
        ss1_x, ss1_y, ss1_z = get_strong_layer_edges(G_sani, nodes_df, 1, z_off['s1'])
        ss2_x, ss2_y, ss2_z = get_strong_layer_edges(G_sani, nodes_df, 2, z_off['s2'])
        sd1_x, sd1_y, sd1_z = get_strong_layer_edges(G_depr, nodes_df, 1, z_off['d1'])
        sd2_x, sd2_y, sd2_z = get_strong_layer_edges(G_depr, nodes_df, 2, z_off['d2'])

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
                "di": {"x": edi_x, "y": edi_y, "z": edi_z},
                "strong": {
                    "ss1": {"x": ss1_x, "y": ss1_y, "z": ss1_z},
                    "ss2": {"x": ss2_x, "y": ss2_y, "z": ss2_z},
                    "sd1": {"x": sd1_x, "y": sd1_y, "z": sd1_z},
                    "sd2": {"x": sd2_x, "y": sd2_y, "z": sd2_z}
                }
            },
            "metrics": {
                "sani_L1":    metrics_sani_L1,
                "sani_L2":    metrics_sani_L2,
                "depr_L1":    metrics_depr_L1,
                "depr_L2":    metrics_depr_L2,
                "global_sim": round(sum(sim_scores.values()) / len(sim_scores) * 100, 2) if sim_scores else 0,
                "layer_communities": layer_communities
            },
            "hub_vulnerables": hub_vulnerables,
            "adj_sani": adj_sani,
            "adj_depr": adj_depr,
            "node_info": {str(k): v for k, v in node_info_lookup.items()},
            "community_colors": community_node_map
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

        if G_sani is None or G_depr is None:
            return jsonify({"error": "Data not found in memory. Please reload the files."}), 400

        # A6 — Re-run alignment with user-specified parameters.
        # /upload computes a default-param alignment for the conservation scores
        # visible in the 3D view. /run_mulan lets the user override the four
        # MuLaN hyperparameters and re-computes the supergraph accordingly.
        user_params = {
            'DELTA':    request.json.get('delta',    3),
            'MATCH':    request.json.get('match',    1.0),
            'MISMATCH': request.json.get('mismatch', 0.5),
            'GAP':      request.json.get('gap',      0.2),
        }
        nodes_df_ref = GLOBAL_DATA.get('nodes_df')
        aligned_G    = run_mulan_alignment(
            G_sani, G_depr,
            nodes_df_ref.index.tolist() if nodes_df_ref is not None else [],
            params=user_params
        )
        GLOBAL_DATA['aligned_G'] = aligned_G

        time_start = datetime.now()

        # Community detection runs on the aligned supergraph.
        aligned_simple = aligned_G

        comms_aligned = compute_simple_graph_communities(aligned_simple, algo)

        # Modularity score requires at least two communities; fall back to 0 otherwise
        mod_aligned = nx_comm.modularity(aligned_simple, comms_aligned) if len(comms_aligned) > 1 else 0

        runtime = str(datetime.now() - time_start)

        nodes_df_ref = GLOBAL_DATA.get('nodes_df')
        aligned_lookup = {}
        for node_id in G_sani.nodes():
            nid = int(node_id)
            if nid not in G_depr.nodes():
                continue
            x = float(nodes_df_ref.loc[nid]['X']) if nodes_df_ref is not None else 0.0
            y = float(nodes_df_ref.loc[nid]['Y']) if nodes_df_ref is not None else 0.0
            z = float(nodes_df_ref.loc[nid]['Z']) if nodes_df_ref is not None else 0.0
            roi_name = nodes_df_ref.loc[nid]['roi_name'] if nodes_df_ref is not None else str(nid)
            aligned_lookup[f"{nid}-{nid}"] = {
                "id":         nid,
                "name":       clean_roi_name(roi_name),
                "x": x, "y": y, "z": z,
                "lobe":       infer_lobe_from_coords(x, y, z),
                "hemisphere": infer_hemisphere_from_x(x),
                "macro_area": infer_macro_area(roi_name, x, y, z)
            }

        named_comms = build_named_communities(comms_aligned, aligned_lookup)

        comm_str = "--- COMMUNITIES (ALIGNED SUPERGRAPH) ---\n"
        for c in named_comms:
            names = [n["name"] for n in c["nodes"]]
            comm_str += f"{c['name']} ({c['node_count']} nodes): {names}\n"

        nodes_payload = []
        node_to_comm  = {}
        palette = list(mcolors.TABLEAU_COLORS.values()) + list(mcolors.CSS4_COLORS.values())
        for ci, c in enumerate(named_comms):
            color = palette[ci % len(palette)]
            for n in c["nodes"]:
                node_to_comm[f"{n['id']}-{n['id']}"] = {
                    "community_id":   c["id"],
                    "community_name": c["name"],
                    "color":          color
                }
                nodes_payload.append({
                    "super_id":       f"{n['id']}-{n['id']}",
                    "id":             n["id"],
                    "name":           n["name"],
                    "x": n["x"], "y": n["y"], "z": n["z"],
                    "community_id":   c["id"],
                    "community_name": c["name"],
                    "color":          color
                })

        edges_payload = []
        for u, v, d in aligned_G.edges(data=True):
            if u in node_to_comm and v in node_to_comm:
                edges_payload.append({
                    "u":      u,
                    "v":      v,
                    "weight": float(d.get('weight', 1.0)),
                    "layer":  int(d.get('layer', 1))
                })

        return jsonify({
            "communities": comm_str,
            "time":        runtime,
            "aligned_supergraph": {
                "metrics": {
                    "algorithm":         algo.upper(),
                    "runtime":           runtime,
                    "nodes":             aligned_G.number_of_nodes(),
                    "edges":             aligned_G.number_of_edges(),
                    "modularity":        round(float(mod_aligned), 5),
                    "communities_count": len(named_comms),
                    "density":           round(float(nx.density(aligned_G)), 5) if aligned_G.number_of_nodes() > 1 else 0
                },
                "communities": named_comms,
                "nodes":       nodes_payload,
                "edges":       edges_payload
            }
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ── Chatbot endpoint ───────────────────────────────────────────────────────────

# Domain knowledge injected into every Gemini call so the assistant can answer
# questions about brain networks, topological metrics, the MuLaN algorithm,
# and the data interpretation even before the user loads any files.
SYSTEM_PROMPT = """Sei "Brain AI", un assistente esperto di neuroscienze computazionali, 
analisi di reti cerebrali e teoria dei grafi. Lavori all'interno della piattaforma 
"Brain Network | Multi Layer", un'applicazione per la visualizzazione e l'analisi 
topologica comparata di reti cerebrali multilayer.

CONTESTO DELLA PIATTAFORMA:
- L'app confronta due gruppi di soggetti (Gruppo 1: Sani, Gruppo 2: Depressi) analizzando 
  le loro reti funzionali cerebrali durante due condizioni sperimentali (Layer 1: Musica, 
  Layer 2: Silenzio)
- I dati in input sono: un atlas CSV con le regioni di interesse (ROI) con coordinate MNI, 
  e due file di archi (uno per gruppo) con colonne source_id, target_id, weight, layer
- L'app utilizza l'algoritmo MuLaN (Multilayer Local Network Alignment) per allineare 
  le due reti e calcolare punteggi di conservazione per ogni nodo

METRICHE TOPOLOGICHE che la piattaforma calcola:
- Densità: rapporto archi presenti / archi possibili (0-1). Rete densa = tante connessioni
- Modularità: forza della suddivisione in comunità funzionali (range -0.5 a 1). Alta = ben partizionata
- Efficienza globale: media dell'inverso delle distanze geodetiche. Alta = buon trasferimento info
- Clustering medio: tendenza dei vicini a formare triangoli. Alto = alta segregazione locale
- Transitività: misura globale dei triangoli chiusi vs triple connesse
- Small-world index σ: se >1, la rete ha proprietà small-world (alta segregazione + buona integrazione)
- Betweenness centrality: quanto un nodo è "ponte" tra altri nodi
- Conservazione strutturale: punteggio MuLaN medio, indica quanto la struttura topologica si preserva tra i gruppi

ALGORITMO MuLaN:
- MuLaN (Multilayer Local Network Alignment) allinea localmente le reti dei due gruppi
- Usa 4 parametri configurabili: DELTA (hop massimi), MATCH, MISMATCH, GAP
- Produce un supergrafo allineato su cui si può fare community detection (Louvain, Greedy, Infomap)
- Il punteggio di conservazione per nodo indica se la topologia locale si è preservata (1.0=intatto) 
  o alterata (0.0=perso) nel gruppo depresso rispetto al sano

HUB VULNERABILI:
- Gli hub vulnerabili sono nodi che nel gruppo sani hanno alta betweenness centrality 
  (sono importanti per il flusso di informazione) ma bassa conservazione (la loro 
  topologia locale è stata alterata nella depressione)
- Score vulnerabilità = Betweenness_G1 × (1 − Conservazione)

CARICAMENTO DATI - GUIDA:
- File 1 (Atlas): CSV con separatore ; contenente roi_id e roi_name nel formato "NomeArea (x,y,z)"
- File 2 (Archi G1): CSV con separatore , contenente source_id, target_id, weight, layer (1=musica, 2=silenzio, 3=inter)
- File 3 (Archi G2): stesso formato del file 2, per il gruppo depressi
- Gli ID nei file archi devono corrispondere ai roi_id dell'atlas
- Nodi con coordinate mancanti o malformate vengono scartati automaticamente

ISTRUZIONI DI COMPORTAMENTO:
- Rispondi nella stessa lingua dell'utente (italiano o inglese)
- Sii conciso ma preciso, usa un tono professionale ma accessibile
- Quando ti vengono forniti dati specifici dell'analisi, usali per dare risposte contestualizzate
- Puoi usare emoji moderatamente per rendere le risposte più leggibili
- Se non conosci qualcosa con certezza, dillo onestamente
- Formatta le risposte usando markdown semplice (grassetto con **, liste con -, etc.)
- Quando parli di metriche, spiega sempre brevemente cosa significano in termini neuroscientifici
"""


def _build_data_context():
    """
    Constructs a text block summarising the currently loaded analysis data.
    This block is appended to the system prompt so the LLM can give
    data-specific answers like "the most vulnerable hub is X".
    Returns an empty string when no data has been uploaded yet.
    """
    nodes_df  = GLOBAL_DATA.get('nodes_df')
    G_sani    = GLOBAL_DATA.get('G_sani')
    G_depr    = GLOBAL_DATA.get('G_depr')
    aligned_G = GLOBAL_DATA.get('aligned_G')

    if nodes_df is None or G_sani is None:
        return ""

    ctx_parts = ["\n\nDATI DELL'ANALISI CORRENTE (usa questi dati per rispondere alle domande dell'utente):"]

    # Basic network info
    G_sani_s = multigraph_to_simple(G_sani)
    G_depr_s = multigraph_to_simple(G_depr)
    ctx_parts.append(f"- Numero nodi: {len(nodes_df)}")
    ctx_parts.append(f"- Archi G1 (semplice): {G_sani_s.number_of_edges()}")
    ctx_parts.append(f"- Archi G2 (semplice): {G_depr_s.number_of_edges()}")

    # Per-layer metrics
    for label, G_ref in [("G1", G_sani), ("G2", G_depr)]:
        for layer_n in [1, 2]:
            sub = get_layer_subgraph(G_ref, layer_n)
            m = get_graph_metrics(sub)
            ctx_parts.append(
                f"- {label} Layer {layer_n}: densità={m.get('density',0):.4f}, "
                f"modularità={m.get('modularity',0):.4f}, "
                f"efficienza={m.get('global_efficiency',0):.4f}, "
                f"clustering={m.get('avg_clustering',0):.4f}, "
                f"transitività={m.get('transitivity',0):.4f}"
            )

    # Conservation scores
    if aligned_G:
        sim_scores = {}
        for node in nodes_df.index:
            sn = f"{int(node)}-{int(node)}"
            if sn in aligned_G:
                ws = [d['weight'] for _, _, d in aligned_G.edges(sn, data=True)]
                sim_scores[node] = round(sum(ws) / len(ws), 4) if ws else 0.0
            else:
                sim_scores[node] = 0.0

        global_sim = round(sum(sim_scores.values()) / len(sim_scores) * 100, 2) if sim_scores else 0
        ctx_parts.append(f"- Conservazione strutturale globale: {global_sim}%")

        # Top 5 most vulnerable hubs
        node_metrics_sani = get_node_metrics(G_sani_s, nodes_df.index.tolist())
        hub_data = get_hub_vulnerables(nodes_df, node_metrics_sani, sim_scores)
        ctx_parts.append("- Top 5 hub più vulnerabili:")
        for h in hub_data[:5]:
            ctx_parts.append(
                f"  #{h['rank']} {h['name']}: betweenness={h['betweenness']:.4f}, "
                f"conservazione={h['conservation']:.2f}, vulnerabilità={h['vulnerability']:.4f}"
            )

    return "\n".join(ctx_parts)


@app.route('/chat', methods=['POST'])
def chat():
    """
    AI chatbot endpoint. Receives a user message and optional conversation
    history, builds a context-enriched prompt, queries Google Gemini, and
    returns the generated reply.

    Includes automatic retry with exponential back-off and model fallback:
    if the primary model (gemini-2.0-flash) is rate-limited, the endpoint
    tries gemini-1.5-flash, then gemini-1.5-flash-8b.

    Request body:
        { "message": str, "history": [{"role": "user"|"model", "parts": str}, ...] }
    Response:
        { "reply": str }
    """
    try:
        body    = request.get_json(force=True)
        message = body.get('message', '').strip()
        history = body.get('history', [])

        if not message:
            return jsonify({"error": "Empty message"}), 400

        # Build the full system prompt, optionally enriched with live data
        full_system = SYSTEM_PROMPT + _build_data_context()

        # Convert history for Gemini format
        gemini_history = []
        for h in history:
            gemini_history.append({
                "role": h.get("role", "user"),
                "parts": [h.get("parts", "")]
            })

        # Try each model with retries; move to the next model on 429 errors
        last_error = None
        for model_name in GEMINI_MODELS:
            for attempt in range(3):
                try:
                    chat_model = genai.GenerativeModel(
                        model_name,
                        system_instruction=full_system
                    )
                    chat_session = chat_model.start_chat(history=gemini_history)
                    response = chat_session.send_message(message)
                    return jsonify({"reply": response.text})
                except Exception as api_err:
                    last_error = api_err
                    err_str = str(api_err)
                    # Rate limit or model not found — try next model
                    if '429' in err_str or '404' in err_str:
                        if attempt < 2 and '429' in err_str:
                            time.sleep(2 ** attempt)  # 1s, 2s
                            continue
                        else:
                            break  # move to next model
                    else:
                        raise api_err  # non-retriable errors bubble up

        # All models exhausted — return a friendly rate-limit message
        return jsonify({
            "error": "⏳ Il servizio AI è temporaneamente sovraccarico. "
                     "Riprova tra qualche secondo. "
                     "(La chiave API appena creata potrebbe richiedere qualche minuto per attivarsi.)"
        }), 429

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Errore AI: {str(e)}"}), 500


# ── Dev server ─────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    app.run(debug=True, port=5001)
