# Brain Network - Multi Layer
**Sperimental Thesis in Computer and Biomedical Engineering** 
**Author:** Salvatore Gullì

This repository contains a web-based application for the topological visualization and comparative analysis of multilayer brain networks. The platform implements the MuLaN algorithm to compare functional connectivity between different groups (e.g., healthy patient vs. depressed patient) across multiple layers.

# Key Features
**3D Visualization:** Renders brain nodes, intra-layer, and inter-layer edges mapped on the MNI space (fsaverage5).
**Network Alignment & Community Detection:** Executes local network alignment and detects communities using Louvain, Greedy Modularity, or Infomap algorithms.
**Topological Analytics:** Computes density, modularity, global efficiency, transitivity, and small-world indices.
**Hub Detection:** Ranks vulnerable brain areas based on betweenness centrality and structural conservation scores.
**Reporting:** Generates and exports analytical reports in PDF format.

# Technology Stack
**Backend:** Python, Flask, NetworkX, Nilearn, Infomap
**Frontend:** HTML5, JavaScript, CSS, Plotly.js, html2pdf.js

# Dataset
In the repository there will be 3 files that can be used to run an example on the application, one of them is the ROI file with all the seed nodes, the other two are multilayer networks from two subjects, one is healthy and the other is depressed, each layer represents a condition, the first layer listens to music while the second layer doesn't.

# License
This project is licensed under the MIT License.
