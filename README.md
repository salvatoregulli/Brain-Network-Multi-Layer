# 🧠 Brain Network | Multi Layer

**Piattaforma di visualizzazione e analisi topologica avanzata per reti cerebrali multilayer, basata sull'algoritmo MuLaN.**

> Tesi di Laurea Triennale — Ingegneria Informatica e Biomedica — Gullì Salvatore

---

## 📋 Panoramica

Brain Network | Multi Layer è una web application interattiva che permette di **confrontare le reti funzionali cerebrali** di due gruppi di soggetti (sani vs depressi) attraverso due condizioni sperimentali (musica e silenzio), organizzate in una struttura multilayer.

L'applicazione integra:
- **Visualizzazione 3D interattiva** delle reti cerebrali con mesh fsaverage5
- **Allineamento locale MuLaN** (Multilayer Local Network Alignment) per calcolare la conservazione strutturale
- **Dashboard analitica** con metriche topologiche comparate
- **Assistente AI** (Brain AI) alimentato da Google Gemini per l'interpretazione dei risultati

---

## ✨ Funzionalità principali

### 🔬 Visualizzazione 3D
- Rendering interattivo con **Plotly.js** di 4 brain mesh (2 gruppi × 2 layer)
- Nodi colorati per **punteggio di conservazione** (scala cromatica rosso→giallo→verde)
- Toggle visibilità per mesh, archi intra-layer e archi inter-layer
- Dimensionamento nodi per grado, betweenness centrality o clustering coefficient
- Filtro nodi per soglia di conservazione
- Ricerca nodi con evidenziazione 3D e dettaglio metriche
- Rotazione automatica e controlli camera (overview, zoom gruppo 1/2)
- Overlay archi forti (soglia 75° percentile peso)
- Colorazione nodi per comunità

### 📊 Dashboard Analitica
- **8 KPI** con confronto Layer 1 vs Layer 2: connessioni, densità, modularità, efficienza globale, clustering medio, transitività, small-world index, conservazione strutturale
- **Tooltip informativi** per ogni metrica con spiegazione neuroscientifica
- **Radar chart** per impronta topologica comparata
- **Bar chart** delle aree cerebrali più alterate
- **Distribuzione dei gradi** (istogramma)
- **Box plot** distribuzione metriche nodali
- **Scatter plot** betweenness vs clustering
- **Tabella hub vulnerabili** con ranking, score di vulnerabilità e stato
- **Comparazione comunità** tra layer con delta nodi
- **Modale dettaglio nodo** con anatomia, metriche G1 vs G2 e vicini principali

### ⚡ Algoritmo MuLaN
- Allineamento locale multilayer con **4 parametri configurabili**: DELTA, MATCH, MISMATCH, GAP
- Conservazione pesata per **similarità dei pesi** degli archi
- Community detection con 3 algoritmi: **Louvain**, **Greedy Modularity**, **Infomap**
- Visualizzazione interattiva del **supergrafo allineato** con legenda comunità
- Download comunità rilevate

### 🤖 Brain AI — Assistente Intelligente
- Chatbot AI integrato alimentato da **Google Gemini**
- Disponibile dall'avvio per guidare il caricamento dati
- **Risposte contestualizzate** sui dati caricati (metriche, hub vulnerabili, conservazione)
- Supporto conversazione con cronologia
- Retry automatico con fallback a modelli alternativi

### 🌍 Altre funzionalità
- **Dark mode** con persistenza in localStorage
- **Internazionalizzazione** completo IT / EN
- **Export PDF** con report completo della dashboard
- Design system premium con font Google (Fraunces, DM Sans, JetBrains Mono)

---

## 🏗️ Architettura

