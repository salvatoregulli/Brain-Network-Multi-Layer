/* mulan_modal.js — MuLaN alignment modal, supergraph visualisation, community filter
 *
 * A6 — Sends the four MuLaN hyperparameters (DELTA, MATCH, MISMATCH, GAP)
 *       to the backend so /run_mulan can re-compute the alignment with the
 *       user-specified values instead of the hard-coded defaults.
 */

/** Opens the MuLaN configuration modal and resets it to its initial state. */
function showAlignmentModal() {
    if (!DATA) return;
    document.getElementById('mulan-results').style.display  = 'none';
    document.getElementById('btn-run-mulan').style.display  = 'block';
    document.getElementById('alignment-modal').style.display = 'flex';
}

/**
 * POSTs the selected algorithm and MuLaN parameters to /run_mulan and shows
 * the result download buttons once the server responds successfully.
 */
async function runMulan() {
    document.getElementById('btn-run-mulan').style.display = 'none';
    const status = document.getElementById('mulan-status');
    status.style.cssText = 'display:flex; margin-top:18px; align-items:center; gap:10px; justify-content:center;';
    const algo = document.getElementById('algo-select').value;

    // A6 — Read user-specified MuLaN parameters
    const delta    = parseFloat(document.getElementById('param-delta').value)    || 3;
    const match    = parseFloat(document.getElementById('param-match').value)    || 1.0;
    const mismatch = parseFloat(document.getElementById('param-mismatch').value) || 0.5;
    const gap      = parseFloat(document.getElementById('param-gap').value)      || 0.2;

    try {
        const res = await fetch('/run_mulan', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ algo, delta, match, mismatch, gap })
        });
        if (!res.ok) throw new Error('Server alignment error');
        RES_DATA = await res.json();
        status.style.display = 'none';
        ACTIVE_ALIGNED_COMMUNITY = null;
        document.getElementById('mulan-results').style.display = 'block';
    } catch(e) {
        alert('MuLaN Error: ' + e.message);
        document.getElementById('btn-run-mulan').style.display = 'block';
        status.style.display = 'none';
    }
}

/** Opens the interactive aligned supergraph modal and renders the 3-D plot. */
function openAlignedSupergraphModal() {
    if (!RES_DATA || !RES_DATA.aligned_supergraph || !DATA) return;
    document.getElementById('aligned-supergraph-modal').classList.add('show');
    renderAlignedSupergraph();
}

/** Closes the aligned supergraph modal. */
function closeAlignedSupergraphModal() {
    document.getElementById('aligned-supergraph-modal').classList.remove('show');
}

/** Filters the supergraph plot to show only nodes in the given community. */
function filterAlignedCommunity(commId) {
    ACTIVE_ALIGNED_COMMUNITY = commId;
    renderAlignedSupergraph();
}

/**
 * Renders the aligned supergraph Plotly 3-D scatter and the community legend.
 */
function renderAlignedSupergraph() {
    if (!RES_DATA || !RES_DATA.aligned_supergraph || !DATA) return;
    const sg    = RES_DATA.aligned_supergraph;
    const nodes = sg.nodes || [];
    const edges = sg.edges || [];
    const nodesMap    = new Map(nodes.map(n => [n.super_id, n]));
    const visibleNodes = ACTIVE_ALIGNED_COMMUNITY
        ? nodes.filter(n => n.community_id === ACTIVE_ALIGNED_COMMUNITY)
        : nodes;
    const visibleSet = new Set(visibleNodes.map(n => n.super_id));

    const edgeX = [], edgeY = [], edgeZ = [];
    edges.forEach(e => {
        if (!visibleSet.has(e.u) || !visibleSet.has(e.v)) return;
        const su = nodesMap.get(e.u);
        const sv = nodesMap.get(e.v);
        if (!su || !sv) return;
        edgeX.push(su.x, sv.x, null);
        edgeY.push(su.y, sv.y, null);
        edgeZ.push(su.z, sv.z, null);
    });

    Plotly.react('aligned-supergraph-plot', [
        {
            type:'mesh3d', x:DATA.mesh.x, y:DATA.mesh.y, z:DATA.mesh.z,
            i:DATA.mesh.i, j:DATA.mesh.j, k:DATA.mesh.k,
            opacity:0.09, color:'#4A7CAA', hoverinfo:'none', showlegend:false
        },
        {
            type:'scatter3d', mode:'lines', x:edgeX, y:edgeY, z:edgeZ,
            line:{width:1.2, color:'rgba(60,60,60,0.35)'}, hoverinfo:'none', showlegend:false
        },
        {
            type:'scatter3d', mode:'markers',
            x:visibleNodes.map(n=>n.x), y:visibleNodes.map(n=>n.y), z:visibleNodes.map(n=>n.z),
            text:visibleNodes.map(n=>`<b>${n.name}</b><br>${n.community_name}`),
            hovertemplate:'%{text}<extra></extra>',
            marker:{size:6, color:visibleNodes.map(n=>n.color), line:{width:0.8, color:'#1a2236'}},
            showlegend:false
        }
    ], {
        margin: {l:0, r:0, t:0, b:0},
        paper_bgcolor: 'white',
        scene: {
            xaxis:{visible:false}, yaxis:{visible:false}, zaxis:{visible:false},
            aspectmode:'cube',
            camera:{eye:{x:0, y:-1.55, z:0.05}}
        }
    }, {responsive:true, displayModeBar:false});

    const m = sg.metrics || {};
    document.getElementById('aligned-metrics').innerHTML = `
        <div class="meta-card"><div class="meta-k">${T[LANG].layer_total_comm}</div><div class="meta-v">${m.communities_count ?? 0}</div></div>
        <div class="meta-card"><div class="meta-k">Nodes</div><div class="meta-v">${m.nodes ?? 0}</div></div>
        <div class="meta-card"><div class="meta-k">Edges</div><div class="meta-v">${m.edges ?? 0}</div></div>
        <div class="meta-card"><div class="meta-k">Density</div><div class="meta-v">${m.density ?? 0}</div></div>
        <div class="meta-card"><div class="meta-k">Modularity</div><div class="meta-v">${m.modularity ?? 0}</div></div>
        <div class="meta-card"><div class="meta-k">Runtime</div><div class="meta-v">${m.runtime ?? '—'}</div></div>
    `;

    const list = document.getElementById('aligned-community-list');
    list.innerHTML = '';
    (sg.communities || []).forEach(c => {
        const sampleNode = nodes.find(n => n.community_id === c.id);
        const color      = sampleNode ? sampleNode.color : '#64748B';
        const item       = document.createElement('button');
        item.className   = 'community-chip' + (ACTIVE_ALIGNED_COMMUNITY === c.id ? ' active' : '');
        item.setAttribute('data-comm', c.id);
        item.onclick     = () => filterAlignedCommunity(c.id);
        item.innerHTML   = `<span class="chip-left"><span class="chip-dot" style="background:${color};"></span><span class="chip-name">${c.name}</span></span><span class="chip-count">${c.node_count} ${T[LANG].layer_nodes}</span>`;
        list.appendChild(item);
    });
}
