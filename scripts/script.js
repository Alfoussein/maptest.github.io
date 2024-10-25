//var apiKey = 'de012302a8b6464691dbd1df48f474fe';
//var apiKey = 'fc1af9eaec3c47c9b31d0dd09e0dc933';

var map = L.map('map').setView([48.8566, 2.3522], 12); // Coordonnées pour centrer sur la France

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

var apiKey = 'de012302a8b6464691dbd1df48f474fe';
var selectedAddresses = [];
var selectedCol2Values = [];
var markers = [];
var selectedAddressesStorage = [];
var sortDeliveryArray = [];
let linkedArray = [];
const fullNameWithTitleRegex = /(Mme\/m|M|Mme)\s+([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)*)/g;
let boolOCR = false
const ocrResult = `Mme/m MEDZA JACQUES
Mme/m GRANEL JULIEN
Mme/m ADRIEN FARRANDS
Mme/m Elsa Rouiller`;

// Liste des mots-clés d'adresse
const addressKeywords = [
    'rue', 'avenue', 'boulevard', 'place', 'chemin', 'route',
    'square', 'impasse', 'allée', 'esplanade', 'passage'
];

// Listes pour stocker les noms complets et les adresses
const _fullNames = [];
const _addresses = [];
const _mapPoints = [];
const _selectedMarkers = [];

function cleanAddress(address) {
    return address.replace(/[“”>]/g, '').trim(); // Supprime les “, ” et >
}
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

    // Création du marqueur et ajout à la carte
    var marker = L.marker([coordinates.lat, coordinates.lng]).addTo(map);
    marker.bindPopup(`<b>${info}</b>`).openPopup();

    // Propriété pour suivre si le marqueur a déjà été sélectionné
    marker.isSelected = false;

    marker.on('click', function() {
        // Vérifie si le marqueur a déjà été sélectionné
        if (marker.isSelected) {
            alert("Ce marqueur a déjà été sélectionné.");
            return; // Ne rien faire si le marqueur est déjà sélectionné
        }

        let index = linkedArray.findIndex(data => data.address === info);

        if(boolOCR){
            sortDeliveryArray.push(linkedArray[index]);
            linkedArray.splice(index, 1);
            console.log(sortDeliveryArray)
            console.log(linkedArray)
            selectedAddresses.push(info);
            selectedCol2Values.push(sortDeliveryArray[sortDeliveryArray.length-1].name);
            markers.push(marker);
        }else{
            selectedAddresses.push(info);
            selectedCol2Values.push(col2);
            markers.push(marker);
        }
        // Marquer le marqueur comme sélectionné
        marker.isSelected = true;

        // Changer l'icône du marqueur
        marker.setIcon(L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/64/64572.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
        }));

        
        

        document.querySelector('#undoButton').disabled = false;

        // Vérifie si vous avez atteint 9 sélections
        if (selectedAddresses.length === 9) {
            if (confirm("Vous avez sélectionné 9 adresses. Voulez-vous continuer ?")) {
                // Supprime les marqueurs de la carte après confirmation
                markers.forEach(marker => {
                    map.removeLayer(marker);
                });
                markers = []; // Réinitialise la liste des marqueurs
                
                generateGoogleMapsUrl();
                //generateCol2Div();
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
                    marker.isSelected = false; // Réinitialiser la sélection
                });

                // Réinitialiser la liste des adresses sélectionnées pour permettre une nouvelle sélection
                selectedAddresses = [];
                selectedCol2Values = [];
            }
        } else if (selectedAddresses.length % 9 === 0 && selectedAddresses.length > 0) {
            // Vérifie si le nombre total d'adresses sélectionnées est un multiple de 9 et génère l'URL
            if (confirm(`Vous avez sélectionné ${selectedAddresses.length} adresses. Voulez-vous générer l'URL ?`)) {
                generateGoogleMapsUrl();
                //generateCol2Div();
                selectedAddressesStorage.push([...selectedAddresses]);
                selectedAddresses = []; // Réinitialise les adresses sélectionnées
                selectedCol2Values = [];
            }
        }
    });

}

