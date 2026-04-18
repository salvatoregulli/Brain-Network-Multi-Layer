/* i18n.js — Internationalisation: translation dictionary, setLang(), getStatus(), toggleGuide() */

// Active language code — defaults to Italian to match the original app
let LANG = 'it';

// Translation dictionary containing every user-facing string in both languages.
const T = {
    it: {
        brand_tagline: 'ANALISI MULTILAYER',
        nav_home: 'Home', nav_vis: 'Visualizzazione 3D', nav_dash: 'Dashboard Stats',
        btn_reset: 'Nuova Analisi',
        upload_heading: 'Caricamento dati',
        upload_sub: 'Carica i tre file CSV per avviare l\'analisi.',
        step1_label: 'Nodi Seme (ROI)', step2_label: 'Archi | Gruppo 1', step3_label: 'Archi | Gruppo 2',
        no_file: 'Nessun file selezionato',
        btn_analyze: 'Avvia Analisi',
        eyebrow: 'Tesi di Laurea Triennale | Ingegneria Informatica e Biomedica | Gullì Salvatore',
        hero_title: 'Analisi comparativa di<br><em>reti cerebrali</em>',
        hero_desc: 'Piattaforma di visualizzazione e analisi topologica avanzata per reti cerebrali multilayer, basata sull\'algoritmo MuLaN.',
        guide_toggle: 'GUIDA ALL\'USO',
        guide_note: '⚠ Gli ID nei file archi devono corrispondere ai <strong>roi_id</strong> presenti nel file atlas. Nodi con coordinate mancanti o malformate vengono scartati automaticamente.',
        gs1t: 'Nodi Seme — Atlas CSV', gs1_badge: 'Separatore: ; (punto e virgola)',
        gs2t: 'Archi Gruppo 1 & 2 — Edge CSV', gs2_badge: 'Separatore: , (virgola)',
        gs3t: 'Visualizzazione 3D Interattiva', gs3d: 'Dopo il caricamento vedrai le due reti cerebrali affiancate in 3D. Usa i controlli a destra per filtrare layer, archi e nodi.',
        gs4t: 'Algoritmo MuLaN', gs4d: 'Lancia l\'allineamento locale multilayer dalla barra strumenti. Scegli l\'algoritmo (Louvain, Greedy, Infomap) e scarica i risultati.',
        gs5t: 'Dashboard Analitica', gs5d: 'Nella sezione Stats trovi le metriche topologiche comparate tra i due layer, il radar chart, le aree più alterate e la tabella completa degli hub vulnerabili. Puoi esportare un report PDF completo.',
        vis_panel_title: 'Interagisci col Modello',
        g1_name: 'GRUPPO 1 — Sani', g2_name: 'GRUPPO 2 — Depressi',
        btn_mesh: 'Mesh e Nodi Cerebrali', btn_intra: 'Archi Intra-Layer', btn_inter: 'Archi Inter-Layer',
        badge_music_g1: 'L1 — Musica', badge_music_g2: 'L1 — Musica', badge_silence: 'L2 — Silenzio',
        ctrl_sizing: 'Dimensionamento Nodi', ctrl_filter: 'Filtro Conservazione', ctrl_search: 'Cerca Nodo',
        sizing_default: 'Dimensione Uniforme', sizing_deg: 'Grado', sizing_bet: 'Betweenness Centrality', sizing_clu: 'Clustering Coefficient',
        slider_all: 'Tutti i nodi visibili', filter_low: 'Perso', filter_mid: 'Compensato', filter_high: 'Intatto',
        search_ph: '🔍 Cerca area cerebrale...',
        info_conservation: 'Conservazione', info_deg: 'Grado G1 / G2', info_bet: 'Betweenness G1 / G2', info_clu: 'Clustering G1 / G2',
        toolbar_global: 'Overview', toolbar_g1: 'Gruppo 1', toolbar_g2: 'Gruppo 2',
        toolbar_rot: 'Rotazione', toolbar_reset: 'Reset Camera',
        dash_heading: 'Analisi Comparata Layer',
        group_g1: 'Gruppo 1 (Sani)', group_g2: 'Gruppo 2 (Depressi)',
        btn_pdf: 'DOWNLOAD REPORT PDF',
        kpi_arc: 'Connessioni', kpi_den: 'Densità', kpi_mod: 'Modularità', kpi_eff: 'Efficienza Globale',
        kpi_clu: 'Clustering Medio', kpi_tra: 'Transitività', kpi_sw: 'Small-World Index', kpi_sim: 'Conservazione Strutturale',
        chart_bar: 'Aree Cerebrali Più Alterate', chart_radar: 'Impronta Topologica Comparata (Layer 1 vs 2)',
        hub_title: 'Analisi Hub Vulnerabili — Tutti i Nodi',
        hub_desc: 'Tutti i nodi ordinati per score di vulnerabilità (Betweenness G1 × (1 − Conservazione)). Le prime 10 righe corrispondono agli hub critici.',
        hub_th_rank: '#', hub_th_area: 'Area Cerebrale', hub_th_bet: 'Betweenness G1',
        hub_th_deg: 'Grado G1', hub_th_cons: 'Conservazione', hub_th_status: 'Stato', hub_th_vuln: 'Score Vulnerabilità',
        modal_title: 'Configurazione MuLaN',
        modal_desc: 'Allineamento locale per reti multilayer. Scegli l\'algoritmo di community detection e avvia l\'elaborazione.',
        modal_algo_label: 'Algoritmo Community Detection',
        modal_btn_run: 'Avvia Algoritmo MuLaN', modal_processing: 'Elaborazione in corso...',
        modal_done: '✓ Allineamento Completato', modal_dl_comm: 'Scarica Comunità Rilevate',
        modal_open_supergraph: 'Visualizzazione Interattiva Supergrafo', modal_close: 'Chiudi',
        aligned_title: 'Supergrafo allineato interattivo', aligned_legend: 'Legenda comunità', aligned_show_all: 'Mostra tutte',
        dash_compare_tab: 'Comparazione Comunità', layer_compare_title: 'Comparazione comunità tra layer',
        layer_1: 'Layer 1', layer_2: 'Layer 2', layer_nodes: 'nodi', layer_delta_nodes: 'Delta nodi', layer_total_comm: 'Numero comunità',
        algo_louvain: 'Louvain — veloce, ottimizzazione modularity',
        algo_greedy: 'Greedy Modularity — deterministico',
        algo_infomap: 'Infomap — basato sul flusso di informazione',
        status_intact: 'Intatto', status_comp: 'Compensato', status_lost: 'Perso',
        loader_0: 'Caricamento dati...', loader_0s: 'Lettura atlas e archi',
        loader_1: 'Costruzione grafi...', loader_1s: 'Creazione reti multilayer G1 e G2',
        loader_2: 'Calcolo metriche...', loader_2s: 'Densità, modularità, efficienza',
        loader_3: 'Allineamento MuLaN...', loader_3s: 'Calcolo punteggi di conservazione',
        loader_4: 'Rendering 3D...', loader_4s: 'Preparazione visualizzazione interattiva',
        err_files: 'Caricare tutti e tre i file.', err_server: 'Errore durante il caricamento dal Server',
        radar_labels: ['Densità','Modularità','Efficienza','Clustering','Transitività','Densità'],
        bar_xaxis: 'Indice di Conservazione',
        nd: 'N/D',
        // ── A6 MuLaN params ──────────────────────────────────────────────────
        mulan_params_title: 'Parametri Avanzati',
        mulan_param_delta:    'δ DELTA (hop max)',
        mulan_param_match:    'MATCH (peso identico)',
        mulan_param_mismatch: 'MISMATCH (arco alternativo)',
        mulan_param_gap:      'GAP (nessun percorso)',
        mulan_weighted_note: '⚖ Il MATCH è ora pesato per la similarità dei pesi degli archi.',
        // ── B2 edge weights ──────────────────────────────────────────────────
        toolbar_weights: 'Pesi Archi',
        // ── B7 KPI tooltips ──────────────────────────────────────────────────
        tip_arc: 'Numero totale di archi (connessioni funzionali) presenti nel layer selezionato. Indica la quantità complessiva di link tra le regioni cerebrali.',
        tip_den: 'Rapporto tra il numero di archi presenti e il numero massimo di archi possibili nel grafo. Valori vicini a 1 indicano una rete molto densa (molte connessioni); valori vicini a 0 una rete sparsa. Range: 0–1.',
        tip_mod: 'Misura la forza della suddivisione della rete in comunità (calcolata con algoritmo di Louvain). Valori alti indicano una rete ben partizionata in moduli funzionali distinti; valori bassi suggeriscono una struttura più omogenea. Range: −0.5–1.',
        tip_eff: 'Media dell\'inverso delle distanze geodetiche tra tutte le coppie di nodi. Valori alti indicano un\'elevata capacità della rete di trasferire informazioni tra regioni distanti. Range: 0–1.',
        tip_clu: 'Media dei coefficienti di clustering locali di tutti i nodi. Misura la tendenza dei vicini di ciascun nodo a formare triangoli (cluster). Valori alti indicano una forte segregazione funzionale locale. Range: 0–1.',
        tip_tra: 'Frazione di triangoli chiusi rispetto al numero totale di triple connesse nella rete. A differenza del clustering medio, è una misura globale della tendenza al clustering. Range: 0–1.',
        tip_sw: 'Indice Small-World σ = (C/C_rand) / (L/L_rand), dove C è il clustering e L la lunghezza media dei percorsi. Se σ > 1 la rete possiede proprietà small-world: alta segregazione locale e integrazione globale efficiente.',
        tip_sim: 'Media dei punteggi di conservazione MuLaN calcolati su tutti i nodi. Indica quanto la struttura topologica complessiva della rete si è preservata tra i due gruppi. Range: 0–100%.',
        // ── D1 dark mode ─────────────────────────────────────────────────────
        mode_dark: 'Dark',
        mode_light: 'Light',
        chart_degree: 'Distribuzione dei Gradi',
        chart_box: 'Distribuzione Metriche Nodali',
        chart_scatter: 'Betweenness vs Clustering',
        node_modal_title: 'Dettaglio Nodo',
        node_modal_conservation: 'Conservazione',
        node_modal_anatomy: 'Anatomia',
        node_modal_metrics: 'Confronto Metriche G1 vs G2',
        node_modal_neighbors: 'Vicini Principali',
        node_modal_lobe: 'Lobo',
        node_modal_hemisphere: 'Emisfero',
        node_modal_macro: 'Macro Area',
        node_modal_metric: 'Metrica',
        node_modal_delta: '\u0394',
        toolbar_communities: 'Comunit\u00e0',
        hub_show_all: 'Mostra tutti i nodi',
        hub_show_less: 'Mostra solo Top 10',
        // ── Chatbot ─────────────────────────────────────────────────────────
        chat_ai_name: 'Brain AI',
        chat_status: 'Assistente Neuroscienze',
        chat_placeholder: 'Scrivi un messaggio...',
        chat_welcome: 'Ciao! Sono <strong>Brain AI</strong>, il tuo assistente per l\'analisi delle reti cerebrali. 🧠<br><br>Posso aiutarti con:<br>- 📂 <strong>Caricamento dati</strong> — formato file, colonne richieste<br>- 🧩 <strong>Metriche topologiche</strong> — densità, modularità, clustering...<br>- 🔬 <strong>Algoritmo MuLaN</strong> — parametri, interpretazione<br>- 📊 <strong>Interpretazione risultati</strong> — hub vulnerabili, conservazione<br><br>Chiedimi qualsiasi cosa!',
        chat_error: 'Errore di connessione. Riprova.',
    },
    en: {
        brand_tagline: 'MULTILAYER ANALYSIS',
        nav_home: 'Home', nav_vis: '3D Visualization', nav_dash: 'Stats Dashboard',
        btn_reset: 'New Analysis',
        upload_heading: 'Load Data',
        upload_sub: 'Upload all three CSV files to start the analysis.',
        step1_label: 'Seed Nodes (ROI)', step2_label: 'Edges | Group 1', step3_label: 'Edges | Group 2',
        no_file: 'No file selected',
        btn_analyze: 'Run Analysis',
        eyebrow: 'Bachelor\'s Thesis | Computer & Biomedical Engineering | Gullì Salvatore',
        hero_title: 'Comparative analysis of<br><em>brain networks</em>',
        hero_desc: 'An advanced platform for topological visualisation and analysis of multilayer brain networks, powered by the MuLaN algorithm.',
        guide_toggle: 'USER GUIDE',
        guide_note: '⚠ Node IDs in the edge files must match the <strong>roi_id</strong> values in the atlas file. Nodes with missing or malformed coordinates are automatically discarded.',
        gs1t: 'Seed Nodes — Atlas CSV', gs1_badge: 'Separator: ; (semicolon)',
        gs2t: 'Group 1 & 2 Edges — Edge CSV', gs2_badge: 'Separator: , (comma)',
        gs3t: 'Interactive 3D Visualization', gs3d: 'After loading you will see both brain networks side by side in 3D. Use the controls on the right to filter layers, edges and nodes.',
        gs4t: 'MuLaN Algorithm', gs4d: 'Launch the multilayer local alignment from the toolbar. Select a community detection algorithm (Louvain, Greedy, Infomap) and download the results.',
        gs5t: 'Analytics Dashboard', gs5d: 'The Stats section shows comparative topological metrics between the two layers, the radar chart, the most altered areas, and the full vulnerable hub table. Export a complete PDF report.',
        vis_panel_title: 'Interact with Model',
        g1_name: 'GROUP 1 — Healthy', g2_name: 'GROUP 2 — Depressed',
        btn_mesh: 'Brain Mesh & Nodes', btn_intra: 'Intra-Layer Edges', btn_inter: 'Inter-Layer Edges',
        badge_music_g1: 'L1 — Music', badge_music_g2: 'L1 — Music', badge_silence: 'L2 — Silence',
        ctrl_sizing: 'Node Sizing', ctrl_filter: 'Conservation Filter', ctrl_search: 'Search Node',
        sizing_default: 'Uniform Size', sizing_deg: 'Degree', sizing_bet: 'Betweenness Centrality', sizing_clu: 'Clustering Coefficient',
        slider_all: 'All nodes visible', filter_low: 'Lost', filter_mid: 'Compensated', filter_high: 'Intact',
        search_ph: '🔍 Search brain area...',
        info_conservation: 'Conservation', info_deg: 'Degree G1 / G2', info_bet: 'Betweenness G1 / G2', info_clu: 'Clustering G1 / G2',
        toolbar_global: 'Overview', toolbar_g1: 'Group 1', toolbar_g2: 'Group 2',
        toolbar_rot: 'Rotation', toolbar_reset: 'Reset Camera',
        dash_heading: 'Comparative Layer Analysis',
        group_g1: 'Group 1 (Healthy)', group_g2: 'Group 2 (Depressed)',
        btn_pdf: 'DOWNLOAD PDF REPORT',
        kpi_arc: 'Connections', kpi_den: 'Density', kpi_mod: 'Modularity', kpi_eff: 'Global Efficiency',
        kpi_clu: 'Mean Clustering', kpi_tra: 'Transitivity', kpi_sw: 'Small-World Index', kpi_sim: 'Structural Conservation',
        chart_bar: 'Most Altered Brain Areas', chart_radar: 'Comparative Topological Fingerprint (Layer 1 vs 2)',
        hub_title: 'Vulnerable Hub Analysis — All Nodes',
        hub_desc: 'All nodes ranked by vulnerability score (Betweenness G1 × (1 − Conservation)). The top 10 rows are the critical hubs.',
        hub_th_rank: '#', hub_th_area: 'Brain Area', hub_th_bet: 'Betweenness G1',
        hub_th_deg: 'Degree G1', hub_th_cons: 'Conservation', hub_th_status: 'Status', hub_th_vuln: 'Vulnerability Score',
        modal_title: 'MuLaN Configuration',
        modal_desc: 'Local alignment for multilayer networks. Choose a community detection algorithm and start processing.',
        modal_algo_label: 'Community Detection Algorithm',
        modal_btn_run: 'Run MuLaN Algorithm', modal_processing: 'Processing...',
        modal_done: '✓ Alignment Complete', modal_dl_comm: 'Download Detected Communities',
        modal_open_supergraph: 'Interactive Supergraph View', modal_close: 'Close',
        aligned_title: 'Interactive aligned supergraph', aligned_legend: 'Community legend', aligned_show_all: 'Show all',
        dash_compare_tab: 'Community Comparison', layer_compare_title: 'Layer community comparison',
        layer_1: 'Layer 1', layer_2: 'Layer 2', layer_nodes: 'nodes', layer_delta_nodes: 'Node delta', layer_total_comm: 'Community count',
        algo_louvain: 'Louvain — fast, modularity optimisation',
        algo_greedy: 'Greedy Modularity — deterministic',
        algo_infomap: 'Infomap — information-flow based',
        status_intact: 'Intact', status_comp: 'Compensated', status_lost: 'Lost',
        loader_0: 'Loading data...', loader_0s: 'Reading atlas and edges',
        loader_1: 'Building graphs...', loader_1s: 'Creating G1 and G2 multilayer networks',
        loader_2: 'Computing metrics...', loader_2s: 'Density, modularity, efficiency',
        loader_3: 'MuLaN alignment...', loader_3s: 'Computing per-node conservation scores',
        loader_4: 'Rendering 3D...', loader_4s: 'Preparing interactive visualisation',
        err_files: 'Please load all three files.', err_server: 'Server error during upload',
        radar_labels: ['Density','Modularity','Efficiency','Clustering','Transitivity','Density'],
        bar_xaxis: 'Conservation Index',
        nd: 'N/A',
        // ── A6 MuLaN params ──────────────────────────────────────────────────
        mulan_params_title: 'Advanced Parameters',
        mulan_param_delta:    'δ DELTA (max hops)',
        mulan_param_match:    'MATCH (identical edge)',
        mulan_param_mismatch: 'MISMATCH (alternative path)',
        mulan_param_gap:      'GAP (no path found)',
        mulan_weighted_note: '⚖ MATCH is now scaled by edge-weight similarity.',
        // ── B2 edge weights ──────────────────────────────────────────────────
        toolbar_weights: 'Edge Weights',
        // ── B7 KPI tooltips ──────────────────────────────────────────────────
        tip_arc: 'Total number of edges (functional connections) in the selected layer. Represents the overall quantity of links between brain regions.',
        tip_den: 'Ratio of existing edges to the maximum possible edges in the graph. Values close to 1 indicate a very dense network (many connections); values close to 0 a sparse one. Range: 0–1.',
        tip_mod: 'Measures the strength of the network\'s partition into communities (Louvain algorithm). High values indicate a well-partitioned network into distinct functional modules; low values suggest a more homogeneous structure. Range: −0.5–1.',
        tip_eff: 'Mean inverse geodesic distance across all node pairs. High values indicate the network can efficiently transfer information between distant regions. Range: 0–1.',
        tip_clu: 'Mean local clustering coefficient across all nodes. Measures the tendency of each node\'s neighbours to form triangles (clusters). High values indicate strong local functional segregation. Range: 0–1.',
        tip_tra: 'Fraction of closed triangles over the total number of connected triples in the network. Unlike mean clustering, this is a global measure of clustering tendency. Range: 0–1.',
        tip_sw: 'Small-World Index σ = (C/C_rand) / (L/L_rand), where C is clustering and L the mean path length. σ > 1 indicates small-world properties: high local segregation and efficient global integration.',
        tip_sim: 'Mean MuLaN conservation scores across all nodes. Indicates how much the overall topological structure of the network has been preserved between the two groups. Range: 0–100%.',
        // ── D1 dark mode ─────────────────────────────────────────────────────
        mode_dark: 'Dark',
        mode_light: 'Light',
        chart_degree: 'Degree Distribution',
        chart_box: 'Node Metrics Distribution',
        chart_scatter: 'Betweenness vs Clustering',
        node_modal_title: 'Node Detail',
        node_modal_conservation: 'Conservation',
        node_modal_anatomy: 'Anatomy',
        node_modal_metrics: 'Metrics Comparison G1 vs G2',
        node_modal_neighbors: 'Top Neighbours',
        node_modal_lobe: 'Lobe',
        node_modal_hemisphere: 'Hemisphere',
        node_modal_macro: 'Macro Area',
        node_modal_metric: 'Metric',
        node_modal_delta: '\u0394',
        toolbar_communities: 'Communities',
        hub_show_all: 'Show all nodes',
        hub_show_less: 'Show Top 10 only',
        // ── Chatbot ─────────────────────────────────────────────────────────
        chat_ai_name: 'Brain AI',
        chat_status: 'Neuroscience Assistant',
        chat_placeholder: 'Type a message...',
        chat_welcome: 'Hi! I\'m <strong>Brain AI</strong>, your assistant for brain network analysis. 🧠<br><br>I can help you with:<br>- 📂 <strong>Data loading</strong> — file formats, required columns<br>- 🧩 <strong>Topological metrics</strong> — density, modularity, clustering...<br>- 🔬 <strong>MuLaN algorithm</strong> — parameters, interpretation<br>- 📊 <strong>Results interpretation</strong> — vulnerable hubs, conservation<br><br>Ask me anything!',
        chat_error: 'Connection error. Please try again.',
    }
};

