var map = L.map('map').setView([48.8566, 2.3522], 12); // Coordonnées pour centrer sur la France

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

//var apiKey = 'fc1af9eaec3c47c9b31d0dd09e0dc933';
var selectedAddresses = [];
var selectedCol2Values = [];
var markers = [];
var selectedAddressesStorage = [];

const fullNameWithTitleRegex = /(Mme\/m|M|Mme)\s+([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)*)/g;

const ocrResult = `Mme/m MEDZA JACQUES
Mme/m GRANEL JULIEN
Mme/m ADRIEN FARRANDS
Mme/m Elsa Rouiller`;

setTimeout(() => {
    const fullNameWithTitleRegex = /(Mme\/m|M|Mme)\s+([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)*)/g;
    const names = ocrResult.match(fullNameWithTitleRegex);
    
    if (names) {
        console.log('Noms extraits pour test :', names);
    } else {
        console.log('Aucun nom trouvé.');
    }
}, 2000); // Délai de 500 ms


// Liste des mots-clés d'adresse
const addressKeywords = [
    'rue', 'avenue', 'boulevard', 'place', 'chemin', 'route',
    'square', 'impasse', 'allée', 'esplanade'
];

// Listes pour stocker les noms complets et les adresses
const _fullNames = [];
const _addresses = [];
const _mapPoints = [];
const _selectedMarkers = [];

function getCoordinates(address) {
    return fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            if (data.results.length > 0) {
                return data.results[0].geometry;
            } else {
                throw new Error("Aucune coordonnée trouvée pour cette adresse");
            }
        });
}

function addMarkerToMap(info, col2, coordinates) {
    if (selectedAddresses.length >= 9) {
        alert("Vous avez déjà sélectionné 9 adresses. Veuillez annuler une sélection avant d'en ajouter d'autres.");
        return;
    }

    var marker = L.marker([coordinates.lat, coordinates.lng]).addTo(map);
    marker.bindPopup(`<b>${info}</b>`).openPopup();

    marker.on('click', function() {
        marker.setIcon(L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/64/64572.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
        }));

        selectedAddresses.push(info);
        selectedCol2Values.push(col2);
        markers.push(marker);

        document.querySelector('#undoButton').disabled = false;

        if (selectedAddresses.length === 9) {
            if (confirm("Vous avez sélectionné 9 adresses. Voulez-vous continuer ?")) {
                // Supprime les marqueurs de la carte après confirmation
                markers.forEach(marker => {
                    map.removeLayer(marker);
                });
                markers = []; // Réinitialise la liste des marqueurs
                
                generateGoogleMapsUrl();
                generateCol2Div();
                selectedAddressesStorage.push([...selectedAddresses]);
                selectedAddresses = []; // Réinitialise les adresses sélectionnées
                selectedCol2Values = [];
            } else {
                // Restauration des marqueurs et réinitialisation
                markers.forEach(marker => {
                    marker.setIcon(L.icon({
                        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                    }));
                });

                // Réinitialiser la liste des adresses sélectionnées pour permettre une nouvelle sélection
                selectedAddresses = [];
                selectedCol2Values = [];
            }
        }
    });
}