```
Brain Network - Multi Layer/
├── app.py                      # Flask entry point + API endpoints
├── requirements.txt            # Dipendenze Python
├── render.yaml                 # Configurazione deploy Render
├── modules/
│   ├── roi_utils.py            # Parsing ROI, coordinate MNI, inferenza lobi
│   ├── graph_utils.py          # Costruzione grafi multilayer
│   ├── metrics.py              # Metriche topologiche (grafo e nodo)
│   ├── community.py            # Community detection + naming
│   ├── mulan.py                # Algoritmo MuLaN (alignment locale)
│   └── visualization.py        # Edge arrays, hub ranking, strong edges
├── templates/
│   └── index.html              # Single-page application HTML
└── static/
    ├── css/
    │   └── main.css            # Design system completo (~2000 righe)
    └── js/
        ├── state.js            # Stato globale condiviso
        ├── i18n.js             # Dizionario IT/EN + setLang()
        ├── loader.js           # Overlay di caricamento animato
        ├── upload.js           # Gestione upload file CSV
        ├── render3d.js         # Rendering Plotly 3D
        ├── camera.js           # Controlli camera e smooth transitions
        ├── controls.js         # Toggle visibilità, sizing, filtri
        ├── dashboard.js        # KPI, charts, tabelle dashboard
        ├── mulan_modal.js      # Modale configurazione MuLaN
        ├── layer_modal.js      # Modale comparazione layer
        ├── node_modal.js       # Modale dettaglio nodo
        ├── chatbot.js          # Assistente AI Brain AI
        └── export.js           # Generazione report PDF
```

---

## 🚀 Installazione ed esecuzione

### Prerequisiti
- **Python 3.10+**
- Chiave API Google Gemini (gratuita da [aistudio.google.com](https://aistudio.google.com))

### Setup locale

```bash
# Clona il repository
git clone https://github.com/YOUR-USERNAME/brain-network-multilayer.git
cd brain-network-multilayer

# Installa le dipendenze
pip install -r requirements.txt

# (Opzionale) Configura la chiave API Gemini come variabile d'ambiente
set GEMINI_API_KEY=la_tua_chiave_api

# Avvia il server di sviluppo
python app.py
```

L'applicazione sarà disponibile all'indirizzo: **http://127.0.0.1:5001**

---

## 📁 Formato dati di input

L'applicazione richiede **3 file CSV**:

### 1. Atlas (Nodi Seme)
File CSV con separatore `;` contenente le regioni di interesse:
| Colonna | Descrizione |
|---------|-------------|
| `roi_id` | Identificatore numerico univoco |
| `roi_name` | Nome area nel formato `NomeArea (x,y,z)` con coordinate MNI |

### 2–3. Archi Gruppo 1 e Gruppo 2
File CSV con separatore `,` contenente le connessioni funzionali:
| Colonna | Descrizione |
|---------|-------------|
| `source_id` | ID nodo sorgente (deve corrispondere a `roi_id`) |
| `target_id` | ID nodo destinazione |
| `weight` | Peso della connessione |
| `layer` | Layer di appartenenza: `1` = musica, `2` = silenzio, `3` = inter-layer |

> ⚠️ Gli ID nei file archi devono corrispondere ai `roi_id` dell'atlas. Nodi con coordinate mancanti o malformate vengono scartati automaticamente.

---

## 🧮 Metriche calcolate

| Metrica | Descrizione | Range |
|---------|-------------|-------|
| **Densità** | Rapporto archi presenti / archi possibili | 0–1 |
| **Modularità** | Forza della partizione in comunità (Louvain) | −0.5–1 |
| **Efficienza globale** | Media dell'inverso delle distanze geodetiche | 0–1 |
| **Clustering medio** | Tendenza dei vicini a formare triangoli | 0–1 |
| **Transitività** | Frazione globale di triangoli chiusi | 0–1 |
| **Small-world σ** | Indice small-world (C/C_rand)/(L/L_rand) | σ>1 = small-world |
| **Betweenness** | Centralità di intermediazione per nodo | 0–1 |
| **Conservazione MuLaN** | Preservazione topologia locale tra gruppi | 0–100% |

---

## 🛠️ Stack tecnologico

| Componente | Tecnologia |
|-----------|------------|
| Backend | Python 3, Flask |
| Frontend | HTML5, Vanilla CSS, JavaScript |
| Visualizzazione 3D | Plotly.js |
| Neuroimaging | Nilearn, Nibabel (fsaverage5 mesh) |
| Analisi grafi | NetworkX, python-louvain, Infomap |
| AI Assistant | Google Gemini API |
| Export | html2pdf.js |
| Icone | Lucide Icons |
| Font | Google Fonts (Fraunces, DM Sans, JetBrains Mono) |

---

## 📄 Licenza

Progetto sviluppato come Tesi di Laurea Triennale in Ingegneria Informatica e Biomedica.

---

<p align="center">
  <strong>Brain Network | Multi Layer</strong><br>
  <em>Analisi comparativa di reti cerebrali multilayer</em>
</p>
