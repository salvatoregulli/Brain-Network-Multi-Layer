/* controls.js — Layer visibility toggles, node sizing, conservation filter, node search,
 *               B2 edge-weight toggle, D1 dark-mode toggle */

/* ── B2: Edge weight overlay ────────────────────────────────────────────── */

/**
 * Toggles the thick strong-edge overlay traces (idx 14-17).
 * Only shows the relevant pair for the active view (sani → 14,15; depr → 16,17).
 * In global view the overlay is never shown (edges from both groups overlap).
 */
function toggleEdgeWeights(btn) {
    state.edgeWeights = !state.edgeWeights;
    btn.classList.toggle('active', state.edgeWeights);
    if (currentView === 'sani')      Plotly.restyle('plot-3d', {visible: state.edgeWeights}, [14, 15]);
    else if (currentView === 'depr') Plotly.restyle('plot-3d', {visible: state.edgeWeights}, [16, 17]);
    // global view: do nothing (both would overlap)
}

/* ── D1: Dark mode ──────────────────────────────────────────────────────── */

/**
 * Toggles dark mode by switching the `dark` class on <body>.
 * Persists the preference in localStorage and updates Plotly plot colours
 * so axes/grids remain readable in both themes.
 */
function toggleDarkMode(btn) {
    state.darkMode = !state.darkMode;
    document.body.classList.toggle('dark', state.darkMode);
    localStorage.setItem('darkMode', state.darkMode ? '1' : '0');
    btn.classList.toggle('active', state.darkMode);
    const textSpan = btn.querySelector('span');
    textSpan.textContent = state.darkMode ? T[LANG].mode_light : T[LANG].mode_dark;
    textSpan.setAttribute('data-i18n', state.darkMode ? 'mode_light' : 'mode_dark');
    _applyPlotlyTheme();
}

/**
 * Re-applies Plotly layout overrides for axis/grid colours.
 * Called after dark mode toggle and after a language change.
 */
function _applyPlotlyTheme() {
    const isDark  = state.darkMode;
    const tc      = isDark ? '#C8C8D0' : '#44403C';
    const gridC   = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
    const paperBg = 'rgba(0,0,0,0)';

    if (DATA) {
        // Bar chart
        Plotly.relayout('plot-bar', {
            paper_bgcolor: paperBg,
            plot_bgcolor:  paperBg,
            'font.color':  tc,
            'xaxis.color': tc,
            'xaxis.gridcolor': gridC,
            'yaxis.color': tc
        });
        // Radar chart
        Plotly.relayout('plot-radar', {
            paper_bgcolor: paperBg,
            'font.color':  tc,
            'polar.angularaxis.color': tc,
            'polar.angularaxis.gridcolor': gridC,
            'polar.radialaxis.color': tc,
            'polar.radialaxis.gridcolor': gridC
        });
        // F2: Degree distribution
        const degEl = document.getElementById('plot-degree');
        if (degEl && degEl.data) {
            Plotly.relayout('plot-degree', {
                paper_bgcolor: paperBg, plot_bgcolor: paperBg,
                'font.color': tc, 'xaxis.color': tc, 'xaxis.gridcolor': gridC,
                'yaxis.color': tc, 'yaxis.gridcolor': gridC
            });
        }
        // F7: Box plot
        const boxEl = document.getElementById('plot-box');
        if (boxEl && boxEl.data) {
            Plotly.relayout('plot-box', {
                paper_bgcolor: paperBg, plot_bgcolor: paperBg,
                'font.color': tc, 'yaxis.color': tc, 'yaxis.gridcolor': gridC,
                'xaxis.color': tc
            });
        }
        // F7: Scatter plot
        const scatEl = document.getElementById('plot-scatter');
        if (scatEl && scatEl.data) {
            Plotly.relayout('plot-scatter', {
                paper_bgcolor: paperBg, plot_bgcolor: paperBg,
                'font.color': tc, 'xaxis.color': tc, 'xaxis.gridcolor': gridC,
                'yaxis.color': tc, 'yaxis.gridcolor': gridC
            });
        }
    }
}

/* ── Layer visibility toggles ───────────────────────────────────────────── */

function toggleGroup(group, btn) {
    if (currentView === 'global') return;
    btn.classList.toggle('active');
    const isVis = btn.classList.contains('active');
    let targets = [];
    if (group === 'mesh_s')  targets = [0, 1, 10, 11];
    if (group === 'mesh_d')  targets = [2, 3, 12, 13];
    if (group === 'edge_s')  targets = [4, 5];
    if (group === 'edge_d')  targets = [7, 8];
    if (group === 'edge_si') targets = [6];
    if (group === 'edge_di') targets = [9];
    Plotly.restyle('plot-3d', {visible: isVis}, targets);
}

/* ── Node styling ───────────────────────────────────────────────────────── */