function undoSelection() {
    if (selectedAddressesStorage.length > 0) {
        var lastGroup = selectedAddressesStorage.pop(); // Prend le dernier tableau d'adresses

        // Restauration des marqueurs du dernier tableau d'adresses
        lastGroup.forEach(address => {
            getCoordinates(address)
                .then(coords => {
                    // Vérification si l'adresse est déjà présente
                    if (!selectedAddresses.includes(address)) {
                        var marker = L.marker([coords.lat, coords.lng]).addTo(map);
                        markers.push(marker);

                        marker.bindPopup(address).openPopup();
                        
                        marker.setIcon(L.icon({
                            iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                            iconSize: [25, 41],
                            iconAnchor: [12, 41],
                            popupAnchor: [1, -34],
                        }));

                        marker.on('click', function() {
                            marker.setIcon(L.icon({
                                iconUrl: 'https://cdn-icons-png.flaticon.com/512/64/64572.png',
                                iconSize: [25, 21],
                                iconAnchor: [12, 41],
                                popupAnchor: [1, -34],
                            }));
                            selectedAddresses.push(address);
                        });
                    }
                });
        });

        // Suppression du dernier div d'URL générée (si présent)
        var googleMapsUrlsDiv = document.querySelector('#googleMapsUrls');
        if (googleMapsUrlsDiv.lastChild) {
            googleMapsUrlsDiv.removeChild(googleMapsUrlsDiv.lastChild);
        }

        // Suppression du dernier div de valeurs concaténées de la colonne 2 (si présent)
        var concatCol2Div = document.querySelector('#concatCol2Container');
        if (concatCol2Div.lastChild) {
            concatCol2Div.removeChild(concatCol2Div.lastChild);
        }

        // Gestion de l'activation/désactivation du bouton undo
        if (selectedAddressesStorage.length === 0) {
            document.querySelector('#undoButton').disabled = true;
        }
    }
}

function generateGoogleMapsUrl() {
    var urlBase = "https://www.google.fr/maps/dir/";
    var concatenatedAddresses = selectedAddresses.join('/');
    var fullUrl = urlBase + concatenatedAddresses;

    var urlDiv = document.createElement('div');
    urlDiv.className = 'url-container';
    urlDiv.innerHTML = `<a href="${fullUrl}" target="_blank">${fullUrl}</a>`;
    document.querySelector('#googleMapsUrls').appendChild(urlDiv);
}

function generateCol2Div() {
    var col2Div = document.createElement('div');
    col2Div.className = 'concat-container';
    col2Div.innerHTML = `<b>Colonnes 2:</b> ${selectedCol2Values.join(', ')}`;
    document.querySelector('#concatCol2Container').appendChild(col2Div);
}

document.querySelector('#undoButton').addEventListener('click', undoSelection);

document.querySelector('#csvFileInput').addEventListener('change', function(event) {
    var file = event.target.files[0];
    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: function(results) {
            var data = results.data;

            data.forEach(function(row) {
                var col2 = row[Object.keys(row)[1]];
                var col3 = row[Object.keys(row)[2]];
                var col4 = row[Object.keys(row)[3]];
                var col5 = row[Object.keys(row)[4]];

                var info = `${col3}, ${col4}, ${col5}`;

                getCoordinates(info)
                    .then(coords => {
                        addMarkerToMap(info, col2, coords);
                    })
                    .catch(error => {
                        console.error(`Erreur lors du géocodage de l'information ${info}:`, error);
                    });
            });
        },
        error: function(error) {
            console.error('Erreur lors du parsing du fichier CSV :', error);
        }
    });
});

// Gestion de l'extraction de texte à partir d'une image avec Tesseract.js
document.querySelector('#imageFileInput').addEventListener('change', function(event) {
    var file = event.target.files[0];
    if (file) {
        Tesseract.recognize(
            file,
            'eng', // Définir la langue pour l'OCR
            {
                logger: m => console.log(m) // Optionnel : affiche la progression
            }
        ).then(({ data: { text } }) => {
            console.log(text); // Affiche le texte extrait dans la console
            document.querySelector('#extractedText').innerText = text; // Affiche le texte extrait dans l'élément de la page
            processRecognizedText(text); // Appel à la fonction pour traiter le texte reconnu
        }).catch(err => {
            console.error('Erreur lors de l\'extraction du texte:', err);
        });
    }
});

// Fonction pour traiter le texte reconnu
function processRecognizedText(recognizedText) {
    const lines = recognizedText.split('\n');
    lines.forEach(line => {
        const titleMatch = line.match(fullNameWithTitleRegex);
        if (titleMatch) {
            _fullNames.push(titleMatch[0].trim());
        }

        addressKeywords.forEach(keyword => {
            if (line.toLowerCase().includes(keyword)) {
                _addresses.push(line.trim());
            }
        });
    });

    console.log('Noms complets détectés:', _fullNames);
    console.log('Adresses détectées:', _addresses);
}


