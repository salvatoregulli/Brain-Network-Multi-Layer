/* node_modal.js — F3: Node detail modal triggered by clicking a 3-D node
 *
 * Shows full anatomical info, side-by-side G1/G2 metric comparison,
 * and the top neighbours for each group — ordered by edge weight.
 */

let hubShowAll = false;  // shared with buildHubDetector in dashboard.js

/**
 * Opens the node detail modal for the node at the given index.
 * The modal is populated and shown immediately WITHOUT calling
 * searchNode, which avoids expensive Plotly restyle operations.
 */
function openNodeDetailModal(nodeIdx) {
    if (!DATA || nodeIdx < 0 || nodeIdx >= DATA.nodes.names.length) return;

    const name  = DATA.nodes.names[nodeIdx];
    const score = DATA.nodes.scores[nodeIdx];
    const st    = getStatus(score);

    /* ── Identify the backend node ID from the index ────────────── */
    const nodeIds = Object.keys(DATA.node_info);
    const nodeId  = nodeIds[nodeIdx];
    const info    = DATA.node_info[nodeId] || {};

    /* ── Metrics ────────────────────────────────────────────────── */
    const ms = DATA.nodes.metrics_sani;
    const md = DATA.nodes.metrics_depr;

    const metricsDef = [
        { label: T[LANG].sizing_deg,  s: ms.deg[nodeIdx],  d: md.deg[nodeIdx],  fmt: v => v },
        { label: T[LANG].sizing_bet,  s: ms.bet[nodeIdx],  d: md.bet[nodeIdx],  fmt: v => v.toFixed(4) },
        { label: T[LANG].sizing_clu,  s: ms.clu[nodeIdx],  d: md.clu[nodeIdx],  fmt: v => v.toFixed(4) },
    ];

    const metricsHtml = metricsDef.map(r => {
        const diff     = r.s !== 0 ? ((r.d - r.s) / r.s * 100) : 0;
        const dColor   = diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : 'var(--text-muted)';
        const dStr     = diff !== 0
            ? `<span style="color:${dColor};font-size:10px;font-weight:700;">${diff > 0 ? '+' : ''}${diff.toFixed(1)}%</span>`
            : '';
        return `<tr>
            <td style="font-weight:600;font-size:12px;">${r.label}</td>
            <td style="color:var(--g1);font-family:'JetBrains Mono',monospace;font-size:12px;text-align:center;">${r.fmt(r.s)}</td>
            <td style="color:var(--g2);font-family:'JetBrains Mono',monospace;font-size:12px;text-align:center;">${r.fmt(r.d)}</td>
            <td style="text-align:center;">${dStr}</td>
        </tr>`;
    }).join('');

    /* ── Neighbours ─────────────────────────────────────────────── */
    const idToName  = {};
    nodeIds.forEach((id, i) => { idToName[id] = DATA.nodes.names[i]; });

    const buildNeighborHtml = (neighbors, color) => {
        if (!neighbors || neighbors.length === 0)
            return `<div style="color:var(--text-muted);font-size:11px;padding:6px 0;">—</div>`;
        const sorted = [...neighbors].sort((a, b) => b.w - a.w).slice(0, 8);
        return sorted.map(n => {
            const nName = idToName[String(n.id)] || `Node ${n.id}`;
            return `<div class="ndm-neighbor-item">
                <span class="ndm-neighbor-name">${nName}</span>
                <span class="ndm-neighbor-weight" style="color:${color};">${n.w.toFixed(3)}</span>
            </div>`;
        }).join('');
    };

    const neighborsS = DATA.adj_sani ? (DATA.adj_sani[nodeId] || []) : [];
    const neighborsD = DATA.adj_depr ? (DATA.adj_depr[nodeId] || []) : [];

    /* ── Populate modal ─────────────────────────────────────────── */
    document.getElementById('ndm-title').textContent = name;
    document.getElementById('ndm-score').innerHTML =
        `<span style="color:${st.color};font-weight:700;">${score.toFixed(3)}</span>
         <span class="status-pill ${score === 1 ? 'status-ok' : score >= 0.5 ? 'status-warn' : 'status-bad'}"
               style="font-size:9px;margin-left:6px;">${st.label}</span>`;

    document.getElementById('ndm-anatomy').innerHTML = `
        <div class="ndm-anat-item"><span class="ndm-anat-label">${T[LANG].node_modal_lobe}</span><span class="ndm-anat-val">${info.lobe || '—'}</span></div>
        <div class="ndm-anat-item"><span class="ndm-anat-label">${T[LANG].node_modal_hemisphere}</span><span class="ndm-anat-val">${info.hemisphere || '—'}</span></div>
        <div class="ndm-anat-item"><span class="ndm-anat-label">${T[LANG].node_modal_macro}</span><span class="ndm-anat-val">${info.macro_area || '—'}</span></div>
        <div class="ndm-anat-item"><span class="ndm-anat-label">MNI</span><span class="ndm-anat-val" style="font-family:'JetBrains Mono',monospace;font-size:10px;">(${info.x?.toFixed(0) ?? '?'}, ${info.y?.toFixed(0) ?? '?'}, ${info.z?.toFixed(0) ?? '?'})</span></div>
    `;

    document.getElementById('ndm-metrics-body').innerHTML = metricsHtml;
    document.getElementById('ndm-neighbors-g1').innerHTML = buildNeighborHtml(neighborsS, 'var(--g1)');
    document.getElementById('ndm-neighbors-g2').innerHTML = buildNeighborHtml(neighborsD, 'var(--g2)');

    document.getElementById('node-detail-modal').classList.add('show');

    /* NOTE: We intentionally do NOT call searchNode() here.
       The previous implementation called searchNode(name) which triggered
       expensive Plotly.restyle operations (4-5 calls, each a full WebGL
       re-render), causing the modal to appear sluggishly.
       The info-card in the side panel is also updated for reference. */
    document.getElementById('i_name').innerText = name;
    document.getElementById('i_sim').innerText   = `${score.toFixed(2)} (${st.label})`;
    document.getElementById('i_sim').style.color = st.color;
    document.getElementById('i_ds').innerText    = ms.deg[nodeIdx];
    document.getElementById('i_dd').innerText    = md.deg[nodeIdx];
    document.getElementById('i_bs').innerText    = ms.bet[nodeIdx].toFixed(4);
    document.getElementById('i_bd').innerText    = md.bet[nodeIdx].toFixed(4);
    document.getElementById('i_cls').innerText   = ms.clu[nodeIdx].toFixed(4);
    document.getElementById('i_cld').innerText   = md.clu[nodeIdx].toFixed(4);
}

/** Closes the node detail modal and resets the side-panel info card. */
function closeNodeDetailModal() {
    document.getElementById('node-detail-modal').classList.remove('show');

    /* Reset the side-panel info card */
    ['i_name','i_sim','i_ds','i_dd','i_bs','i_bd','i_cls','i_cld']
        .forEach(id => document.getElementById(id).innerText = '—');
    document.getElementById('i_sim').style.color = '';

    /* Clear search input so subsequent view switches work cleanly */
    document.getElementById('s_in').value = '';
}