// Votre fonction d'annulation
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

                        // Réinitialisation de la propriété isSelected
                        marker.isSelected = false; 

                        marker.on('click', function() {
                            // Vérifie si le marqueur a déjà été sélectionné
                            if (marker.isSelected) {
                                alert("Ce marqueur a déjà été sélectionné.");
                                return; // Ne rien faire si le marqueur est déjà sélectionné
                            }

                            // Marquer le marqueur comme sélectionné
                            marker.isSelected = true;

                            // Changer l'icône du marqueur
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

        var tableBody = document.querySelector('#addressTable tbody');
    if (tableBody.lastChild) {
        tableBody.removeChild(tableBody.lastChild);
    }

    // Gestion de l'activation/désactivation du bouton undo
    if (tableBody.children.length === 0) {
        document.querySelector('#undoButton').disabled = true;
    }
    }
}


function generateGoogleMapsUrl() {
    var urlBase = "https://www.google.fr/maps/dir/";
    var concatenatedAddresses = selectedAddresses.join('/');
    var fullUrl = urlBase + concatenatedAddresses;

    // Create a new row for the table
    var tableBody = document.querySelector('#addressTable tbody');
    var newRow = document.createElement('tr');

    // Add a numbered cell
    var rowNumber = tableBody.children.length + 1; // Calculate the row number
    
    // Create the ordered list for the second column
    var ol = document.createElement('ol');
    selectedCol2Values.forEach(function(value) {
        var li = document.createElement('li');
        li.textContent = value + "\n";
        ol.appendChild(li);
    });

    // Create table cells
    var numberCell = `<td>${rowNumber}</td>`;
    var olCell = document.createElement('td');
    olCell.appendChild(ol); // Add the ordered list to the cell
    var urlCell = `<td><a href="${fullUrl}" target="_blank">${fullUrl}</a></td>`;

    // Construct the row with the first cell, ordered list cell, and URL cell
    newRow.innerHTML = numberCell;
    newRow.appendChild(olCell); // Append the second cell containing the ordered list
    newRow.innerHTML += urlCell;

    // Append the new row to the table body
    tableBody.appendChild(newRow);
}


function generateCol2Div() {
    var col2Div = document.createElement('div');
    col2Div.className = 'concat-container';

    // Crée un tableau pour afficher les colonnes
    var table = document.createElement('table');
    var headerRow = table.insertRow();

    // Crée les en-têtes du tableau
    var header1 = headerRow.insertCell(0);
    var header2 = headerRow.insertCell(1);
    header1.textContent = 'Demandes'; // Titre de la première colonne
    header2.textContent = 'URLs'; // Titre de la seconde colonne

    // Remplis le tableau avec les données
    selectedCol2Values.forEach((value, index) => {
        var row = table.insertRow();
        var demandCell = row.insertCell(0);
        var urlCell = row.insertCell(1);
        demandCell.textContent = value; // Adresse de la colonne 2
        urlCell.innerHTML = `<a href="${generateGoogleMapsUrl(value)}" target="_blank">${generateGoogleMapsUrl(value)}</a>`; // URL correspondante
    });

    // Ajoute le tableau au conteneur
    col2Div.appendChild(table);
    document.querySelector('#concatCol2Container').appendChild(col2Div);
}

// Assurez-vous que le conteneur pour le tableau est défini dans votre HTML
// <div id="googleMapsUrls"></div>
// <div id="concatCol2Container"></div>
// <table id="urlTable"></table>


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
// Gestion de l'extraction de texte à partir d'images avec Tesseract.js
document.querySelector('#imageFileInput').addEventListener('change', function(event) {
    const files = event.target.files; // Récupère tous les fichiers sélectionnés
    let combinedText = ''; // Accumulateur pour le texte extrait

    if (files.length > 0) {
        const promises = Array.from(files).map(file => {
            return Tesseract.recognize(
                file,
                'eng', // Définir la langue pour l'OCR
            ).then(({ data: { text } }) => {
                console.log(text); // Affiche le texte extrait dans la console
                combinedText += text + '\n'; // Ajoute le texte extrait à l'accumulateur
            }).catch(err => {
                console.error('Erreur lors de l\'extraction du texte:', err);
            });
        });

        // Une fois que toutes les promesses sont résolues, traiter le texte combiné
        Promise.all(promises).then(() => {
            processRecognizedText(combinedText); // Appel à la fonction pour traiter le texte reconnu
        });
    }
});

