/* loader.js — Loading overlay animation */

let loaderInterval = null;
let loaderStep     = 0;

/**
 * Starts the animated loading overlay, cycling through step messages at
 * 1.8-second intervals and advancing the progress bar proportionally.
 */
function startLoader() {
    const msgs = [
        [T[LANG].loader_0, T[LANG].loader_0s],
        [T[LANG].loader_1, T[LANG].loader_1s],
        [T[LANG].loader_2, T[LANG].loader_2s],
        [T[LANG].loader_3, T[LANG].loader_3s],
        [T[LANG].loader_4, T[LANG].loader_4s],
    ];
    loaderStep = 0;
    document.getElementById('loader').style.display = 'flex';
    document.getElementById('loader-progress').style.width = '0%';

    function tick() {
        if (loaderStep < msgs.length) {
            document.getElementById('loader-main').textContent = msgs[loaderStep][0];
            document.getElementById('loader-sub').textContent  = msgs[loaderStep][1];
            document.getElementById('loader-progress').style.width =
                ((loaderStep + 1) / msgs.length * 90) + '%';
            loaderStep++;
        }
    }
    tick();
    loaderInterval = setInterval(tick, 1800);
}

/** Completes the progress bar and hides the loading overlay. */
function stopLoader() {
    clearInterval(loaderInterval);
    document.getElementById('loader-progress').style.width = '100%';
    setTimeout(() => { document.getElementById('loader').style.display = 'none'; }, 350);
}