/**
 * Switches the active UI language. Updates every element carrying a data-i18n
 * or data-i18n-html attribute, refreshes placeholder text, and rebuilds any
 * dynamic content that already exists in the DOM so it reflects the new
 * language immediately.
 */
function setLang(lang) {
    LANG = lang;
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (T[lang][key] !== undefined) el.textContent = T[lang][key];
    });

    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (T[lang][key] !== undefined) el.innerHTML = T[lang][key];
    });

    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        const key = el.getAttribute('data-i18n-ph');
        if (T[lang][key] !== undefined) el.placeholder = T[lang][key];
    });

    document.querySelectorAll('.lang-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-lang') === lang);
    });

    const sliderEl = document.getElementById('slider-val');
    if (sliderEl && state.consThreshold === 0) {
        sliderEl.textContent = T[lang].slider_all;
    }

    // Fix dark mode button text when language changes
    const darkBtn = document.getElementById('btn-dark');
    if (darkBtn) {
        const darkSpan = darkBtn.querySelector('span');
        const isDark = state.darkMode;
        darkSpan.textContent = isDark ? T[lang].mode_light : T[lang].mode_dark;
        darkSpan.setAttribute('data-i18n', isDark ? 'mode_light' : 'mode_dark');
    }

    if (DATA) {
        buildHubDetector();
        updateDashboardStats();
        Plotly.relayout('plot-bar', { 'xaxis.title.text': T[lang].bar_xaxis });
    }
    if (document.getElementById('layer-compare-modal').classList.contains('show')) {
        renderLayerComparisonModal();
    }
    if (document.getElementById('aligned-supergraph-modal').classList.contains('show')) {
        renderAlignedSupergraph();
    }
}

/**
 * Toggles the collapsible guide body below the guide toggle button.
 * Relies on the 'open' CSS class to animate the max-height transition.
 */
function toggleGuide(btn) {
    btn.classList.toggle('open');
    btn.nextElementSibling.classList.toggle('open');
}

/**
 * Maps a conservation score (0–1) to a localised label, a CSS colour value
 * for screen display, and a hex colour for PDF embedding.
 */
function getStatus(score) {
    if (score === 1.0) return { label: T[LANG].status_intact, color: '#166534', colorPdf: '#166534' };
    if (score >= 0.5)  return { label: T[LANG].status_comp,   color: '#92400E', colorPdf: '#92400E' };
    return                    { label: T[LANG].status_lost,   color: '#9B1C1C', colorPdf: '#9B1C1C' };
}
