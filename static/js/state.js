/* state.js — Global application state shared across all JS modules */

let DATA      = null;  // Full JSON payload returned by the /upload endpoint
let FULL_DATA = null;  // Same reference, retained for search/highlight resets
let RES_DATA  = null;  // MuLaN alignment result returned by /run_mulan

let state = {
    rot:           false,
    af:            null,
    spd:           0.004,
    consThreshold: 0,
    sizingMode:    'default',
    edgeWeights:   false,   // B2: overlay spesso degli archi per peso
    darkMode:      false,   // D1: dark mode attiva
    communityMode: false    // F9: nodi colorati per comunità
};

let currentView              = 'global';
let ACTIVE_ALIGNED_COMMUNITY = null;
