/* dashboard.js — KPI cards, radar chart, bar chart, hub vulnerability table,
 *                F2 degree distribution, F7 box plot & scatter plot */

/**
 * Renders a percentage-change delta badge below a KPI value pair.
 * Positive deltas are coloured green; negative ones red.
 */
function renderDelta(s, d, el_id) {
    const el = document.getElementById(el_id);
    if (s === 0) { el.innerText = ''; return; }
    const diff  = ((d - s) / s) * 100;
    const isInt = Number.isInteger(s) && Number.isInteger(d);
    el.innerText = (diff >= 0 ? '+' : '') + diff.toFixed(isInt ? 0 : 1) + '%';
    el.className = 'kpi-delta ' + (diff >= 0 ? 'delta-pos' : 'delta-neg');
}

/**
 * Refreshes all KPI card values and delta badges for the currently selected
 * group (sani / depr), then re-renders the radar chart.
 */
function updateDashboardStats() {
    const grp = document.getElementById('stats-group-select').value;
    const mL1 = grp === 'sani' ? DATA.metrics.sani_L1 : DATA.metrics.depr_L1;
    const mL2 = grp === 'sani' ? DATA.metrics.sani_L2 : DATA.metrics.depr_L2;

    ['arc','den','mod','eff','clu','tra'].forEach(k => {
        document.getElementById(`k-${k}-s`).innerText = mL1[k];
        document.getElementById(`k-${k}-d`).innerText = mL2[k];
        renderDelta(mL1[k], mL2[k], `d-${k}`);
    });

    const sw_s  = mL1.small_world, sw_d = mL2.small_world;
    const swEl_s = document.getElementById('k-sw-s');
    const swEl_d = document.getElementById('k-sw-d');
    swEl_s.innerText   = sw_s !== null ? sw_s : T[LANG].nd;
    swEl_d.innerText   = sw_d !== null ? sw_d : T[LANG].nd;
    swEl_s.style.color = sw_s !== null ? (sw_s > 1 ? 'var(--ok)' : 'var(--g2)') : 'var(--text-muted)';
    swEl_d.style.color = sw_d !== null ? (sw_d > 1 ? 'var(--ok)' : 'var(--g2)') : 'var(--text-muted)';
    if (sw_s !== null && sw_d !== null) renderDelta(sw_s, sw_d, 'd-sw');

    updateRadarChart(mL1, mL2);
}

/**
 * Re-renders the radar chart with normalised values so that Layer 1 and
 * Layer 2 are always visible regardless of their absolute magnitudes.
 */
function updateRadarChart(mL1, mL2) {
    const rKeys    = ['den','mod','eff','clu','tra'];
    const theta    = T[LANG].radar_labels;
    const r_s_raw  = rKeys.map(k => mL1[k]);
    const r_d_raw  = rKeys.map(k => mL2[k]);
    const r_s_norm = r_s_raw.map((v, i) => v / Math.max(v, r_d_raw[i], 0.0001));
    const r_d_norm = r_d_raw.map((v, i) => r_d_raw[i] / Math.max(v, r_d_raw[i], 0.0001));

    Plotly.react('plot-radar', [
        {
            type:'scatterpolar', r:[...r_s_norm, r_s_norm[0]], theta, fill:'toself', name:'Layer 1',
            customdata:[...r_s_raw, r_s_raw[0]], hovertemplate:'%{theta}: %{customdata:.4f}<extra></extra>',
            line:{color:'#1A4E7A', width:2.5}, marker:{size:6}, fillcolor:'rgba(26,78,122,0.12)'
        },
        {
            type:'scatterpolar', r:[...r_d_norm, r_d_norm[0]], theta, fill:'toself', name:'Layer 2',
            customdata:[...r_d_raw, r_d_raw[0]], hovertemplate:'%{theta}: %{customdata:.4f}<extra></extra>',
            line:{color:'#9B1C1C', width:2.5}, marker:{size:6}, fillcolor:'rgba(155,28,28,0.10)'
        }
    ], {
        polar: {
            bgcolor: 'rgba(0,0,0,0)',
            radialaxis:  {visible:true, showticklabels:false, color:'#44403C', gridcolor:'rgba(0,0,0,0.05)', gridwidth:1.5, range:[0,1.05]},
            angularaxis: {color:'#44403C', gridcolor:'rgba(0,0,0,0.05)', gridwidth:1.5, tickfont:{size:11, color:'#44403C'}}
        },
        showlegend: true,
        legend: {orientation:'h', x:0.5, xanchor:'center', y:-0.08, font:{size:11, color:'#44403C'}},
        paper_bgcolor: 'rgba(0,0,0,0)',
        font: {color:'#44403C', family:'DM Sans'},
        margin: {t:15, b:65, l:50, r:50}
    }, {responsive:true, displayModeBar:false});
}

