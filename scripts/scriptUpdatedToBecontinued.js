//var apiKey = 'de012302a8b6464691dbd1df48f474fe';
//var apiKey = 'fc1af9eaec3c47c9b31d0dd09e0dc933';

var map = L.map('map').setView([48.8566, 2.3522], 12); // Coordonnées pour centrer sur la France

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

var apiKey = 'de012302a8b6464691dbd1df48f474fe';
var selectedAddresses = [];
var selectedNamesValues = [];
var markers = [];
var selectedAddressesStorage = [];
var selectedNamesStorage = [];
var sortDeliveryArray = [];
let linkedArray = [];
const fullNameWithTitleRegex = /(Mme\/m|M|Mme)\s+([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)*)/g;
const orderNumberDHL = /(000|JJD01|JJD00|JVGL|GLS)/;
let boolOCR = false;
let selectedPreviousElements;

//Liste des mots-clés d'adresse
const addressKeywords = [
    'rue', 'avenue', 'boulevard', 'place', 'chemin', 'route',
    'square', 'impasse', 'allée', 'esplanade', 'passage', 'villa',
    'quai', 'cité', 'cours', 'galerie', 'îlot', 'porte', 'faubourg',
];

const refPackKeywords = [
    'LORL', 'LORP', 'TFA', 'LORN'
];

// Listes pour stocker les noms complets et les adresses
const _fullNames = [];
const _addresses = [];
const _mapPoints = [];
const _selectedMarkers = [];
let countPeople = 1;

function cleanAddress(address) {
    return address.replace(/["">]/g, '').trim(); // Supprime les ", " et >
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

function attachMarkerClickEvent(marker, addrress, name, action) {
    marker.on('click', function() {
        if (marker.isSelected) {
            alert("Ce marqueur a déjà été sélectionné.");
            return;
        }
        
        console.log("attachMarkerClickEvent --- marker.on");
        let index = linkedArray.findIndex(data => data.name === name);
       
        if (boolOCR && index !== -1)  {
            sortDeliveryArray.push(linkedArray[index]);
            selectedAddresses.push(addrress);
            selectedNamesValues.push(linkedArray[index].name);
            console.log(selectedNamesValues);
            markers.push(marker);
            console.log("here1");
        } else {
            selectedAddresses.push(addrress);
            selectedNamesValues.push(name);
            markers.push(marker);
            console.log("here2");
        }

        marker.isSelected = true;

        marker.setIcon(L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/64/64572.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
        }));

        if (selectedAddresses.length === 8) {
            if (confirm("Vous avez sélectionné 8 adresses. Voulez-vous continuer ?")) {
                document.querySelector('#addressTable').style.display = 'block';
                markers.forEach(marker => {
                    map.removeLayer(marker);
                });
                markers = [];
                generateGoogleMapsUrl();
                selectedAddressesStorage.push([...selectedAddresses]);
                selectedNamesStorage.push([...selectedNamesValues]);
                selectedAddresses = [];
                selectedNamesValues = [];
                console.log("ici");
            } else {
                markers.forEach(marker => {
                    marker.setIcon(L.icon({
                        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                    }));
                    marker.isSelected = false; 
                });
                selectedAddresses = [];
                selectedNamesValues = [];
            }
        } else if (selectedAddresses.length % 8 === 0 && selectedAddresses.length > 0) {
            if (confirm(`Vous avez sélectionné ${selectedAddresses.length} adresses. Voulez-vous générer l'URL ?`)) {
                generateGoogleMapsUrl();
                selectedAddressesStorage.push([...selectedAddresses]);
                selectedNamesStorage.push([...selectedNamesValues]);
                selectedAddresses = [];
                selectedNamesValues = [];
            }
        }
    });
}
 
function addMarkerToMap(address, name, coordinates) {
    if (selectedAddresses.length >= 8) {
        alert("Vous avez déjà sélectionné 8 adresses. Veuillez annuler une sélection avant d'en ajouter d'autres.");
        return;
    } 

    var marker = L.marker([coordinates.lat, coordinates.lng]).addTo(map);
    marker.bindPopup(`<b>${address} \n ${name}</b>`).openPopup();
    marker.isSelected = false;
    attachMarkerClickEvent(marker, address, name, "add");
}

async function undoGroupSelected() {
    if (await selectedAddressesStorage.length > 0) {
        var lastGroupAddress = await selectedAddressesStorage.pop();
        let lastGroupName = await selectedNamesStorage.pop();
        
        await lastGroupAddress.forEach((address, index) => {
            getCoordinates(address)
                .then(coords => {
                    let name = lastGroupName[index];
                    var marker = L.marker([coords.lat, coords.lng]).addTo(map);
                    marker.bindPopup(`<b>${address} \n ${name}</b>`).openPopup();
                     
                    marker.setIcon(L.icon({
                        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                    })); 

                    marker.isSelected = false; 
                    console.log(countPeople = countPeople - 1);
                    attachMarkerClickEvent(marker, address, name, "undo");
                });
        });

        var tableBody = document.querySelector('#addressTable tbody');
        if (tableBody.lastChild) {
            tableBody.removeChild(tableBody.lastChild);
        }

        if (tableBody.children.length === 0) {
            document.querySelector('#undoGroupSelectedButton').style.display = "none";
            document.querySelector('#fusion').style.display = "none";
            document.querySelector('#copyButton').style.display = "none";
        }
    }
}

