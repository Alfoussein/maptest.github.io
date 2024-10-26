//var apiKey = 'de012302a8b6464691dbd1df48f474fe';
//var apiKey = 'fc1af9eaec3c47c9b31d0dd09e0dc933';

var map = L.map('map').setView([48.8566, 2.3522], 12); // Coordonnées pour centrer sur la France

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

var apiKey = 'fc1af9eaec3c47c9b31d0dd09e0dc933';
var selectedAddresses = [];
var selectedNameValues = [];
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
let countPeople = 1;
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

function addMarkerToMap(info, name, coordinates) {
    if (selectedAddresses.length >= 9) {
        alert("Vous avez déjà sélectionné 9 adresses. Veuillez annuler une sélection avant d'en ajouter d'autres.");
        return;
    }

    // Création du marqueur et ajout à la carte
    var marker = L.marker([coordinates.lat, coordinates.lng]).addTo(map);
    marker.bindPopup(`<b>${info} \n ${name}</b>`).openPopup();

    // Propriété pour suivre si le marqueur a déjà été sélectionné
    marker.isSelected = false;

    marker.on('click', function() {
        // Vérifie si le marqueur a déjà été sélectionné
        if (marker.isSelected) {
            alert("Ce marqueur a déjà été sélectionné.");
            return; // Ne rien faire si le marqueur est déjà sélectionné
        }

        console.log("toto");
        let index = linkedArray.findIndex(data => data.address === info);

        //relate adress and user in one array
        if(boolOCR){
            console.log("toto2");

            sortDeliveryArray.push(linkedArray[index]);
            linkedArray.splice(index, 1);
            selectedAddresses.push(info);
            selectedNameValues.push(sortDeliveryArray[sortDeliveryArray.length-1].name);
            markers.push(marker);
        }else{
            console.log("toto3");

            selectedAddresses.push(info);
            selectedNameValues.push(name);
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
                document.querySelector('#addressTable').style.display = 'block';

                markers.forEach(marker => {
                    map.removeLayer(marker);
                });
                markers = []; // Réinitialise la liste des marqueurs
                
                generateGoogleMapsUrl();
                //generateNameDiv();
                selectedAddressesStorage.push([...selectedAddresses]);
                selectedAddresses = []; // Réinitialise les adresses sélectionnées
                selectedNameValues = [];
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
                selectedNameValues = [];
            }
        } else if (selectedAddresses.length % 9 === 0 && selectedAddresses.length > 0) {
            // Vérifie si le nombre total d'adresses sélectionnées est un multiple de 9 et génère l'URL
            if (confirm(`Vous avez sélectionné ${selectedAddresses.length} adresses. Voulez-vous générer l'URL ?`)) {
                generateGoogleMapsUrl();
                //generateNameDiv();
                selectedAddressesStorage.push([...selectedAddresses]);
                selectedAddresses = []; // Réinitialise les adresses sélectionnées
                selectedNameValues = [];
            }
        }
    });

}

// Votre fonction d'annulation
function undoSelection() {
    console.log(selectedAddressesStorage)

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
            //document.querySelector('#undoButton').disabled = true;
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

    // Create the list items directly
    var liElements = '';
    selectedNameValues.forEach(function(value) {
        liElements += `<li>${countPeople} - ${value}</li>`;
        countPeople++;
    });

    // Create table cells
    var numberCell = `<td>${rowNumber}</td>`;
    var listCell = `<td>${liElements}</td>`; // Directly add list items
    var urlCell = `<td><a href="${fullUrl}" target="_blank">${fullUrl}</a></td>`;

    // Construct the row with the first cell, list items cell, and URL cell
    newRow.innerHTML = numberCell + listCell + urlCell;

    // Append the new row to the table body
    tableBody.appendChild(newRow);
    
}



