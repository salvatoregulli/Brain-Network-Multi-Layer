/* render3d.js — Builds all Plotly traces for the 3-D multilayer brain visualisation
 *
 * Trace index map (14 base + 4 strong-edge overlays):
 *   0  mesh_s L1   |  1  mesh_s L2   |  2  mesh_d L1   |  3  mesh_d L2
 *   4  edge_s L1   |  5  edge_s L2   |  6  edge_si      |
 *   7  edge_d L1   |  8  edge_d L2   |  9  edge_di      |
 *  10  node_s L1   | 11  node_s L2   | 12  node_d L1   | 13  node_d L2
 *  ── B2 strong-edge overlays (initially hidden) ──────────────────────────
 *  14  strong_s L1 | 15  strong_s L2 | 16  strong_d L1 | 17  strong_d L2
 */
function render3D(d) {
    const OFFSET_X = 130;
    const OFFSET_Z = 150;
    const mapA = (arr, fn) => arr.map(v => v === null ? null : fn(v));

    // ── Coordinate offsets ──────────────────────────────────────────────────
    const m_s_x = mapA(d.mesh.x, x => x - OFFSET_X);
    const m_d_x = mapA(d.mesh.x, x => x + OFFSET_X);
    const m_z1  = d.mesh.z;
    const m_z2  = mapA(d.mesh.z, z => z + OFFSET_Z);

    const n_s_x = mapA(d.nodes.base_x, x => x - OFFSET_X);
    const n_d_x = mapA(d.nodes.base_x, x => x + OFFSET_X);
    const n_z1  = d.nodes.base_z;
    const n_z2  = mapA(d.nodes.base_z, z => z + OFFSET_Z);

    // Base intra-layer edges
    const es1_x = mapA(d.edges.s1.x, x => x - OFFSET_X);
    const es2_x = mapA(d.edges.s2.x, x => x - OFFSET_X);
    const esi_x = mapA(d.edges.si.x, x => x - OFFSET_X);
    const es1_z = d.edges.s1.z;
    const es2_z = mapA(d.edges.s2.z, z => z - 80 + OFFSET_Z);
    const esi_z = [];
    for (let i = 0; i < d.edges.si.z.length; i += 3)
        esi_z.push(d.edges.si.z[i], d.edges.si.z[i + 1] - 80 + OFFSET_Z, null);

    const ed1_x = mapA(d.edges.d1.x, x => x + OFFSET_X);
    const ed2_x = mapA(d.edges.d2.x, x => x + OFFSET_X);
    const edi_x = mapA(d.edges.di.x, x => x + OFFSET_X);
    const ed1_z = mapA(d.edges.d1.z, z => z - 200);
    const ed2_z = mapA(d.edges.d2.z, z => z - 280 + OFFSET_Z);
    const edi_z = [];
    for (let i = 0; i < d.edges.di.z.length; i += 3)
        edi_z.push(d.edges.di.z[i] - 200, d.edges.di.z[i + 1] - 280 + OFFSET_Z, null);

    // B2 — Strong-edge overlay coordinates (same transform as base edges)
    const str = d.edges.strong;
    const ss1_x = mapA(str.ss1.x, x => x - OFFSET_X);
    const ss2_x = mapA(str.ss2.x, x => x - OFFSET_X);
    const sd1_x = mapA(str.sd1.x, x => x + OFFSET_X);
    const sd2_x = mapA(str.sd2.x, x => x + OFFSET_X);
    const ss1_z = str.ss1.z;
    const ss2_z = mapA(str.ss2.z, z => z - 80 + OFFSET_Z);
    const sd1_z = mapA(str.sd1.z, z => z - 200);
    const sd2_z = mapA(str.sd2.z, z => z - 280 + OFFSET_Z);

    // Persist offset arrays on DATA so controls.js search can restore them
    d.edges.s1.x_off = es1_x; d.edges.s2.x_off = es2_x; d.edges.si.x_off = esi_x;
    d.edges.s1.z_off = es1_z; d.edges.s2.z_off = es2_z; d.edges.si.z_off = esi_z;
    d.edges.d1.x_off = ed1_x; d.edges.d2.x_off = ed2_x; d.edges.di.x_off = edi_x;
    d.edges.d1.z_off = ed1_z; d.edges.d2.z_off = ed2_z; d.edges.di.z_off = edi_z;
    FULL_DATA = d;

    // ── Node trace factory ──────────────────────────────────────────────────
    const createNodes = (x_arr, z_arr, colorStr) => ({
        type: 'scatter3d', mode: 'markers',
        x: x_arr, y: d.nodes.base_y, z: z_arr,
        text: d.nodes.names.map(n => `<b>${n}</b>`),
        marker: { size: 5, color: colorStr, line: { width: 1, color: '#1a2236' } },
        hovertemplate: '%{text}<extra></extra>',
        showlegend: false
    });

    // ── Brain mesh traces ───────────────────────────────────────────────────
    // flatshading: true reduces per-fragment lighting interpolation cost on the GPU
    const t_m_s1 = { type:'mesh3d', x:m_s_x, y:d.mesh.y, z:m_z1, i:d.mesh.i, j:d.mesh.j, k:d.mesh.k, opacity:0.1, color:'#3498db', flatshading:true, hoverinfo:'none', showlegend:false };
    const t_m_s2 = { type:'mesh3d', x:m_s_x, y:d.mesh.y, z:m_z2, i:d.mesh.i, j:d.mesh.j, k:d.mesh.k, opacity:0.1, color:'#2980b9', flatshading:true, hoverinfo:'none', showlegend:false };
    const t_m_d1 = { type:'mesh3d', x:m_d_x, y:d.mesh.y, z:m_z1, i:d.mesh.i, j:d.mesh.j, k:d.mesh.k, opacity:0.1, color:'#e74c3c', flatshading:true, hoverinfo:'none', showlegend:false };
    const t_m_d2 = { type:'mesh3d', x:m_d_x, y:d.mesh.y, z:m_z2, i:d.mesh.i, j:d.mesh.j, k:d.mesh.k, opacity:0.1, color:'#c0392b', flatshading:true, hoverinfo:'none', showlegend:false };

    // ── Base edge traces ────────────────────────────────────────────────────
    const t_e_s1 = { type:'scatter3d', mode:'lines', x:es1_x, y:d.edges.s1.y, z:es1_z, line:{width:1.5, color:'#3498db'}, hoverinfo:'none', showlegend:false };
    const t_e_s2 = { type:'scatter3d', mode:'lines', x:es2_x, y:d.edges.s2.y, z:es2_z, line:{width:1.5, color:'#2980b9'}, hoverinfo:'none', showlegend:false };
    const t_e_si = { type:'scatter3d', mode:'lines', x:esi_x, y:d.edges.si.y, z:esi_z, line:{width:2.5, color:'#f1c40f'}, hoverinfo:'none', showlegend:false };
    const t_e_d1 = { type:'scatter3d', mode:'lines', x:ed1_x, y:d.edges.d1.y, z:ed1_z, line:{width:1.5, color:'#e74c3c'}, hoverinfo:'none', showlegend:false };
    const t_e_d2 = { type:'scatter3d', mode:'lines', x:ed2_x, y:d.edges.d2.y, z:ed2_z, line:{width:1.5, color:'#c0392b'}, hoverinfo:'none', showlegend:false };
    const t_e_di = { type:'scatter3d', mode:'lines', x:edi_x, y:d.edges.di.y, z:edi_z, line:{width:2.5, color:'#f39c12'}, hoverinfo:'none', showlegend:false };

    // ── Node traces ─────────────────────────────────────────────────────────
    const t_n_s1 = createNodes(n_s_x, n_z1, '#2D7DC4');
    const t_n_s2 = createNodes(n_s_x, n_z2, '#2D7DC4');
    const t_n_d1 = createNodes(n_d_x, n_z1, '#DC2626');
    const t_n_d2 = createNodes(n_d_x, n_z2, '#DC2626');

    // ── B2 Strong-edge overlay traces (idx 14-17, initially hidden) ─────────
    const strongTrace = (x, y, z, col) => ({
        type: 'scatter3d', mode: 'lines',
        x, y, z,
        line: { width: 5, color: col },
        opacity: 0.85,
        visible: false,
        hoverinfo: 'none', showlegend: false
    });
    const t_ss1 = strongTrace(ss1_x, str.ss1.y, ss1_z, 'rgba(52,152,219,0.95)');
    const t_ss2 = strongTrace(ss2_x, str.ss2.y, ss2_z, 'rgba(41,128,185,0.95)');
    const t_sd1 = strongTrace(sd1_x, str.sd1.y, sd1_z, 'rgba(231, 76, 60,0.95)');
    const t_sd2 = strongTrace(sd2_x, str.sd2.y, sd2_z, 'rgba(192, 57, 43,0.95)');

    const layout = {
        margin: {l:0, r:0, b:0, t:0}, paper_bgcolor: 'transparent',
        scene: {
            xaxis: {visible:false, showspikes:false, range:[-350, 350]},
            yaxis: {visible:false, showspikes:false, range:[-350, 350]},
            zaxis: {visible:false, showspikes:false, range:[-150, 300]},
            aspectmode: 'cube',
            camera: { eye: {x:0, y:-1.6, z:0}, center: {x:0, y:0, z:0}, up: {x:0, y:0, z:1} }
        }
    };

    Plotly.newPlot('plot-3d', [
        t_m_s1, t_m_s2, t_m_d1, t_m_d2,       // 0-3
        t_e_s1, t_e_s2, t_e_si,                 // 4-6
        t_e_d1, t_e_d2, t_e_di,                 // 7-9
        t_n_s1, t_n_s2, t_n_d1, t_n_d2,        // 10-13
        t_ss1,  t_ss2,  t_sd1,  t_sd2           // 14-17 (strong overlays)
    ], layout, { displayModeBar: false, responsive: true, plotGlPixelRatio: 1 }).then(() => {
        setView('global');

        /* F3: Click on a node trace (10-13) → open detail modal */
        document.getElementById('plot-3d').on('plotly_click', function(evData) {
            if (!evData || !evData.points || evData.points.length === 0) return;
            const pt = evData.points[0];
            if (pt.curveNumber >= 10 && pt.curveNumber <= 13) {
                openNodeDetailModal(pt.pointNumber);
            }
        });
    });
}