function applyNodeStyling() {
    const threshold = state.consThreshold;
    const metric    = state.sizingMode;
    let sizes_s, sizes_d;

    if (metric === 'default') {
        sizes_s = DATA.nodes.scores.map(s => s >= threshold ? 6 : 0.01);
        sizes_d = [...sizes_s];
    } else {
        const v_s   = DATA.nodes.metrics_sani[metric];
        const v_d   = DATA.nodes.metrics_depr[metric];
        const min_s = Math.min(...v_s), max_s = Math.max(...v_s);
        const min_d = Math.min(...v_d), max_d = Math.max(...v_d);
        sizes_s = v_s.map((v, i) =>
            DATA.nodes.scores[i] < threshold ? 0.01 :
            (max_s > min_s ? 5 + ((v - min_s) / (max_s - min_s)) * 25 : 6)
        );
        sizes_d = v_d.map((v, i) =>
            DATA.nodes.scores[i] < threshold ? 0.01 :
            (max_d > min_d ? 5 + ((v - min_d) / (max_d - min_d)) * 25 : 6)
        );
    }
    Plotly.restyle('plot-3d', {'marker.size': [sizes_s, sizes_s, sizes_d, sizes_d]}, [10, 11, 12, 13]);
}

function changeNodeSize(metric) { state.sizingMode = metric; applyNodeStyling(); }

function filterByConservation(val) {
    const threshold = val / 100;
    state.consThreshold = threshold;
    document.getElementById('slider-val').textContent =
        threshold === 0
            ? T[LANG].slider_all
            : `${T[LANG].filter_high} ≥ ${(threshold * 100).toFixed(0)}%`;
    applyNodeStyling();
}

/* ── Node search ────────────────────────────────────────────────────────── */

function searchNode(val) {
    if (!val) {
        Plotly.restyle('plot-3d', {
            x: [FULL_DATA.edges.s1.x_off, FULL_DATA.edges.s2.x_off, FULL_DATA.edges.si.x_off,
                FULL_DATA.edges.d1.x_off, FULL_DATA.edges.d2.x_off, FULL_DATA.edges.di.x_off],
            y: [FULL_DATA.edges.s1.y,     FULL_DATA.edges.s2.y,     FULL_DATA.edges.si.y,
                FULL_DATA.edges.d1.y,     FULL_DATA.edges.d2.y,     FULL_DATA.edges.di.y],
            z: [FULL_DATA.edges.s1.z_off, FULL_DATA.edges.s2.z_off, FULL_DATA.edges.si.z_off,
                FULL_DATA.edges.d1.z_off, FULL_DATA.edges.d2.z_off, FULL_DATA.edges.di.z_off],
            opacity: 1
        }, [4, 5, 6, 7, 8, 9]);
        Plotly.restyle('plot-3d', { opacity: 1, 'marker.color': ['#2D7DC4','#2D7DC4','#DC2626','#DC2626'] }, [10, 11, 12, 13]);
        Plotly.restyle('plot-3d', { opacity: 0.1 }, [0, 1, 2, 3]);
        applyNodeStyling();
        ['i_name','i_sim','i_ds','i_dd','i_bs','i_bd','i_cls','i_cld']
            .forEach(id => document.getElementById(id).innerText = '—');
        return;
    }

    const idx = FULL_DATA.nodes.names.indexOf(val);
    if (idx < 0) return;

    document.getElementById('i_name').innerText = val;
    const score = DATA.nodes.scores[idx];
    const st    = getStatus(score);
    document.getElementById('i_sim').innerText   = `${score.toFixed(2)} (${st.label})`;
    document.getElementById('i_sim').style.color = st.color;
    document.getElementById('i_ds').innerText    = DATA.nodes.metrics_sani.deg[idx];
    document.getElementById('i_dd').innerText    = DATA.nodes.metrics_depr.deg[idx];
    document.getElementById('i_bs').innerText    = DATA.nodes.metrics_sani.bet[idx].toFixed(4);
    document.getElementById('i_bd').innerText    = DATA.nodes.metrics_depr.bet[idx].toFixed(4);
    document.getElementById('i_cls').innerText   = DATA.nodes.metrics_sani.clu[idx].toFixed(4);
    document.getElementById('i_cld').innerText   = DATA.nodes.metrics_depr.clu[idx].toFixed(4);

    Plotly.restyle('plot-3d', { opacity: 0.05 }, [0, 1, 2, 3]);
    Plotly.restyle('plot-3d', { opacity: 0.1  }, [10, 11, 12, 13]);
    // Hide strong-edge overlays during node search to reduce visual clutter
    Plotly.restyle('plot-3d', { visible: false }, [14, 15, 16, 17]);

    const tx_s = FULL_DATA.nodes.base_x[idx] - 130;
    const tx_d = FULL_DATA.nodes.base_x[idx] + 130;
    const ty   = FULL_DATA.nodes.base_y[idx];

    function filterEdges(edg, tx) {
        let hx = [], hy = [], hz = [];
        for (let i = 0; i < edg.x_off.length; i += 3) {
            if ((Math.abs(edg.x_off[i]   - tx) < 1 && Math.abs(edg.y[i]   - ty) < 1) ||
                (Math.abs(edg.x_off[i+1] - tx) < 1 && Math.abs(edg.y[i+1] - ty) < 1)) {
                hx.push(edg.x_off[i], edg.x_off[i+1], null);
                hy.push(edg.y[i],     edg.y[i+1],     null);
                hz.push(edg.z_off[i], edg.z_off[i+1], null);
            }
        }
        return {x:hx, y:hy, z:hz};
    }

    if (currentView === 'global') {
        Plotly.restyle('plot-3d', {x:[[]], y:[[]], z:[[]]}, [4, 5, 6, 7, 8, 9]);
    } else if (currentView === 'sani') {
        const hs1 = filterEdges(FULL_DATA.edges.s1, tx_s);
        const hs2 = filterEdges(FULL_DATA.edges.s2, tx_s);
        const hsi = filterEdges(FULL_DATA.edges.si, tx_s);
        Plotly.restyle('plot-3d', {
            x:[hs1.x, hs2.x, hsi.x, [], [], []],
            y:[hs1.y, hs2.y, hsi.y, [], [], []],
            z:[hs1.z, hs2.z, hsi.z, [], [], []],
            opacity:[1,1,1,1,1,1]
        }, [4, 5, 6, 7, 8, 9]);
    } else if (currentView === 'depr') {
        const hd1 = filterEdges(FULL_DATA.edges.d1, tx_d);
        const hd2 = filterEdges(FULL_DATA.edges.d2, tx_d);
        const hdi = filterEdges(FULL_DATA.edges.di, tx_d);
        Plotly.restyle('plot-3d', {
            x:[[], [], [], hd1.x, hd2.x, hdi.x],
            y:[[], [], [], hd1.y, hd2.y, hdi.y],
            z:[[], [], [], hd1.z, hd2.z, hdi.z],
            opacity:[1,1,1,1,1,1]
        }, [4, 5, 6, 7, 8, 9]);
    }

    const nodeColors = Array(FULL_DATA.nodes.names.length).fill('rgba(0,0,0,0)');
    nodeColors[idx]  = '#f1c40f';
    const nodeSizes  = Array(FULL_DATA.nodes.names.length).fill(0.1);
    nodeSizes[idx]   = 12;
    Plotly.restyle('plot-3d', {
        'marker.color': [nodeColors, nodeColors, nodeColors, nodeColors],
        'marker.size':  [nodeSizes,  nodeSizes,  nodeSizes,  nodeSizes],
        opacity: 1
    }, [10, 11, 12, 13]);
}