function generateGoogleMapsUrl() {
    var urlBase = "https://www.google.fr/maps/dir/paris, france/";
    var concatenatedAddresses = selectedAddresses.join('/');
    var fullUrl = urlBase + concatenatedAddresses;

    var tableBody = document.querySelector('#addressTable tbody');
    var newRow = document.createElement('tr');

    var rowNumber = tableBody.children.length + 1;

    var liElements = '';
    selectedNamesValues.forEach(function(value, index) {
        liElements += `<li><a href="${urlBase +selectedAddresses[index]}">${countPeople} - ${value}</a></li>`;
        countPeople++;
    });

    var numberCell = `<td>${rowNumber}</td>`;
    var listCell = `<td>${liElements}</td>`;
    var urlCell = `<td><a href="${fullUrl}" target="_blank">${fullUrl}</a></td>`;

    newRow.innerHTML = numberCell + listCell + urlCell;
    tableBody.appendChild(newRow);
}

function generateNameDiv() {
    var nameDiv = document.createElement('div');
    nameDiv.className = 'concat-container';

    var table = document.createElement('table');
    var headerRow = table.insertRow();

    var header1 = headerRow.insertCell(0);
    var header2 = headerRow.insertCell(1);
    header1.textContent = 'Demandes';
    header2.textContent = 'URLs';

    selectedNamesValues.forEach((value, index) => {
        var row = table.insertRow();
        var demandCell = row.insertCell(0);
        var urlCell = row.insertCell(1);
        demandCell.textContent = value;
        urlCell.innerHTML = `<a href="${generateGoogleMapsUrl(value)}" target="_blank">${generateGoogleMapsUrl(value)}</a>`;
    });

    nameDiv.appendChild(table);
    document.querySelector('#concatnameContainer').appendChild(nameDiv);
}

document.querySelector('#undoGroupSelectedButton').addEventListener('click', undoGroupSelected);

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
                        console.log(`${col3}+ ${col4}+ ${col5}`);
                        console.error(`Erreur lors du géocodage de l'information ${info}:`, error);
                    });
            });
        },
        error: function(error) {
            console.error('Erreur lors du parsing du fichier CSV :', error);
        }
    });
});

document.querySelector('#imageFileInput').addEventListener('change', function(event) {
    const files = event.target.files;
    let combinedText = '';

    if (files.length > 0) {
        const promises = Array.from(files).map(file => {
            return Tesseract.recognize(
                file,
                'eng',
            ).then(({ data: { text } }) => {
                console.log(text);
                combinedText += text + '\n';
            }).catch(err => {
                console.error('Erreur lors de l\'extraction du texte:', err);
            });
        });

        Promise.all(promises).then(() => {
            processRecognizedText(combinedText);
        });
    }
});

function processRecognizedText(text) {
    boolOCR = true;
    const lines = text.split('\n');
    let currentName = '';
    let currentAddress = '';
    let currentOrder = '';

    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine === '') return;

        const nameMatch = trimmedLine.match(fullNameWithTitleRegex);
        const orderMatch = trimmedLine.match(orderNumberDHL);

        if (nameMatch) {
            if (currentName && currentAddress) {
                _fullNames.push(currentName);
                _addresses.push(currentAddress);
                linkedArray.push({ name: currentName, address: currentAddress, order: currentOrder });
            }
            currentName = nameMatch[0];
            currentAddress = '';
            currentOrder = '';
        } else if (orderMatch) {
            currentOrder = orderMatch[0];
        } else if (addressKeywords.some(keyword => trimmedLine.toLowerCase().includes(keyword))) {
            currentAddress += (currentAddress ? ' ' : '') + trimmedLine;
        }
    });

    if (currentName && currentAddress) {
        _fullNames.push(currentName);
        _addresses.push(currentAddress);
        linkedArray.push({ name: currentName, address: currentAddress, order: currentOrder });
    }

    console.log(_addresses);

    _addresses.forEach((address, index) => {
        getCoordinates(address)
            .then(coords => {
                addMarkerToMap(address, _fullNames[index], coords);
                _mapPoints.push({ lat: coords.lat, lng: coords.lng });
            })
            .catch(error => {
                console.error(`Erreur lors du géocodage de l'adresse ${address}:`, error);
            });
    });
}

