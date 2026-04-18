/* export.js — File download utility and PDF report generator */

/** Creates a temporary anchor element to trigger a browser file download. */
function downloadFile(content, filename) {
    const blob = new Blob([content], {type: 'text/plain'});
    const link = document.createElement('a');
    link.href     = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

/**
 * Generates a full-page PDF report using html2pdf.js. The report includes
 * the global conservation score, per-layer topological metrics for the
 * selected group, and a complete vulnerability-ranked node table.
 * PDF content remains in the current language at the time of export.
 */
function exportPDF() {
    if (!DATA) return;
    const today   = new Date().toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit', year:'numeric'});
    const grp     = document.getElementById('stats-group-select').value;
    const mL1     = grp === 'sani' ? DATA.metrics.sani_L1 : DATA.metrics.depr_L1;
    const mL2     = grp === 'sani' ? DATA.metrics.sani_L2 : DATA.metrics.depr_L2;
    const nomeGrp = grp === 'sani' ? T[LANG].group_g1 : T[LANG].group_g2;

    const sw_s = mL1.small_world !== null ? mL1.small_world : T[LANG].nd;
    const sw_d = mL2.small_world !== null ? mL2.small_world : T[LANG].nd;

    // Build the full node vulnerability ranking for the PDF table
    const allNodes = DATA.nodes.names.map((n, i) => {
        const bet_s      = DATA.nodes.metrics_sani.bet[i];
        const score      = DATA.nodes.scores[i];
        const vuln_score = bet_s * (1.0 - score);
        return { name: n, bet_sani: bet_s, deg_sani: DATA.nodes.metrics_sani.deg[i], score, vuln_score };
    }).sort((a, b) => b.vuln_score - a.vuln_score);

    const hubRows = allNodes.map((h, i) => {
        const st = getStatus(h.score);
        return `<tr style="background:${i%2===0?'#fafafa':'white'}">
            <td style="text-align:center;font-weight:700;color:#888;">${i+1}</td>
            <td><strong>${h.name}</strong></td>
            <td style="text-align:center;font-family:monospace;">${h.bet_sani.toFixed(4)}</td>
            <td style="text-align:center;">${h.deg_sani}</td>
            <td style="text-align:center;font-family:monospace;">${h.score.toFixed(3)}</td>
            <td style="text-align:center;color:${st.colorPdf};font-weight:700;">${st.label}</td>
            <td style="text-align:center;font-family:monospace;">${h.vuln_score.toFixed(5)}</td>
        </tr>`;
    }).join('');

    const html = `<div style="font-family:'DM Sans',sans-serif;color:#1C1917;padding:40px;background:#fff;max-width:1100px;margin:0 auto;font-size:13px;">
        <h1 style="color:#1E3A5F;border-bottom:2px solid #1E3A5F;padding-bottom:10px;font-size:22px;margin-bottom:6px;">Brain Network | Report PDF</h1>
        <div style="color:#A8A29E;font-size:11px;margin-bottom:28px;">${today}</div>
        <h2 style="color:#1A4E7A;margin-top:32px;font-size:14px;border-left:3px solid #1A4E7A;padding-left:10px;text-transform:uppercase;letter-spacing:0.5px;">${T[LANG].kpi_sim}</h2>
        <div style="text-align:center;padding:24px;background:#F0F4FA;border:1px solid #C5D5E8;border-radius:10px;margin:16px 0;"><div style="font-size:56px;font-weight:700;color:#1E3A5F;font-family:monospace;letter-spacing:-2px;">${DATA.metrics.global_sim}%</div></div>
        <h2 style="color:#1A4E7A;margin-top:32px;font-size:14px;border-left:3px solid #1A4E7A;padding-left:10px;text-transform:uppercase;letter-spacing:0.5px;">${T[LANG].dash_heading}: ${nomeGrp}</h2>
        <div style="display:flex;gap:18px;margin:10px 0;font-size:11px;align-items:center;"><span style="width:10px;height:10px;border-radius:50%;display:inline-block;background:#1A4E7A;"></span> Layer 1 &nbsp;&nbsp; <span style="width:10px;height:10px;border-radius:50%;display:inline-block;background:#9B1C1C;"></span> Layer 2</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0;">
            <div style="background:#F7F5F2;border-radius:8px;padding:12px;text-align:center;border:1px solid #E0DDD8;"><div style="font-size:9px;color:#A8A29E;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">${T[LANG].kpi_arc}</div><div style="display:flex;justify-content:center;gap:12px;"><span style="font-size:16px;font-weight:700;font-family:monospace;color:#1A4E7A;">${mL1.arc}</span><span style="font-size:16px;font-weight:700;font-family:monospace;color:#9B1C1C;">${mL2.arc}</span></div></div>
            <div style="background:#F7F5F2;border-radius:8px;padding:12px;text-align:center;border:1px solid #E0DDD8;"><div style="font-size:9px;color:#A8A29E;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">${T[LANG].kpi_den}</div><div style="display:flex;justify-content:center;gap:12px;"><span style="font-size:16px;font-weight:700;font-family:monospace;color:#1A4E7A;">${mL1.den}</span><span style="font-size:16px;font-weight:700;font-family:monospace;color:#9B1C1C;">${mL2.den}</span></div></div>
            <div style="background:#F7F5F2;border-radius:8px;padding:12px;text-align:center;border:1px solid #E0DDD8;"><div style="font-size:9px;color:#A8A29E;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">${T[LANG].kpi_mod}</div><div style="display:flex;justify-content:center;gap:12px;"><span style="font-size:16px;font-weight:700;font-family:monospace;color:#1A4E7A;">${mL1.mod}</span><span style="font-size:16px;font-weight:700;font-family:monospace;color:#9B1C1C;">${mL2.mod}</span></div></div>
            <div style="background:#F7F5F2;border-radius:8px;padding:12px;text-align:center;border:1px solid #E0DDD8;"><div style="font-size:9px;color:#A8A29E;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">${T[LANG].kpi_eff}</div><div style="display:flex;justify-content:center;gap:12px;"><span style="font-size:16px;font-weight:700;font-family:monospace;color:#1A4E7A;">${mL1.eff}</span><span style="font-size:16px;font-weight:700;font-family:monospace;color:#9B1C1C;">${mL2.eff}</span></div></div>
            <div style="background:#F7F5F2;border-radius:8px;padding:12px;text-align:center;border:1px solid #E0DDD8;"><div style="font-size:9px;color:#A8A29E;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">${T[LANG].kpi_clu}</div><div style="display:flex;justify-content:center;gap:12px;"><span style="font-size:16px;font-weight:700;font-family:monospace;color:#1A4E7A;">${mL1.clu}</span><span style="font-size:16px;font-weight:700;font-family:monospace;color:#9B1C1C;">${mL2.clu}</span></div></div>
            <div style="background:#F7F5F2;border-radius:8px;padding:12px;text-align:center;border:1px solid #E0DDD8;"><div style="font-size:9px;color:#A8A29E;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">${T[LANG].kpi_tra}</div><div style="display:flex;justify-content:center;gap:12px;"><span style="font-size:16px;font-weight:700;font-family:monospace;color:#1A4E7A;">${mL1.tra}</span><span style="font-size:16px;font-weight:700;font-family:monospace;color:#9B1C1C;">${mL2.tra}</span></div></div>
        </div>
        <h2 style="color:#1A4E7A;margin-top:32px;font-size:14px;border-left:3px solid #1A4E7A;padding-left:10px;text-transform:uppercase;letter-spacing:0.5px;">${T[LANG].hub_title} (${allNodes.length} nodes)</h2>
        <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:8px;">
            <thead><tr>
                <th style="background:#1E3A5F;color:white;padding:8px 10px;text-align:left;font-weight:600;">#</th>
                <th style="background:#1E3A5F;color:white;padding:8px 10px;text-align:left;font-weight:600;">${T[LANG].hub_th_area}</th>
                <th style="background:#1E3A5F;color:white;padding:8px 10px;text-align:left;font-weight:600;">${T[LANG].hub_th_bet}</th>
                <th style="background:#1E3A5F;color:white;padding:8px 10px;text-align:left;font-weight:600;">${T[LANG].hub_th_deg}</th>
                <th style="background:#1E3A5F;color:white;padding:8px 10px;text-align:left;font-weight:600;">${T[LANG].hub_th_cons}</th>
                <th style="background:#1E3A5F;color:white;padding:8px 10px;text-align:left;font-weight:600;">${T[LANG].hub_th_status}</th>
                <th style="background:#1E3A5F;color:white;padding:8px 10px;text-align:left;font-weight:600;">${T[LANG].hub_th_vuln}</th>
            </tr></thead>
            <tbody>${hubRows}</tbody>
        </table>
        <div style="font-size:10px;color:#A8A29E;margin-top:40px;text-align:center;border-top:1px solid #E0DDD8;padding-top:14px;">Brain Network | Gullì Salvatore | ${today}</div>
    </div>`;

    const element = document.createElement('div');
    element.innerHTML = html;
    html2pdf().set({
        margin: 10,
        filename: `Report_BrainNetwork_${nomeGrp.replace(/[^a-z0-9]/gi,'_')}.pdf`,
        image: {type:'jpeg', quality:0.98},
        html2canvas: {scale: 2},
        jsPDF: {unit:'mm', format:'a4', orientation:'portrait'}
    }).from(element).save();
}
