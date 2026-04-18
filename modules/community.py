"""
community.py
------------
Community detection and community naming utilities for the Brain Network
multilayer analysis pipeline.
"""

import infomap
import community.community_louvain as community_louvain
import networkx.algorithms.community as nx_comm
from collections import defaultdict


def compute_simple_graph_communities(G, algorithm='louvain'):
    """Returns list of communities as node sets for a simple nx.Graph."""
    if G.number_of_edges() == 0:
        return [{n} for n in G.nodes()]
    if algorithm == 'greedy':
        return list(nx_comm.greedy_modularity_communities(G, weight='weight'))
    if algorithm == 'infomap':
        im = infomap.Infomap(silent=True, num_trials=50)
        fwd_mapping = im.add_networkx_graph(G, weight='weight')
        inv_mapping = {v: k for k, v in fwd_mapping.items()}
        im.run()
        temp = defaultdict(set)
        for node in im.nodes:
            orig = inv_mapping.get(node.node_id)
            if orig is not None:
                temp[node.module_id].add(orig)
        return list(temp.values())
    # Default: Louvain
    comm_dict = community_louvain.best_partition(G, weight='weight')
    temp = defaultdict(set)
    for n, c in comm_dict.items():
        temp[c].add(n)
    return list(temp.values())


def build_named_communities(communities, node_info_lookup):
    """
    Converts raw communities into named, UI-ready community descriptors.
    Community name is approximated from dominant lobe + hemisphere.
    """
    named = []
    for idx, comm in enumerate(communities, start=1):
        entries = [node_info_lookup.get(n) for n in comm if node_info_lookup.get(n) is not None]
        if not entries:
            named.append({
                "id": f"comm_{idx}",
                "index": idx,
                "name": f"Community {idx}",
                "node_count": 0,
                "nodes": []
            })
            continue

        areas = [e["macro_area"] for e in entries]
        hems  = [e["hemisphere"] for e in entries]
        dominant_area = max(set(areas), key=areas.count)
        dominant_hem  = max(set(hems),  key=hems.count)
        comm_name = f"{dominant_hem} {dominant_area} Network"

        named.append({
            "id": f"comm_{idx}",
            "index": idx,
            "name": comm_name,
            "node_count": len(entries),
            "nodes": sorted(
                [
                    {
                        "id":   int(e["id"]),
                        "name": e["name"],
                        "x":    float(e["x"]),
                        "y":    float(e["y"]),
                        "z":    float(e["z"])
                    }
                    for e in entries
                ],
                key=lambda x: x["name"]
            )
        })
    return named