/* ── B7: KPI tooltip toggle ─────────────────────────────────────────────── */

/**
 * Toggles the inline definition tip below a KPI card title.
 * The tip element is identified by `tip-{id}` convention.
 */
function toggleKpiTip(id) {
    const el = document.getElementById('tip-' + id);
    if (!el) return;
    el.style.display = el.style.display === 'block' ? 'none' : 'block';
}

/* ── F9: Community colour toggle ───────────────────────────────────── */

/**
 * Toggles community-based node colouring on traces 10-13.
 * Uses Layer 1 communities for L1 nodes and Layer 2 for L2 nodes.
 */
function toggleCommunityColors(btn) {
    state.communityMode = !state.communityMode;
    btn.classList.toggle('active', state.communityMode);
    applyCommunityColors();
}

function applyCommunityColors() {
    if (!DATA || !DATA.community_colors) return;

    if (!state.communityMode) {
        Plotly.restyle('plot-3d', {
            'marker.color': ['#2D7DC4', '#2D7DC4', '#DC2626', '#DC2626']
        }, [10, 11, 12, 13]);
        return;
    }

    const cc      = DATA.community_colors;
    const nodeIds = Object.keys(DATA.node_info);

    const colors_s1 = nodeIds.map(id => cc.sani?.layer_1?.[id]?.color || '#2D7DC4');
    const colors_s2 = nodeIds.map(id => cc.sani?.layer_2?.[id]?.color || '#2D7DC4');
    const colors_d1 = nodeIds.map(id => cc.depr?.layer_1?.[id]?.color || '#DC2626');
    const colors_d2 = nodeIds.map(id => cc.depr?.layer_2?.[id]?.color || '#DC2626');

    Plotly.restyle('plot-3d', {
        'marker.color': [colors_s1, colors_s2, colors_d1, colors_d2]
    }, [10, 11, 12, 13]);
}
