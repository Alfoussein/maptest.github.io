// Configuration
const API_KEY = 'de012302a8b6464691dbd1df48f474fe';
const INITIAL_VIEW = [48.8566, 2.3522];
const INITIAL_ZOOM = 12;

// Constantes
const ADDRESS_KEYWORDS = ['rue', 'avenue', 'boulevard', 'place', 'chemin', 'route', 'square', 'impasse', 'allée', 'esplanade', 'passage'];
const FULL_NAME_WITH_TITLE_REGEX = /(Mme\/m|M|Mme)\s+([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)*)/g;

// Variables d'état
let map;
let selectedAddresses = [];
let selectedCol2Values = [];
let markers = [];
let selectedAddressesStorage = [];
let sortDeliveryArray = [];
let linkedArray = [];
let boolOCR = false;
let countPeople = 1;
const _fullNames = [];
const _addresses = [];
const _mapPoints = [];
const _selectedMarkers = [];

// Initialisation de la carte
const initMap = () => {
    map = L.map('map').setView(INITIAL_VIEW, INITIAL_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
};

// Fonctions utilitaires
const cleanAddress = (address) => address.replace(/["">]/g, '').trim();

const getCoordinates = async (address) => {
    try {
        const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${API_KEY}`);
        const data = await response.json();
        if (data.results.length > 0) {
            return data.results[0].geometry;
        }
        throw new Error("Aucune coordonnée trouvée pour cette adresse");
    } catch (error) {
        console.error("Erreur lors du géocodage:", error);
    }
};

// Gestion des marqueurs
const addMarkerToMap = (info, col2, coordinates) => {
    if (selectedAddresses.length >= 9) {
        alert("Vous avez déjà sélectionné 9 adresses. Veuillez annuler une sélection avant d'en ajouter d'autres.");
        return;
    }

    const marker = L.marker([coordinates.lat, coordinates.lng]).addTo(map);
    marker.bindPopup(`<b>${info}</b>`).openPopup();
    marker.isSelected = false;

    marker.on('click', () => handleMarkerClick(marker, info, col2));
};

const handleMarkerClick = (marker, info, col2) => {
    if (marker.isSelected) {
        alert("Ce marqueur a déjà été sélectionné.");
        return;
    }

    marker.isSelected = true;
    marker.setIcon(L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/64/64572.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
    }));

    updateSelectedAddresses(info, col2, marker);
    checkAndGenerateUrl();
};

const updateSelectedAddresses = (info, col2, marker) => {
    if (boolOCR) {
        const index = linkedArray.findIndex(data => data.address === info);
        sortDeliveryArray.push(linkedArray[index]);
        linkedArray.splice(index, 1);
        selectedAddresses.push(info);
        selectedCol2Values.push(sortDeliveryArray[sortDeliveryArray.length - 1].name);
    } else {
        selectedAddresses.push(info);
        selectedCol2Values.push(col2);
    }
    markers.push(marker);
    document.querySelector('#undoButton').disabled = false;
};

const checkAndGenerateUrl = () => {
    if (selectedAddresses.length === 9 || (selectedAddresses.length % 9 === 0 && selectedAddresses.length > 0)) {
        if (confirm(`Vous avez sélectionné ${selectedAddresses.length} adresses. Voulez-vous générer l'URL ?`)) {
            generateGoogleMapsUrl();
            selectedAddressesStorage.push([...selectedAddresses]);
            selectedAddresses = [];
            selectedCol2Values = [];
        }
    }
};

// Gestion des fichiers
const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: (results) => processCSVData(results.data),
        error: (error) => console.error('Erreur lors du parsing du fichier CSV :', error)
    });
};

const handleImageUpload = async (event) => {
    const files = event.target.files;
    let combinedText = '';

    const promises = Array.from(files).map(file => 
        Tesseract.recognize(file, 'eng')
            .then(({ data: { text } }) => {
                console.log(text);
                combinedText += text + '\n';
            })
            .catch(err => console.error('Erreur lors de l\'extraction du texte:', err))
    );

    await Promise.all(promises);
    processRecognizedText(combinedText);
    showMapAndControls();
};

