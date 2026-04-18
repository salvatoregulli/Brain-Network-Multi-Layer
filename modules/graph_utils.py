"""
graph_utils.py
--------------
Functions for building, slicing, and converting NetworkX graph objects
used in the Brain Network multilayer analysis pipeline.
"""

import pandas as pd
import networkx as nx


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