// Ajout de l'événement pour le bouton de redémarrage
document.querySelector('#restartButton').addEventListener('click', restartApplication);

function restartApplication() {
    // reload the current page
window.location.reload();

}

document.querySelector('#validateListButton').addEventListener('click', function() {
    // Vérifiez si des adresses sont sélectionnées
    if (selectedAddresses.length === 0) {
        alert("Aucune adresse sélectionnée pour valider.");
        return;
    }

    // Générer l'URL et les éléments associés
    generateGoogleMapsUrl();
    // generateCol2Div();
    
    // Ajouter les adresses sélectionnées à la mémoire pour la restauration si nécessaire
    selectedAddressesStorage.push([...selectedAddresses]);
    
    // Réinitialiser les listes
    selectedAddresses = [];
    selectedCol2Values = [];
    markers.forEach(marker => {
        map.removeLayer(marker); // Supprime les marqueurs de la carte
    });
    markers = []; // Réinitialise la liste des marqueurs
});


// Fonction pour traiter le texte reconnu
async function processRecognizedText(recognizedText) {
    boolOCR = true
    const lines = recognizedText.split('\n');
    console.log(lines);

    //Sort name by first methode
    const selectedPreviousElements = await lines.filter((line, index, array) => {
        if ( array[index + 2] && array[index + 2].startsWith(">") && array[index + 1].length == 0) {
            return true;
        } else if (array[index + 1] && array[index + 1].startsWith(">") && array[index].includes("Mme/m")) {
            return true;
        } else if (array[index + 2] && array[index + 2].startsWith(">") && !array[index-1].includes("Mme/m") && array[index].includes("Mme/m")) {
            return true;
        }
        return false;
    });

    console.log(selectedPreviousElements);

    //Sort name by second methode
    await lines.forEach(line => {
        const titleMatch = line.match(fullNameWithTitleRegex);
        
        if (titleMatch) {
            _fullNames.push(titleMatch[0].trim());
        }

        // Recherche des adresses
        addressKeywords.forEach(keyword => {
            if (line.toLowerCase().includes(keyword)) {
                // Enlève caractères spéciaux
                const address = cleanAddress(line.trim());
                _addresses.push(address);
            }
        });
    });

    
    
    console.log(_addresses)
    // Ajout des marqueurs pour chaque adresse trouvée
    await _addresses.forEach((address, index) => {
        const col2 = _fullNames[index] || selectedPreviousElements[index]; // Utilisation d'une valeur par défaut si aucune valeur n'est trouvée
        getCoordinates(address)
            .then(coords => {
                addMarkerToMap(address, col2, coords);
            })
            .catch(error => {
                console.error(`Erreur lors du géocodage de l'adresse ${address}:`, error);
            });
    });
    await mergeArray(selectedPreviousElements);
}

function mergeArray(selectedPreviousElements){
    for (let i = 0; i < _addresses.length; i++) {
        linkedArray.push({ address: _addresses[i], name: selectedPreviousElements[i] });
    }
    
    console.log( linkedArray);
}


document.getElementById('tsfButton').addEventListener('click', function() {
    showFileInput('image');
});

document.getElementById('otherButton').addEventListener('click', function() {
    showFileInput('csv');
});

function showFileInput(type) {
    // Masquer le menu
    document.getElementById('menuContainer').style.visibility = 'hidden';
    // Afficher les inputs
    document.getElementById('fileInputs').style.visibility = 'visible';
    // Afficher l'input correspondant
    if (type === 'image') {
        document.getElementById('imageFileInput').style.display = 'block';
        document.getElementById('csvFileInput').style.display = 'none';
    } else {
        document.getElementById('csvFileInput').style.display = 'block';
        document.getElementById('imageFileInput').style.display = 'none';
    }
}

document.getElementById('csvFileInput').addEventListener('change', function(event) {
    showMapAndControls();
});

document.getElementById('imageFileInput').addEventListener('change', function(event) {
    showMapAndControls();
});

function showMapAndControls() {
    // Afficher la carte
    document.getElementById('mapContainer').style.visibility = 'visible';
    // Masquer les inputs
    document.getElementById('fileInputs').style.visibility = 'hidden';
    // Vous pouvez ajouter d'autres actions ici (ex: afficher des boutons de contrôle)
}

// Votre code pour afficher la carte et gérer les événements...