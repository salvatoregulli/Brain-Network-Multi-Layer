/* camera.js — Camera animation, view switching, and auto-rotation
 *
 * Trace index map (18 traces total):
 *   0-3   mesh (s1, s2, d1, d2)
 *   4-6   edges sani (L1, L2, inter)
 *   7-9   edges depr (L1, L2, inter)
 *   10-13 nodes (s1, s2, d1, d2)
 *   14-17 B2 strong-edge overlays (ss1, ss2, sd1, sd2) — initially hidden
 */

let _smoothCameraId = 0;   // cancellation token for overlapping animations

function smoothCamera(eye, center) {
    const plotDiv = document.getElementById('plot-3d');
    if (!plotDiv || !plotDiv.layout) return;
    const curEye = plotDiv.layout.scene.camera ? {...plotDiv.layout.scene.camera.eye}    : {x:0, y:-1.6, z:0};
    const curCen = plotDiv.layout.scene.camera ? {...plotDiv.layout.scene.camera.center}  : {x:0, y:0,   z:0};
    const STEPS = 40;
    let step = 0;
    const myId = ++_smoothCameraId;   // cancel any previous animation

    function ease(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }

    function frame() {
        if (myId !== _smoothCameraId) return;   // cancelled by a newer call
        step++;
        const t  = ease(step / STEPS);
        const ex = curEye.x + (eye.x - curEye.x) * t;
        const ey = curEye.y + (eye.y - curEye.y) * t;
        const ez = curEye.z + (eye.z - curEye.z) * t;
        const cx = curCen.x + (center.x - curCen.x) * t;
        const cy = curCen.y + (center.y - curCen.y) * t;
        const cz = curCen.z + (center.z - curCen.z) * t;
        Plotly.relayout('plot-3d', {
            'scene.camera.eye':    {x:ex, y:ey, z:ez},
            'scene.camera.center': {x:cx, y:cy, z:cz}
        });
        if (step < STEPS) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

/**
 * Switches the active 3-D view. Manages visibility of traces 0-17.
 * Strong-edge overlays (14-17) are shown only in single-group views
 * and only when state.edgeWeights is true.
 */
function setView(mode) {
    currentView = mode;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-view-' + mode).classList.add('active');

    const pSani   = document.getElementById('ctrl-sani');
    const pDepr   = document.getElementById('ctrl-depr');
    const overlay = document.getElementById('view-overlay');

    overlay.style.opacity       = '1';
    overlay.style.pointerEvents = 'all';

    setTimeout(() => {
        if (mode === 'global') {
            Plotly.restyle('plot-3d', {visible: true},  [0, 2, 10, 12]);
            Plotly.restyle('plot-3d', {visible: false}, [1, 3, 4, 5, 6, 7, 8, 9, 11, 13, 14, 15, 16, 17]);
            smoothCamera({x:0, y:-1.6, z:0}, {x:0, y:0, z:0});
            pSani.style.opacity = '0.3'; pSani.style.pointerEvents = 'none';
            pDepr.style.opacity = '0.3'; pDepr.style.pointerEvents = 'none';
        } else if (mode === 'sani') {
            Plotly.restyle('plot-3d', {visible: true},  [0, 1, 4, 5, 6, 10, 11]);
            Plotly.restyle('plot-3d', {visible: false}, [2, 3, 7, 8, 9, 12, 13, 16, 17]);
            // B2: show strong overlays for sani if edge-weight mode is active
            Plotly.restyle('plot-3d', {visible: state.edgeWeights}, [14, 15]);
            smoothCamera({x:-1.2, y:-1.1, z:0.1}, {x:-0.15, y:0, z:0});
            pSani.style.opacity = '1';   pSani.style.pointerEvents = 'auto';
            pDepr.style.opacity = '0.3'; pDepr.style.pointerEvents = 'none';
            syncToggleButtons('sani', {mesh: true, intra: true, inter: true});
        } else if (mode === 'depr') {
            Plotly.restyle('plot-3d', {visible: true},  [2, 3, 7, 8, 9, 12, 13]);
            Plotly.restyle('plot-3d', {visible: false}, [0, 1, 4, 5, 6, 10, 11, 14, 15]);
            // B2: show strong overlays for depr if edge-weight mode is active
            Plotly.restyle('plot-3d', {visible: state.edgeWeights}, [16, 17]);
            smoothCamera({x:1.2, y:-1.1, z:0.1}, {x:0.15, y:0, z:0});
            pSani.style.opacity = '0.3'; pSani.style.pointerEvents = 'none';
            pDepr.style.opacity = '1';   pDepr.style.pointerEvents = 'auto';
            syncToggleButtons('depr', {mesh: true, intra: true, inter: true});
        }

        setTimeout(() => {
            overlay.style.opacity       = '0';
            overlay.style.pointerEvents = 'none';
        }, 350);

        const searchVal = document.getElementById('s_in').value;
        if (searchVal) searchNode(searchVal);
    }, 200);
}

function syncToggleButtons(group, {mesh, intra, inter}) {
    const panel = document.getElementById('ctrl-' + group);
    const btns  = panel.querySelectorAll('.toggle-btn');
    btns[0].classList.toggle('active', mesh);
    btns[1].classList.toggle('active', intra);
    btns[2].classList.toggle('active', inter);
}

/** Toggles the continuous camera rotation animation. */
function toggleRot() {
    state.rot = !state.rot;
    document.getElementById('b_rot').classList.toggle('active', state.rot);
    if (state.rot) requestAnimationFrame(runRot);
    else cancelAnimationFrame(state.af);
}

function runRot() {
    if (!state.rot) return;
    const gd    = document.getElementById('plot-3d');
    const cam   = gd.layout.scene.camera;
    const r     = Math.sqrt(cam.eye.x**2 + cam.eye.y**2);
    const theta = Math.atan2(cam.eye.y, cam.eye.x) + state.spd;
    Plotly.relayout('plot-3d', {
        'scene.camera.eye': {x: r*Math.cos(theta), y: r*Math.sin(theta), z: cam.eye.z}
    }).then(() => { if (state.rot) state.af = requestAnimationFrame(runRot); });
}

/** Resets the camera to the default position for the current view mode. */
function resetView() { setView(currentView); }
