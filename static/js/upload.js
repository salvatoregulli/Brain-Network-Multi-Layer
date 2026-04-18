/* upload.js — File upload, tab switching, error handling, app reset */

/**
 * Called by each file-input's onchange handler. Updates the label with the
 * selected filename and marks the upload row as loaded.
 */
function fileLoaded(input, labelId, zoneId) {
    if (input.files && input.files[0]) {
        document.getElementById(labelId).textContent = input.files[0].name;
        document.getElementById(zoneId).classList.add('loaded');
    }
}

/**
 * Activates the requested tab panel and the corresponding nav button.
 * Fires a resize event after a short delay so Plotly redraws at the correct
 * dimensions when switching back to the visualisation tab.
 */
function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
    if (DATA) setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
}

/** Displays an error message in the banner strip and auto-hides after 10 s. */
function showError(msg) {
    const el = document.getElementById('error-banner');
    if (el) {
        el.innerHTML = '⚠ ' + msg;
        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 10000);
    }
}

/**
 * Reads all three file inputs, POSTs them as multipart form-data to the
 * Flask /upload endpoint, and wires up the returned JSON to the 3-D renderer
 * and the analytics dashboard.
 */
async function uploadData() {
    const f1 = document.getElementById('f-atlas').files[0];
    const f2 = document.getElementById('f-sani').files[0];
    const f3 = document.getElementById('f-depr').files[0];
    if (!f1 || !f2 || !f3) { showError(T[LANG].err_files); return; }

    const fd = new FormData();
    fd.append('atlas', f1);
    fd.append('edges_sani', f2);
    fd.append('edges_depr', f3);

    startLoader();
    try {
        const res = await fetch('/upload', { method: 'POST', body: fd });
        if (!res.ok) throw new Error(T[LANG].err_server);
        DATA = await res.json();
        if (DATA.error) throw new Error(DATA.error);

        // Populate node search autocomplete list
        const dl = document.getElementById('dl_nodes');
        dl.innerHTML = '';
        DATA.nodes.names.forEach(n => {
            const o = document.createElement('option');
            o.value = n;
            dl.appendChild(o);
        });

        render3D(DATA);
        if (typeof buildDashboard === 'function') buildDashboard();

        stopLoader();
        document.getElementById('btn-vis').style.display   = 'flex';
        document.getElementById('btn-dash').style.display  = 'flex';
        document.getElementById('btn-reset').style.display = 'block';
        switchTab('tab-vis', document.getElementById('btn-vis'));
    } catch(e) {
        stopLoader();
        showError('Error: ' + e.message);
    }
}

/**
 * Clears all loaded data and resets every UI element to its initial state,
 * returning the user to the home tab without reloading the page.
 */
function resetApp() {
    DATA = null; FULL_DATA = null; RES_DATA = null;
    hubShowAll = false;
    state = { rot: false, af: null, spd: 0.004, consThreshold: 0, sizingMode: 'default', edgeWeights: false, darkMode: state.darkMode, communityMode: false };
    if (state.af) { cancelAnimationFrame(state.af); state.af = null; }

    ['btn-vis', 'btn-dash', 'btn-reset'].forEach(id =>
        document.getElementById(id).style.display = 'none'
    );
    ['f-atlas', 'f-sani', 'f-depr'].forEach(id =>
        document.getElementById(id).value = ''
    );
    ['l-atlas', 'l-sani', 'l-depr'].forEach(id =>
        document.getElementById(id).textContent = T[LANG].no_file
    );
    ['zone-atlas', 'zone-sani', 'zone-depr'].forEach(id =>
        document.getElementById(id).classList.remove('loaded')
    );
    document.getElementById('cons-slider').value      = 0;
    document.getElementById('slider-val').textContent = T[LANG].slider_all;
    document.getElementById('error-banner').style.display = 'none';

    const homeBtn = document.querySelector('.nav-tab[onclick*="tab-home"]');
    switchTab('tab-home', homeBtn);
}
