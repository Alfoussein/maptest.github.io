//var apiKey = 'de012302a8b6464691dbd1df48f474fe';
//var apiKey = 'fc1af9eaec3c47c9b31d0dd09e0dc933';

// Initialise la carte centrée sur une position par défaut
var map = L.map('map').setView([48.8566, 2.3522], 12); // Coordonnées pour centrer sur la France

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

var apiKey = 'fc1af9eaec3c47c9b31d0dd09e0dc933';

var selectedAddresses = [];
var selectedCol2Values = [];
var markers = [];
var selectedAddressesStorage = [];

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
            iconSize: [25, 21],
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
                        iconSize: [25, 21],
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
                            // Ajoutez ici la logique pour ajouter la valeur de col2 si nécessaire
                        });
                    }
                });
        });

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
