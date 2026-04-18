"""
metrics.py
----------
Graph-level and node-level topological metric computation functions
for the Brain Network multilayer analysis pipeline.
"""

import numpy as np
import networkx as nx
import community.community_louvain as community_louvain


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
