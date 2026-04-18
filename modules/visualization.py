"""
visualization.py
----------------
Functions for extracting 3-D edge coordinates and computing the
vulnerable hub ranking used by the front-end visualisations.
"""

import re
import numpy as np


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


def get_strong_layer_edges(G, nodes_df, layer_num, z_offset, quantile=0.75):
    """
    B2 — Returns x/y/z coordinate segments for edges in the given layer whose
    weight is at or above the specified quantile (default 75th percentile).

    These are rendered as a thick overlay trace on top of the regular edge
    trace, visually encoding connection strength without changing the core
    trace index map.
    """
    import numpy as np

    all_weights = [
        float(d.get('weight', 1.0))
        for u, v, d in G.edges(data=True)
        if d.get('layer') == layer_num
    ]
    if not all_weights:
        return [], [], []
    threshold = float(np.quantile(all_weights, quantile))

    ex, ey, ez = [], [], []
    for u, v, d in G.edges(data=True):
        if d.get('layer') != layer_num:
            continue
        if float(d.get('weight', 1.0)) < threshold:
            continue
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
            'name':       name,
            'bet_sani':   round(bet_s, 4),
            'score':      round(score, 3),
            'deg_sani':   node_metrics_sani['deg'][i],
            'vuln_score': vuln
        })
    nodes.sort(key=lambda x: x['vuln_score'], reverse=True)
    return nodes[:top_n]