document.querySelector('#restartButton').addEventListener('click', restartApplication);

function restartApplication() {
    window.location.reload();
}

document.querySelector('#validateListButton').addEventListener('click', function() {
    if (selectedAddresses.length === 0) {
        alert("Aucune adresse sélectionnée pour valider.");
        return;
    }
    document.querySelector('#addressTable').style.display = 'block';

    generateGoogleMapsUrl();
    
    selectedAddressesStorage.push([...selectedAddresses]);
    selectedNamesStorage.push([...selectedNamesValues]);
    
    selectedAddresses = [];
    selectedNamesValues = [];

    markers.forEach(marker => {
        map.removeLayer(marker);
    });
    markers = [];

    document.querySelector('#undoGroupSelectedButton').style.display = "inline-block";
    document.querySelector('#fusion').style.display = "inline-block";
    document.querySelector('#copyButton').style.display = "inline-block";
});

document.querySelector('#copyButton').addEventListener('click', function() {
    var tableBody = document.querySelector('#addressTable tbody');
    var content = '';
    
    for (var i = 0; i < tableBody.rows.length; i++) {
        var row = tableBody.rows[i];
        var cells = row.cells;
        
        content += cells[0].textContent + '\t';
        
        var listItems = cells[1].querySelectorAll('li');
        for (var j = 0; j < listItems.length; j++) {
            content += listItems[j].textContent + '\n';
        }
        
        content += cells[2].textContent + '\n\n';
    }
    
    navigator.clipboard.writeText(content).then(function() {
        alert('Contenu copié dans le presse-papiers !');
    }, function(err) {
        console.error('Erreur lors de la copie : ', err);
    });
});

document.querySelector('#fusion').addEventListener('click', function() {
    var tableBody = document.querySelector('#addressTable tbody');
    var allAddresses = [];
    var allNames = [];
    
    for (var i = 0; i < tableBody.rows.length; i++) {
        var row = tableBody.rows[i];
        var listItems = row.cells[1].querySelectorAll('li');
        
        for (var j = 0; j < listItems.length; j++) {
            var parts = listItems[j].textContent.split(' - ');
            if (parts.length > 1) {
                allNames.push(parts[1]);
                var addressLink = listItems[j].querySelector('a');
                if (addressLink) {
                    var addressPart = addressLink.href.split('/').pop();
                    allAddresses.push(decodeURIComponent(addressPart));
                }
            }
        }
    }
    
    var urlBase = "https://www.google.fr/maps/dir/paris, france/";
    var concatenatedAddresses = allAddresses.join('/');
    var fullUrl = urlBase + concatenatedAddresses;
    
    var newRow = document.createElement('tr');
    var numberCell = document.createElement('td');
    numberCell.textContent = tableBody.rows.length + 1;
    
    var namesCell = document.createElement('td');
    var namesList = document.createElement('ul');
    allNames.forEach(function(name, index) {
        var listItem = document.createElement('li');
        var link = document.createElement('a');
        link.href = urlBase + allAddresses[index];
        link.textContent = (index + 1) + ' - ' + name;
        listItem.appendChild(link);
        namesList.appendChild(listItem);
    });
    namesCell.appendChild(namesList);
    
    var urlCell = document.createElement('td');
    var urlLink = document.createElement('a');
    urlLink.href = fullUrl;
    urlLink.textContent = fullUrl;
    urlLink.target = '_blank';
    urlCell.appendChild(urlLink);
    
    newRow.appendChild(numberCell);
    newRow.appendChild(namesCell);
    newRow.appendChild(urlCell);
    
    tableBody.appendChild(newRow);
});

let boolDisplayongFullScreenTAble = false;
let thirdchildOfThead = document.querySelector('thead').children[0].children[2];
console.log(thirdchildOfThead);
thirdchildOfThead.addEventListener('click', function(event) {
    if (window.innerWidth < 900 && !boolDisplayongFullScreenTAble) {
        document.getElementById('addressTableContainer').animate(
            [{ top: "65%" }, { top: '15%' }],
            { duration: 1500 }
        );
        document.querySelector('#addressTableContainer').style.top = "15%";
        boolDisplayongFullScreenTAble = true;
    } else {
        document.getElementById('addressTableContainer').animate(
            [{ top: "15%" }, { top: '65%' }],
            { duration: 1500 }
        );
        document.querySelector('#addressTableContainer').style.top = "65%";
        boolDisplayongFullScreenTAble = false;
    }
});

window.addEventListener('resize', function() {
    if (window.innerWidth >= 900) {
        document.querySelector('#addressTableContainer').style.top = "0%";
    } else {
        if (!boolDisplayongFullScreenTAble) {
            document.querySelector('#addressTableContainer').style.top = "65%";
        }
    }
});

function initializeApp() {
    document.querySelector('#addressTableContainer').style.display = 'none';
}

initializeApp();