// Traitement des données
const processCSVData = (data) => {
    data.forEach(row => {
        const col2 = row[Object.keys(row)[1]];
        const col3 = row[Object.keys(row)[2]];
        const col4 = row[Object.keys(row)[3]];
        const col5 = row[Object.keys(row)[4]];
        const info = `${col3}, ${col4}, ${col5}`;

        getCoordinates(info)
            .then(coords => addMarkerToMap(info, col2, coords))
            .catch(error => console.error(`Erreur lors du géocodage de l'information ${info}:`, error));
    });
    showMapAndControls();
};

const processRecognizedText = async (recognizedText) => {
    boolOCR = true;
    const lines = recognizedText.split('\n');
    console.log(lines);

    const selectedPreviousElements = lines.filter((line, index, array) => {
        // Logique de filtrage à implémenter selon vos besoins
        return true; // Placeholder
    });

    console.log(selectedPreviousElements);

    lines.forEach(line => {
        const titleMatch = line.match(FULL_NAME_WITH_TITLE_REGEX);
        if (titleMatch) {
            _fullNames.push(titleMatch[0].trim());
        }

        ADDRESS_KEYWORDS.forEach(keyword => {
            if (line.toLowerCase().includes(keyword)) {
                const address = cleanAddress(line.trim());
                _addresses.push(address);
            }
        });
    });

    console.log(_addresses);

    await Promise.all(_addresses.map(async (address, index) => {
        const col2 = _fullNames[index] || selectedPreviousElements[index];
        try {
            const coords = await getCoordinates(address);
            addMarkerToMap(address, col2, coords);
        } catch (error) {
            console.error(`Erreur lors du géocodage de l'adresse ${address}:`, error);
        }
    }));

    await mergeArray(selectedPreviousElements);
};

// Fonctions d'interface utilisateur
const showFileInput = (type) => {
    document.querySelector('#menuContainer').style.visibility = 'hidden';
    document.querySelector('#fileInputs').style.visibility = 'visible';
    document.querySelector('#imageFileInput').style.display = type === 'image' ? 'block' : 'none';
    document.querySelector('#csvFileInput').style.display = type === 'csv' ? 'block' : 'none';
};

const showMapAndControls = () => {
    document.querySelector('#mapContainer').style.visibility = 'visible';
    document.querySelector('#fileInputs').style.visibility = 'hidden';
    displayanimation();
};

const displayanimation = () => {
    document.getElementById('addressTableContainer').animate(
        [{ top: "100%" }, { top: '65%' }],
        { duration: 3000 }
    );
};

// Fonctions supplémentaires
const generateGoogleMapsUrl = () => {
    let url = "https://www.google.com/maps/dir/";
    selectedAddresses.forEach(address => {
        url += encodeURIComponent(address) + "/";
    });
    console.log(url);
    // Ici, vous pouvez ajouter la logique pour afficher ou utiliser l'URL générée
};

const undoSelection = () => {
    if (selectedAddressesStorage.length > 0) {
        const lastGroup = selectedAddressesStorage.pop();
        lastGroup.forEach(address => {
            const marker = markers.find(m => m._popup._content === `<b>${address}</b>`);
            if (marker) {
                marker.setIcon(L.icon({
                    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                }));
                marker.isSelected = false;
            }
        });
        // Mise à jour de l'interface utilisateur si nécessaire
    }
};

const validateList = () => {
    // Logique de validation de la liste
    console.log("Liste validée");
    // Ajoutez ici la logique pour traiter la liste validée
};

const mergeArray = async (selectedPreviousElements) => {
    linkedArray = _addresses.map((address, index) => ({
        address: address,
        name: _fullNames[index] || selectedPreviousElements[index]
    }));
    console.log(linkedArray);
};

// Event Listeners
document.querySelector('#tsfButton').addEventListener('click', () => showFileInput('image'));
document.querySelector('#otherButton').addEventListener('click', () => showFileInput('csv'));
document.querySelector('#csvFileInput').addEventListener('change', handleCSVUpload);
document.querySelector('#imageFileInput').addEventListener('change', handleImageUpload);
document.querySelector('#undoButton').addEventListener('click', undoSelection);
document.querySelector('#validateListButton').addEventListener('click', validateList);
document.querySelector('#restartButton').addEventListener('click', () => window.location.reload());

// Initialisation
const init = () => {
    initMap();
    // Autres initialisations si nécessaires
};

// Exécution
init();