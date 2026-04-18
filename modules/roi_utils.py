"""
roi_utils.py
------------
Utility functions for ROI name parsing, coordinate extraction,
and neuroanatomical macro-area inference from name or MNI coordinates.
"""

import re
import numpy as np


def extract_coords(name):
    """
    Parses MNI coordinates from a ROI name string of the form 'Label (x,y,z)'.
    Returns a list of three integers on success, or [NaN, NaN, NaN] if the
    pattern is absent or the input is not a string.
    """
    if not isinstance(name, str):
        return [np.nan] * 3
    m = re.search(r'\(([-]?\d+),([-]?\d+),([-]?\d+)\)', name)
    return [int(m.group(1)), int(m.group(2)), int(m.group(3))] if m else [np.nan] * 3


def clean_roi_name(name):
    """Removes coordinate suffixes and hemisphere prefixes from ROI labels."""
    if not isinstance(name, str):
        return "Unknown Area"
    base = re.sub(r'\s*\(.*?\)', '', name).strip()
    base = re.sub(r'^(left|right|l|r)[\s\-_]+', '', base, flags=re.IGNORECASE)
    return base or "Unknown Area"


def infer_macro_area_from_name(roi_name):
    """
    Infers a neuroanatomical macro-area from ROI label tokens.
    Falls back to None when no reliable text signal is present.
    """
    text = clean_roi_name(roi_name).lower()

    # Ordered from more specific to broader classes.
    area_patterns = [
        ("Insula",           [r"\binsula\b", r"\binsular\b"]),
        ("Cingulate",        [r"\bcingulate\b", r"\bacc\b", r"\bpcc\b"]),
        ("Medial Temporal",  [r"\bhippocamp", r"\bparahipp", r"\bentorh", r"\bamygdal"]),
        ("Basal Ganglia",    [r"\bcaudate\b", r"\bputamen\b", r"\bpallid", r"\bstriat"]),
        ("Thalamic",         [r"\bthalam"]),
        ("Cerebellar",       [r"\bcerebell", r"\bvermis"]),
        ("Sensorimotor",     [r"\bprecentral\b", r"\bpostcentral\b", r"\bsupplementary motor\b", r"\bmotor\b", r"\bsensory\b"]),
        ("Visual Occipital", [r"\boccip", r"\bcalcarine\b", r"\bcuneus\b", r"\blingual\b", r"\bvisual\b"]),
        ("Temporal",         [r"\btemporal\b", r"\bsuperiortemporal\b", r"\bmiddletemporal\b", r"\binferiortemporal\b", r"\bheschl\b", r"\btemporalpole\b"]),
        ("Parietal",         [r"\bpariet", r"\bsupramarginal\b", r"\bangular\b", r"\bprecuneus\b"]),
        ("Orbitofrontal",    [r"\borbitofrontal\b", r"\bofc\b", r"\borbital\b"]),
        ("Prefrontal",       [r"\bfrontal\b", r"\bmiddlefrontal\b", r"\binferiorfrontal\b", r"\bsuperiorfrontal\b", r"\bdorsolateral\b", r"\bventrolateral\b", r"\bpfc\b"]),
    ]

    for label, patterns in area_patterns:
        if any(re.search(p, text) for p in patterns):
            return label
    return None


def infer_lobe_from_coords(x, y, z):
    """
    Approximates the dominant brain lobe from MNI coordinates.
    This is a coarse heuristic used to give readable community names.
    """
    if np.isnan(x) or np.isnan(y) or np.isnan(z):
        return "Mixed"
    if y > 20:
        return "Frontal"
    if y < -35:
        return "Occipital"
    if -35 <= y <= 20 and z > 25:
        return "Parietal"
    if -35 <= y <= 20 and z <= 25:
        return "Temporal"
    return "Mixed"


def infer_hemisphere_from_x(x):
    """Returns hemisphere label from x coordinate sign."""
    if np.isnan(x):
        return "Bihemispheric"
    if x > 8:
        return "Right"
    if x < -8:
        return "Left"
    return "Midline"


def infer_macro_area(roi_name, x, y, z):
    """
    Returns a robust community naming area:
    1) atlas/ROI text-driven macro-area when available
    2) coordinate-driven lobe fallback otherwise
    """
    from_name = infer_macro_area_from_name(roi_name)
    if from_name:
        return from_name
    lobe = infer_lobe_from_coords(x, y, z)
    if lobe == "Mixed":
        return "Distributed"
    return lobe
