/* layer_modal.js — Layer community comparison modal */

/** Opens the layer comparison modal for the currently selected group. */
function openLayerComparisonModal() {
    if (!DATA || !DATA.metrics || !DATA.metrics.layer_communities) return;
    document.getElementById('layer-compare-modal').classList.add('show');
    renderLayerComparisonModal();
}

/** Closes the layer comparison modal. */
function closeLayerComparisonModal() {
    document.getElementById('layer-compare-modal').classList.remove('show');
}

/**
 * Renders the two-column community comparison for Layer 1 vs Layer 2
 * of the currently selected group (sani or depr).
 */
function renderLayerComparisonModal() {
    if (!DATA || !DATA.metrics || !DATA.metrics.layer_communities) return;
    const grp  = document.getElementById('stats-group-select').value;
    const pack = DATA.metrics.layer_communities[grp];
    if (!pack) return;

    const l1 = pack.layer_1 || [];
    const l2 = pack.layer_2 || [];
    const deltaNodes = l2.reduce((acc, c) => acc + c.node_count, 0)
                     - l1.reduce((acc, c) => acc + c.node_count, 0);

    document.getElementById('layer-comp-title').textContent =
        `${T[LANG].layer_compare_title} • ${grp === 'sani' ? T[LANG].group_g1 : T[LANG].group_g2} • ${T[LANG].layer_delta_nodes}: ${deltaNodes >= 0 ? '+' : ''}${deltaNodes}`;

    // Build lookup maps: community name → node_count for cross-referencing
    const l1Map = {};
    l1.forEach(c => { l1Map[c.name] = c.node_count; });
    const l2Map = {};
    l2.forEach(c => { l2Map[c.name] = c.node_count; });

    const buildCol = (title, arr, count, otherMap, isLayer2) => {
        const items = arr.map(c => {
            // Check if same community name exists in the other layer
            const otherCount = otherMap[c.name];
            let deltaHtml = '';
            if (otherCount !== undefined) {
                // Delta = this layer count - other layer count
                // For L1: delta = L2_count - L1_count (how it changes going to L2)
                // For L2: delta = L2_count - L1_count (same direction for consistency)
                const delta = isLayer2
                    ? c.node_count - otherCount   // L2 - L1
                    : otherCount - c.node_count;   // L2 - L1
                const sign  = delta > 0 ? '+' : '';
                const color = delta > 0 ? '#16a34a' : delta < 0 ? '#dc2626' : 'var(--text-muted)';
                deltaHtml = ` <span style="font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:700; color:${color}; margin-left:6px;">(${sign}${delta})</span>`;
            }
            return `<div class="layer-comp-item"><div class="layer-comp-name">${c.name}${deltaHtml}</div><div class="layer-comp-meta">${c.node_count} ${T[LANG].layer_nodes}</div></div>`;
        }).join('');

        return `
            <div class="layer-comp-col">
                <div class="layer-comp-title">${title}</div>
                <div class="layer-comp-count">${T[LANG].layer_total_comm}: ${count}</div>
                <div class="layer-comp-list">
                    ${items || `<div class="layer-comp-item"><div class="layer-comp-meta">—</div></div>`}
                </div>
            </div>
        `;
    };

    document.getElementById('layer-comp-content').innerHTML =
        buildCol(T[LANG].layer_1, l1, pack.layer_1_count || 0, l2Map, false) +
        buildCol(T[LANG].layer_2, l2, pack.layer_2_count || 0, l1Map, true);
}