function generateNameDiv() {
    var nameDiv = document.createElement('div');
    nameDiv.className = 'concat-container';

    // Crée un tableau pour afficher les colonnes
    var table = document.createElement('table');
    var headerRow = table.insertRow();

    // Crée les en-têtes du tableau
    var header1 = headerRow.insertCell(0);
    var header2 = headerRow.insertCell(1);
    header1.textContent = 'Demandes'; // Titre de la première colonne
    header2.textContent = 'URLs'; // Titre de la seconde colonne

    // Remplis le tableau avec les données
    selectedNameValues.forEach((value, index) => {
        var row = table.insertRow();
        var demandCell = row.insertCell(0);
        var urlCell = row.insertCell(1);
        demandCell.textContent = value; // Adresse de la colonne 2
        urlCell.innerHTML = `<a href="${generateGoogleMapsUrl(value)}" target="_blank">${generateGoogleMapsUrl(value)}</a>`; // URL correspondante
    });

    // Ajoute le tableau au conteneur
    nameDiv.appendChild(table);
    document.querySelector('#concatnameContainer').appendChild(nameDiv);
}

// Assurez-vous que le conteneur pour le tableau est défini dans votre HTML
// <div id="googleMapsUrls"></div>
// <div id="concatnameContainer"></div>
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
                        console.log(`${col3}+ ${col4}+ ${col5}`)
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
    console.log("vide valid")
    document.querySelector('#addressTable').style.display = 'block';

    // Générer l'URL et les éléments associés
    generateGoogleMapsUrl();
    // generateNameDiv();
    
    // Ajouter les adresses sélectionnées à la mémoire pour la restauration si nécessaire
    selectedAddressesStorage.push([...selectedAddresses]);
    
    // Réinitialiser les listes
    selectedAddresses = [];
    selectedNameValues = [];
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

    //Sort name  first methode
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

    //Sort name second methode
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
        const name = _fullNames[index] || selectedPreviousElements[index]; // Utilisation d'une valeur par défaut si aucune valeur n'est trouvée
        getCoordinates(address)
            .then(coords => {
                addMarkerToMap(address, name, coords);
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

function displayanimation(){

    if (window.innerWidth < 900) {
        document.getElementById('addressTableContainer').animate(
            [{ top: "100%" },{ top: '65%' } ],{
                // sync options
                duration: 3000,
                // iterations: Infinity
            })

        document.getElementById('validateListButton').animate(
            [{ bottom: "0%" },{ bottom: '35%' } ],{
                // sync options
                duration: 3000,
                // iterations: Infinity
            })    
    }else{
        document.getElementById('addressTableContainer').animate(
            [{ top: "100%" },{ top: '0%' } ],{
                // sync options
                duration: 1500,
                // iterations: Infinity
            })
    }
    
}

document.querySelector('#tsfButton').addEventListener('click', function() {
    showFileInput('image');
});

document.querySelector('#otherButton').addEventListener('click', function() {
    showFileInput('csv');
});

function showFileInput(type) {
    // Masquer le menu
    document.querySelector('#menuContainer').style.visibility = 'hidden';
    // Afficher les inputs
    document.querySelector('#fileInputs').style.visibility = 'visible';
    // Afficher l'input correspondant
    if (type === 'image') {
        document.querySelector('#imageFileInput').style.display = 'block';
        document.querySelector('#csvFileInput').style.display = 'none';
    } else {
        document.querySelector('#csvFileInput').style.display = 'block';
        document.querySelector('#imageFileInput').style.display = 'none';
    }
}

document.querySelector('#csvFileInput').addEventListener('change', function(event) {
    showMapAndControls();
});

document.querySelector('#imageFileInput').addEventListener('change', function(event) {
    showMapAndControls();
});

function showMapAndControls() {
    // Afficher la carte
    document.querySelector('#mapContainer').style.visibility = 'visible';
    // Masquer les inputs
    document.querySelector('#fileInputs').style.visibility = 'hidden';
    // Vous pouvez ajouter d'autres actions ici (ex: afficher des boutons de contrôle)
    displayanimation();
    //document.querySelector('#addressTableContainer').style.zIndex = 10
}

