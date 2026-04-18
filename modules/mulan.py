"""
mulan.py
--------
MuLaN (Multilayer Network Alignment) local alignment algorithm.

A1 — Weighted alignment: conservation scores are now sensitive to edge-weight
     similarity. A MATCH between two edges of very different weights is scored
     lower than a perfect-weight match, reflecting the idea that a strong
     connection that became weak is not fully conserved.

A6 — Configurable parameters: the caller can override DELTA, MATCH, MISMATCH
     and GAP via the optional `params` dictionary.
"""

import networkx as nx
from .graph_utils import multigraph_to_simple


def run_mulan_alignment(MLN1, MLN2, valid_ids, params=None):
    """
    Performs the MuLaN local alignment between two multilayer graphs.

    For every edge (s1, s2) present in MLN1 the algorithm assigns
    a conservation weight:

    * MATCH (both networks share the edge):
        score = MATCH × weight_similarity
        where weight_similarity = 1 – |w1−w2| / max(|w1|, |w2|)
        This ranges from 1.0 (identical weights) down toward 0 as the
        weights diverge, capturing the A1 "weight-aware" requirement.

    * MISMATCH (edge absent in MLN2 but reachable within DELTA hops):
        score = MISMATCH × (0.5 + 0.5 × proximity)
        proximity = 1 – (path_len − 1) / DELTA  → closer paths rank higher.

    * GAP (no path within DELTA hops):
        score = GAP (constant penalty)

    Parameters
    ----------
    MLN1, MLN2 : nx.MultiGraph   – the two multilayer networks
    valid_ids  : list            – ordered node ID list
    params     : dict, optional  – override any of DELTA, MATCH, MISMATCH, GAP

    Returns
    -------
    aligned : nx.Graph  – the alignment supergraph with per-edge conservation weights
    """
    default_params = {'DELTA': 3, 'MATCH': 1.0, 'MISMATCH': 0.5, 'GAP': 0.2}
    if params:
        for key in ('DELTA', 'MATCH', 'MISMATCH', 'GAP'):
            if key in params:
                try:
                    val = float(params[key])
                    if key == 'DELTA':
                        val = max(1, int(val))
                    default_params[key] = val
                except (ValueError, TypeError):
                    pass
    pars = default_params

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
            w1         = float(S1.get_edge_data(s1, s2).get('weight', 1.0))

            if S2.has_edge(s1, s2):
                # A1: weight-aware conservation score
                w2         = float(S2.get_edge_data(s1, s2).get('weight', 1.0))
                denom      = max(abs(w1), abs(w2), 1e-9)
                weight_sim = max(0.0, 1.0 - abs(w1 - w2) / denom)
                w          = pars['MATCH'] * weight_sim
            else:
                path_len = all_lengths_2.get(s1, {}).get(s2, 10000)
                if path_len <= pars['DELTA']:
                    # A1: closer alternative path → higher mismatch score
                    proximity = 1.0 - (path_len - 1) / max(pars['DELTA'], 1)
                    w         = pars['MISMATCH'] * (0.5 + 0.5 * proximity)
                else:
                    w = pars['GAP']

            aligned.add_edge(
                f"{s1}-{s1}", f"{s2}-{s2}",
                weight=round(w, 4), layer=layer_info
            )

    return aligned
