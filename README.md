# Route Builder Pro

Application web OCR & Mapping pour la gestion d'itinéraires de livraison.

## Fonctionnalités

### Modes d'analyse
- **TSF (OCR)** - Analyse d'images TSF avec détection automatique des noms et adresses
- **Cainiao** - Analyse d'images Cainiao avec détection du code postal et ville
- **CSV** - Import de fichiers CSV

### OCR
- **OCR.space API** - Moteur principal (haute qualité)
- **Tesseract.js** - Fallback si OCR.space échoue

### Marqueurs
- 🟢 Vert = Non sélectionné
- 🔴 Rouge + numéro = Sélectionné
- Clic pour sélectionner/désélectionner
- Maximum 8 adresses par groupe

### Fonctions
- Génération d'itinéraires Google Maps
- Fusion de plusieurs groupes
- Copie du résultat dans le presse-papier
- Annulation du dernier groupe

## Technologies
- Leaflet.js (carte)
- Tesseract.js (OCR local)
- OCR.space API (OCR cloud)
- PapaParse (CSV)
- OpenCage API (géocodage)

## Utilisation
1. Ouvrir `index.html` dans un navigateur
2. Sélectionner le mode (TSF, Cainiao ou CSV)
3. Charger les images ou le fichier
4. Cliquer sur les marqueurs verts pour sélectionner
5. Valider la sélection
6. Ouvrir l'itinéraire Google Maps

## Structure
```
maptest.github.io/
├── index.html     # Application principale
└── README.md      # Documentation
```
