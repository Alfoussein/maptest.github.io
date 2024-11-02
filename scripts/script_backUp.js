//const apiKey = 'de012302a8b6464691dbd1df48f474fe';
//const apiKey = 'fc1af9eaec3c47c9b31d0dd09e0dc933';


let map = L.map('map').setView([48.8566, 2.3522], 12); // Coordonnées pour centrer sur la France

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const apiKey = 'de012302a8b6464691dbd1df48f474fe';
let selectedAddresses = [];
let selectedNamesValues = [];
let markers = [];
let selectedAddressesStorage = [];
let selectedNamesStorage = [];
let sortDeliveryArray = [];
let linkedArray = [];
const fullNameWithTitleRegex = /(Mme\/m|M|Mme)\s+([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)*)/g;
const orderNumberDHL = /(000|JJD01|JJD00|JVGL|GLS)/;
let boolOCR = false
let selectedPreviousElements;
let platform;
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

function attachMarkerClickEvent(marker, addrress, name, action) {

    marker.on('click', function() {
        // Vérifie si le marqueur a déjà été sélectionné
        if (marker.isSelected) {
            alert("Ce marqueur a déjà été sélectionné.");
            return; // Ne rien faire si le marqueur est déjà sélectionné
        }
        
        console.log("attachMarkerClickEvent --- marker.on")
        //Find 
        let index = linkedArray.findIndex(data => data.name === name);
       
        // Relate address and user in one array
        if (boolOCR && index !== -1)  {
            sortDeliveryArray.push(linkedArray[index]);
            //linkedArray.splice(index, 1);
            selectedAddresses.push(addrress);
            
            // selectedNamesValues.push(sortDeliveryArray[sortDeliveryArray.length - 1].name);
            selectedNamesValues.push(linkedArray[index].name);
            console.log(selectedNamesValues);
            markers.push(marker);
            console.log("here1")
        } else {

            selectedAddresses.push(addrress);
            selectedNamesValues.push(name);
            markers.push(marker);
            console.log("here2")
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

        //document.querySelector('#undoGroupSelectedButton').disabled = false;

        // Vérifie si vous avez atteint 9 sélections
        if (selectedAddresses.length === 8) {
            if (confirm("Vous avez sélectionné 8 adresses. Voulez-vous continuer ?")) {
                //document.querySelector('#addressTable').style.display = 'block';
                markers.forEach(marker => {
                    map.removeLayer(marker);
                });
                markers = [];
                generateGoogleMapsUrl(platform);
                selectedAddressesStorage.push([...selectedAddresses]);
                selectedNamesStorage.push([...selectedNamesValues]);
                selectedAddresses = [];
                selectedNamesValues = [];
                console.log("ici")
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
                generateGoogleMapsUrl(platform);
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

    if (selectedAddresses.length > 0) validateButton.style.zIndex = 2;

    // Création du marqueur et ajout à la carte
    let marker = L.marker([coordinates.lat, coordinates.lng]).addTo(map);
    marker.bindPopup(`<b>${address} \n ${name}</b>`).openPopup();

    // Propriété pour suivre si le marqueur a déjà été sélectionné
    marker.isSelected = false;

    attachMarkerClickEvent(marker, address, name, "add")

}

// Votre fonction d'annulation
async function undoGroupSelected() {

    if (await selectedAddressesStorage.length > 0) {
        let lastGroupAddress = await selectedAddressesStorage.pop(); // Prend le dernier tableau d'adresses
        let lastGroupName = await  selectedNamesStorage.pop()
        // console.log(selectedAddressesStorage);
        // selectedNamesValues = selectedNameStorage.pop();
        // console.log(selectedNamesValues);
        // Restauration des marqueurs du dernier tableau d'adresses
        await lastGroupAddress.forEach((address, index) => {
            getCoordinates(address)
                .then(coords => {
                    
                    let name = lastGroupName[index];
                    // Vérification si l'adresse est déjà présente
                    // if (!selectedAddresses.includes(address)) {
                        let marker = L.marker([coords.lat, coords.lng]).addTo(map);
                        //markers.push(marker);
                        marker.bindPopup(`<b>${address} \n ${name}</b>`).openPopup();
                         
                        marker.setIcon(L.icon({
                            iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                            iconSize: [25, 41],
                            iconAnchor: [12, 41],
                            popupAnchor: [1, -34],
                        })); 

                       

                        // Réinitialisation de la propriété isSelected
                        marker.isSelected = false; 
                        // selectedNamesValues = [];
                        console.log(countPeople = countPeople - 1)
                        attachMarkerClickEvent(marker, address, name, "undo")
                        
                    // }
                });
        });

        

        let tableBody = document.querySelector('#addressTable tbody');
        if (tableBody.lastChild) 
            tableBody.removeChild(tableBody.lastChild);

        if(addressListContainer.lastChild)
            addressListContainer.removeChild(addressListContainer.lastChild);

        // Gestion de l'activation/désactivation du bouton undo
        if (tableBody.children.length === 0) {
            undoButton.style.display = "none";
            fusionButton.style.zIndex = 0;
            copyButton.style.zIndex = 0;
        }

    }
}


function generateGoogleMapsUrl(platform) {
    let urlBase = "https://www.google.fr/maps/dir/paris, france/";
    let concatenatedAddresses = selectedAddresses.join('/');
    let fullUrl = urlBase + concatenatedAddresses;

    // Create a new row for the table
    let tableBody = document.querySelector('#addressTable tbody');
    let newRow = document.createElement('tr');

    // Add a numbered cell
    let rowNumber = tableBody.children.length + 1; // Calculate the row number

    // Create the list items directly
    let liElements = '';
    selectedNamesValues.forEach(function(name, index) {
        liElements += `<li><a href="${urlBase +selectedAddresses[index]}">${countPeople} - ${name}</a></li>`;
        countPeople++;
    });

    
    let numberCell = `<td>${rowNumber}</td>`;
    let listCell = `<td>${liElements}</td>`; // Directly add list items
    let urlCell = `<td><a href="${fullUrl}" target="_blank">${fullUrl}</a></td>`;
    console.log()
    // Create table cells
    if (platform == "other"){
        newRow.innerHTML = numberCell + listCell + urlCell;
    }else if (platform == "TSF"){
        newRow.innerHTML = listCell;
    }else
        newRow.innerHTML = numberCell + listCell + urlCell;   
    
    // Construct the row with the first cell, list items cell, and URL cell
    // Append the new row to the table body
    tableBody.appendChild(newRow);
    
}


let fusionButton = document.querySelector('#fusion');
let undoButton = document.querySelector('#undoGroupSelectedButton');
undoButton.addEventListener('click', undoGroupSelected);

document.querySelector('#csvFileInput').addEventListener('change', function(event) {
    let file = event.target.files[0];
    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: function(results) {
            let data = results.data;

            data.forEach(function(row) {
                let col2 = row[Object.keys(row)[1]];
                let col3 = row[Object.keys(row)[2]];
                let col4 = row[Object.keys(row)[3]];
                let col5 = row[Object.keys(row)[4]];

                let info = `${col3}, ${col4}, ${col5}`;
                console.log(info)
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
    //document.querySelector('#addressTable').style.display = 'block';

    // Générer l'URL et les éléments associés
    generateGoogleMapsUrl(platform);
    // generateNameDiv();
    
    // Ajouter les adresses sélectionnées à la mémoire pour la restauration si nécessaire
    selectedAddressesStorage.push([...selectedAddresses]);
    selectedNamesStorage.push([...selectedNamesValues]);
    // Réinitialiser les listes
    selectedAddresses = [];
    selectedNamesValues = [];
    markers.forEach(marker => {
        map.removeLayer(marker); // Supprime les marqueurs de la carte
    });
    markers = []; // Réinitialise la liste des marqueurs
    undoButton.style.display = "block";

    fusionButton.style.zIndex = "10";

});

fusionButton.addEventListener('click', () => { 
    copyButton.style.zIndex = "10" 
})



function deleteTheadChilds(){

    let addressTableContainer= document.querySelector('#addressTableContainer');  
    let trInThead =  addressTableContainer.children[0].children[0].children[0];
    trInThead.removeChild(trInThead.firstElementChild);
    trInThead.removeChild(trInThead.lastElementChild);

}






// Fonction pour traiter le texte reconnu
async function processRecognizedText(recognizedText) {
    boolOCR = true
    const lines = recognizedText.split('\n');
    console.log(lines);

   deleteTheadChilds();

    //console.log(trInThead.removeChild(trInThead.lastChild))
    //Sort name  first methode
    selectedPreviousElements = await lines.filter((line, index, array) => {
        if ( array[index + 2] 
            && array[index + 2].startsWith(">") 
            && array[index + 1].length == 0) {
            console.log(refPackKeywords)
            return true;

        } else if (array[index + 1] 
            && array[index + 1].startsWith(">") 
            && array[index].includes("Mme/m")) {
            console.log(refPackKeywords)
            return true;

        } else if (array[index + 2] 
            && array[index + 2].startsWith(">") 
            && !array[index-1].includes("Mme/m") 
            && array[index].includes("Mme/m")) {
            console.log(refPackKeywords)
            return true;

        }else if (array[index + 1] 
            && array[index + 1].startsWith(">") 
            && (array[index].includes("Mme/m") || refPackKeywords.some(keyword => array[index - 1].includes(keyword)))) {
            console.log(refPackKeywords)
            return true;
        }
        return false;
    });
  
    console.log(selectedPreviousElements);

    //Sort name second methode 
    await lines.forEach(line => {

        const titleMatch = line.match(fullNameWithTitleRegex);
        let firstIndex = -1;
        let firstKeyword = '';
        
        if (titleMatch) {
            _fullNames.push(titleMatch[0].trim());
        }

        // Recherche des adresses
        for (let keyword of addressKeywords) {
            //handle a string with multiple matches and ensure that only the first match is used, you can use the String.prototype.search()
            let index = line.toLowerCase().search(" "+keyword+" ");
                if (line.toLowerCase().startsWith(">")) {
                    if (index !== -1 && (firstIndex === -1 || index < firstIndex)) {
                        console.log(keyword);
                        // Enlève caractères spéciaux
                        const address = cleanAddress(line.trim());
                        _addresses.push(address);
                        firstIndex = index;
                        firstKeyword = keyword;
                    }
                }
        };
    });

    
    
    console.log(_addresses)
    // Ajout des marqueurs pour chaque adresse trouvée
    await mergeArrayOCR(selectedPreviousElements);
    await _addresses.forEach((address, index) => {
        const name = selectedPreviousElements[index]; // Utilisation d'une valeur par défaut si aucune valeur n'est trouvée
        getCoordinates(address)
            .then(coords => {
                addMarkerToMap(address, name, coords);
            })
            .catch(error => {
                console.error(`Erreur lors du géocodage de l'adresse ${address}:`, error);
            });
    });

}

function mergeArrayOCR(selectedPreviousElements){
    for (let i = 0; i < _addresses.length; i++) {
        linkedArray.push({ address: _addresses[i], name: selectedPreviousElements[i] });
    }
    console.log( linkedArray);
}

function displayanimation(){

    if (window.innerWidth < 900) {
        document.querySelector('#addressTableContainer').animate(
            [{ top: "100%" },{ top: '65%' } ],{
                // sync options
                duration: 1500,
                // iterations: Infinity
            })

        document.querySelector('#validateListButton').animate(
            [{ bottom: "0%" },{ bottom: '35%' } ],{
                // sync options
                duration: 1500,
                // iterations: Infinity
            })  
            document.querySelector('#undoGroupSelectedButton').animate(
                [{ bottom: "0%" },{ bottom: '35%' } ],{
                    // sync options
                    duration: 1500,
                    // iterations: Infinity
                })    
    }else{
        document.querySelector('#addressTableContainer').animate(
            [{ top: "100%" },{ top: '0%' } ],{
                // sync options
                duration: 1500,
                // iterations: Infinity
            })
    }
    
}

document.querySelector('#tsfButton').addEventListener('click', function() {
    showFileInput('image');
    platform = "TSF";
});

document.querySelector('#otherButton').addEventListener('click', function() {
    showFileInput('csv');
    platform = "Other"
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


fusionButton.addEventListener('click', function(event) {
    
    while (addressListContainer.firstChild) {
        addressListContainer.removeChild(addressListContainer.firstChild);
    }

    let allAddrresesArray = selectedAddressesStorage.flat()
    let allNamesArray = selectedNamesStorage.flat()
    generateListInHtml(allAddrresesArray, allNamesArray)
}); 

let addressListContainer = document.querySelector('#addressListContainer')

function generateListInHtml(allAddrresesArray, allNamesArray){

    let urlBase = "https://www.google.fr/maps/dir/paris, France/";


    while(allAddrresesArray.length >= 8){
        let newLDivElement = document.createElement('div');
        let newSpanElement = document.createElement('span');
        let newListElement = document.createElement('li');
        let addrressesSelected = allAddrresesArray.splice(0, 8);
        let namesSelected = allNamesArray.splice(0, 8);
        let concatenatedAddresses = addrressesSelected.join('/');
        let fullUrl = urlBase + concatenatedAddresses;
        let linkElements = `<a href="${fullUrl}">${fullUrl}</a>`
        let listElements;
        
        namesSelected.forEach(element => {
            listElements += `<a href="${fullUrl}">${element}</a>`;

        });
        console.log(fullUrl)

        newSpanElement.innerHTML = linkElements;
        newListElement.innerHTML = listElements;


        newLDivElement.appendChild(newSpanElement);
        newLDivElement.appendChild(newListElement);
        addressListContainer.appendChild(newLDivElement);
    }


    if(allAddrresesArray.length < 8 && allAddrresesArray.length > 0){
        let newLDivElement = document.createElement('div');
        let newSpanElement = document.createElement('span');

        let concatenatedAddresses = allAddrresesArray.join('/');
        let fullUrl = urlBase + concatenatedAddresses;
        let linkElements = `<a href="${fullUrl}">${fullUrl}</a>`
        let listElements;
        
        allNamesArray.forEach((element, index) => {
            let newListElement = document.createElement('li');
            listElements = `<a href="${allAddrresesArray[index]}">${element}</a>`;
            newListElement.innerHTML = listElements;
            newLDivElement.appendChild(newListElement);
   

        });
        console.log(fullUrl)

        newSpanElement.innerHTML = linkElements;

        newLDivElement.appendChild(newSpanElement);

        addressListContainer.appendChild(newLDivElement);
    }    


}

let copyButton = document.querySelector('#copyButton');


copyButton.addEventListener('click', function() {

    window.getSelection().removeAllRanges();
    let allLinks = '';

    addressListContainer.querySelectorAll('div').forEach(function(element) {
        console.log(element)
        element.querySelectorAll('a').forEach((link, index) =>{

            let parentName = link.parentElement.nodeName.toLocaleLowerCase() 
            console.log(parentName);
            if (parentName == "li") 
                allLinks += index + " - " +link.textContent + link.href+ '\n'
            else
                allLinks += link.href+ '\n'
            
        })
       // allLinks += link.href + '\n';
    });
 
    navigator.clipboard.writeText(allLinks).then(function() {
        alert('All links copied to clipboard');
    }).catch(function(err) {
        console.error('Unable to copy', err);
    });

    window.getSelection().removeAllRanges();
});


let boolDisplayongFullScreenTAble = false;
document.querySelector('thead').addEventListener('click', function(event) {
    
    
    if (window.innerWidth < 900 && !boolDisplayongFullScreenTAble ) {
        document.querySelector('#addressTableContainer').animate([{ top: "65%" },{ top: '15%' } ],{duration: 1500, }) 
        document.querySelector('#addressTableContainer').style.top = "15%";
        boolDisplayongFullScreenTAble  = true
    }
    else{
        document.querySelector('#addressTableContainer').animate([{ top: "15%" },{ top: '65%' } ],{duration: 1500, }) 
        document.querySelector('#addressTableContainer').style.top = "65%";
        boolDisplayongFullScreenTAble  = false
    }
    
}) 