/* ── F2: Degree Distribution ───────────────────────────────────────── */

function buildDegreeDistribution() {
    const tc    = '#44403C';
    const gridC = 'rgba(0,0,0,0.05)';

    Plotly.newPlot('plot-degree', [
        {
            type: 'histogram',
            x: DATA.nodes.metrics_sani.deg,
            name: T[LANG].group_g1,
            marker: { color: 'rgba(26,78,122,0.55)', line: { color: '#1A4E7A', width: 1 } },
            opacity: 0.75
        },
        {
            type: 'histogram',
            x: DATA.nodes.metrics_depr.deg,
            name: T[LANG].group_g2,
            marker: { color: 'rgba(155,28,28,0.55)', line: { color: '#9B1C1C', width: 1 } },
            opacity: 0.75
        }
    ], {
        barmode: 'overlay',
        xaxis: { title: { text: 'Degree', font: { size: 11, color: tc } }, color: tc, gridcolor: gridC, zeroline: false },
        yaxis: { title: { text: 'Frequency', font: { size: 11, color: tc } }, color: tc, gridcolor: gridC, zeroline: false },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor:  'rgba(0,0,0,0)',
        legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.18, font: { size: 11, color: tc } },
        margin: { l: 50, r: 20, t: 10, b: 60 },
        font: { color: tc, family: 'DM Sans' }
    }, { responsive: true, displayModeBar: false });
}

/* ── F7: Box Plot ──────────────────────────────────────────────────── */

function buildBoxPlot() {
    const tc = '#44403C';

    Plotly.newPlot('plot-box', [
        { type:'box', y:DATA.nodes.metrics_sani.bet, name:`Betw. G1`, marker:{color:'#1A4E7A'}, boxmean:true, line:{width:1.5} },
        { type:'box', y:DATA.nodes.metrics_depr.bet, name:`Betw. G2`, marker:{color:'#9B1C1C'}, boxmean:true, line:{width:1.5} },
        { type:'box', y:DATA.nodes.metrics_sani.clu, name:`Clust. G1`, marker:{color:'#2D7DC4'}, boxmean:true, line:{width:1.5} },
        { type:'box', y:DATA.nodes.metrics_depr.clu, name:`Clust. G2`, marker:{color:'#DC2626'}, boxmean:true, line:{width:1.5} },
    ], {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor:  'rgba(0,0,0,0)',
        margin: { l: 50, r: 20, t: 10, b: 60 },
        font: { color: tc, family: 'DM Sans', size: 11 },
        yaxis: { color: tc, gridcolor: 'rgba(0,0,0,0.05)', zeroline: false },
        xaxis: { color: tc }
    }, { responsive: true, displayModeBar: false });
}

/* ── F7: Scatter Plot — Betweenness vs Clustering ──────────────────── */

function buildScatterPlot() {
    const tc    = '#44403C';
    const gridC = 'rgba(0,0,0,0.05)';

    Plotly.newPlot('plot-scatter', [
        {
            type: 'scatter', mode: 'markers',
            x: DATA.nodes.metrics_sani.bet,
            y: DATA.nodes.metrics_sani.clu,
            text: DATA.nodes.names,
            name: T[LANG].group_g1,
            marker: { color: 'rgba(26,78,122,0.65)', size: 8, line: { width: 0.8, color: '#fff' } },
            hovertemplate: '<b>%{text}</b><br>Betweenness: %{x:.4f}<br>Clustering: %{y:.4f}<extra></extra>'
        },
        {
            type: 'scatter', mode: 'markers',
            x: DATA.nodes.metrics_depr.bet,
            y: DATA.nodes.metrics_depr.clu,
            text: DATA.nodes.names,
            name: T[LANG].group_g2,
            marker: { color: 'rgba(155,28,28,0.65)', size: 8, line: { width: 0.8, color: '#fff' } },
            hovertemplate: '<b>%{text}</b><br>Betweenness: %{x:.4f}<br>Clustering: %{y:.4f}<extra></extra>'
        }
    ], {
        xaxis: { title: { text: 'Betweenness Centrality', font: { size: 11, color: tc } }, color: tc, gridcolor: gridC, zeroline: false },
        yaxis: { title: { text: 'Clustering Coefficient', font: { size: 11, color: tc } }, color: tc, gridcolor: gridC, zeroline: false },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor:  'rgba(0,0,0,0)',
        legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.18, font: { size: 11, color: tc } },
        margin: { l: 55, r: 20, t: 10, b: 60 },
        font: { color: tc, family: 'DM Sans' }
    }, { responsive: true, displayModeBar: false });
}

/**
 * Initialises the full dashboard: global conservation score, bar chart of the
 * 15 most altered nodes, radar chart placeholder, and the hub ranking table.
 */
function buildDashboard() {
    document.getElementById('k-gsim').innerText = DATA.metrics.global_sim + '%';

    const tc    = '#44403C';
    const gridC = 'rgba(0,0,0,0.05)';

    const nodesComb = DATA.nodes.names
        .map((n, i) => ({ name: n, score: DATA.nodes.scores[i] }))
        .sort((a, b) => a.score - b.score);
    const worst = nodesComb.slice(0, 15).reverse();

    Plotly.newPlot('plot-bar', [{
        type: 'bar', x: worst.map(d => d.score), y: worst.map(d => d.name), orientation: 'h',
        marker: { color: worst.map(d => d.score), colorscale:'RdYlGn', cmin:0, cmax:1, line:{width:0} }
    }], {
        yaxis: {tickfont:{size:9, color:tc}, color:tc, automargin:true},
        xaxis: {title:{text:T[LANG].bar_xaxis, font:{size:10, color:tc}}, color:tc, gridcolor:gridC, range:[0,1], zeroline:false},
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        margin: {l:10, r:10, t:5, b:40}, font:{color:tc, family:'DM Sans', size:10}
    }, {responsive:true, displayModeBar:false});

    Plotly.newPlot('plot-radar', [], {}, {responsive:true, displayModeBar:false});
    updateDashboardStats();

    /* F2, F7 — additional charts */
    buildDegreeDistribution();
    buildBoxPlot();
    buildScatterPlot();

    buildHubDetector();
}

/**
 * Builds the full vulnerable-hub ranking table, sorting all nodes by
 * vuln_score = betweenness_G1 × (1 − conservation). Top 10 highlighted.
 * Shows only 10 rows by default; "Show all" button expands to full list.
 */
function buildHubDetector() {
    const allNodes = DATA.nodes.names.map((n, i) => {
        const bet_s      = DATA.nodes.metrics_sani.bet[i];
        const score      = DATA.nodes.scores[i];
        const vuln_score = bet_s * (1.0 - score);
        return { name: n, bet_sani: bet_s, deg_sani: DATA.nodes.metrics_sani.deg[i], score, vuln_score };
    }).sort((a, b) => b.vuln_score - a.vuln_score);

    const displayNodes = hubShowAll ? allNodes : allNodes.slice(0, 10);
    const maxVuln      = allNodes[0].vuln_score || 1;

    let html = `<table class="hub-table"><thead><tr>
        <th>${T[LANG].hub_th_rank}</th>
        <th>${T[LANG].hub_th_area}</th>
        <th>${T[LANG].hub_th_bet}</th>
        <th>${T[LANG].hub_th_deg}</th>
        <th>${T[LANG].hub_th_cons}</th>
        <th>${T[LANG].hub_th_status}</th>
        <th>${T[LANG].hub_th_vuln}</th>
    </tr></thead><tbody>`;

    displayNodes.forEach((h, i) => {
        const st       = getStatus(h.score);
        const sc       = h.score === 1.0 ? 'status-ok' : h.score >= 0.5 ? 'status-warn' : 'status-bad';
        const barW     = Math.round((h.vuln_score / maxVuln) * 100);
        const rowBg    = i < 10 ? 'background:rgba(30,58,95,0.03);' : '';
        const top_badge = i === 0
            ? ` <span style="font-size:8px;background:var(--navy);color:white;padding:1px 5px;border-radius:3px;vertical-align:middle;margin-left:4px;">TOP</span>`
            : '';
        html += `<tr style="${rowBg}">
            <td style="color:var(--text-muted);font-weight:700;text-align:center;">${i+1}</td>
            <td style="font-weight:${i<10?'700':'500'};">${h.name}${top_badge}</td>
            <td>${h.bet_sani.toFixed(4)}</td>
            <td>${h.deg_sani}</td>
            <td>${h.score.toFixed(3)}</td>
            <td><span class="status-pill ${sc}">${st.label}</span></td>
            <td><div class="vuln-bar-wrap"><div class="vuln-bar-bg"><div class="vuln-bar-fill" style="width:${barW}%; background:${st.color};"></div></div><span class="vuln-score-val">${h.vuln_score.toFixed(5)}</span></div></td>
        </tr>`;
    });

    html += '</tbody></table>';

    /* Expand / Collapse button */
    if (allNodes.length > 10) {
        const btnLabel = hubShowAll
            ? T[LANG].hub_show_less
            : `${T[LANG].hub_show_all} (${allNodes.length})`;
        html += `<div class="hub-expand-wrap">
            <button class="hub-expand-btn" onclick="hubShowAll=!hubShowAll; buildHubDetector()">
                ${btnLabel}
            </button>
        </div>`;
    }

    document.getElementById('hub-table').innerHTML = html;
}
