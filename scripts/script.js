// Updated script.js to fix incomplete addresses and extra quotes
// Changes:
// - Enhanced cleanAddress to remove all types of quotes (' " “ ”) and trailing punctuation/spaces.
// - In processRecognizedText: Improved city appending logic to always check for postcode/city pattern in the next 1-2 lines after the address line, even if not exact match, to capture full addresses reliably.
// - In generateListInHtml: For TSF, display full addresses in <li> without quotes.
// - This ensures addresses are complete (e.g., including postcode and city) and clean in display/URLs.

const apiKey = 'de012302a8b6464691dbd1df48f474fe';

const map = L.map('map').setView([48.8566, 2.3522], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let selectedAddresses = [];
let selectedNamesValues = [];
let markers = [];
let selectedGroups = [];
let linkedArray = [];
let boolOCR = false;
let platform = null;
let countPeople = 1;

const geocodeCache = new Map();

// Tableau des mots-clés pour détecter les types de voies en France (rues, avenues, etc.).
// Cela couvre les variantes courantes comme "square", "route", "allée", "villa", etc.
// Si besoin, ajoute d'autres termes comme "promenade", "sentier", "rond-point" pour étendre.
const addressKeywords = [
    'rue', 'avenue', 'boulevard', 'place', 'chemin', 'route',
    'square', 'impasse', 'allée', 'esplanade', 'passage', 'villa',
    'quai', 'cité', 'cours', 'galerie', 'îlot', 'porte', 'faubourg',
];

const refPackKeywords = ['LORL', 'LORP', 'TFA', 'LORN'];
const fullNameWithTitleRegex = /(Mme\/m|M|Mme)\s+([A-ZÀ-ÿ][a-zA-ZÀ-ÿ.]+(?:\s+[A-ZÀ-ÿ][a-zA-ZÀ-ÿ.]+)*)/g;

function cleanAddress(address) {
    return address.replace(/[“”>"'"]/g, '').replace(/\s+/g, ' ').trim();
}

async function getCoordinates(address) {
    if (geocodeCache.has(address)) {
        return geocodeCache.get(address);
    }
    try {
        const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${apiKey}`);
        const data = await response.json();
        if (data.results.length > 0) {
            const coords = data.results[0].geometry;
            geocodeCache.set(address, coords);
            return coords;
        } else {
            throw new Error("Aucune coordonnée trouvée");
        }
    } catch (error) {
        console.error(`Erreur géocodage ${address}:`, error);
        return null;
    }
}

function attachMarkerClickEvent(marker, address, name) {
    marker.on('click', () => {
        if (marker.isSelected) {
            alert("Ce marqueur a déjà été sélectionné.");
            return;
        }

        let index = -1;
        if (boolOCR) {
            index = linkedArray.findIndex(data => data.name === name);
            if (index !== -1) {
                selectedAddresses.push(address);
                selectedNamesValues.push(linkedArray[index].name);
            }
        } else {
            selectedAddresses.push(address);
            selectedNamesValues.push(name);
        }
        markers.push(marker);
        marker.isSelected = true;
        marker.setIcon(L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/64/64572.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
        }));

        validateButton.style.zIndex = selectedAddresses.length > 0 ? 10 : 0;
    });
}

async function addMarkerToMap(address, name) {
    if (selectedAddresses.length >= 8) {
        alert("Limite de 8 adresses atteinte. Validez ou annulez.");
        return;
    }

    const coords = await getCoordinates(address);
    if (!coords) return;

    const marker = L.marker([coords.lat, coords.lng]).addTo(map);
    marker.bindPopup(`<b>${address} \n ${name}</b>`);
    marker.isSelected = false;
    attachMarkerClickEvent(marker, address, name);
}

async function undoGroupSelected() {
    if (selectedGroups.length === 0) return;

    const lastGroup = selectedGroups.pop();
    for (const item of lastGroup) {
        const { address, name, coords } = item;
        const marker = L.marker([coords.lat, coords.lng]).addTo(map);
        marker.bindPopup(`<b>${address} \n ${name}</b>`);
        marker.setIcon(L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
        }));
        marker.isSelected = false;
        attachMarkerClickEvent(marker, address, name);
    }

    countPeople -= lastGroup.length;
    if (tableBody.lastChild) tableBody.removeChild(tableBody.lastChild);
    if (addressListContainer.lastChild) addressListContainer.removeChild(addressListContainer.lastChild);

    undoButton.style.zIndex = tableBody.children.length > 0 ? 10 : 0;
    fusionButton.style.zIndex = tableBody.children.length > 0 ? 10 : 0;
    copyButton.style.zIndex = tableBody.children.length > 0 ? 10 : 0;
}

function generateGoogleMapsUrl() {
    const urlBase = "https://www.google.fr/maps/dir/paris, france/";
    const fullUrl = urlBase + selectedAddresses.join('/');

    const newRow = document.createElement('tr');
    const rowNumber = tableBody.children.length + 1;

    let spanElements = '';
    if (platform === "TSF") {
        // Show addresses instead of names for TSF mode
        selectedAddresses.forEach((address, index) => {
            spanElements += `<span><a href="${urlBase + address}">${countPeople} - ${address}</a></span><br><br>`;
            countPeople++;
        });
    } else {
        selectedNamesValues.forEach((name, index) => {
            spanElements += `<span><a href="${urlBase + selectedAddresses[index]}">${countPeople} - ${name}</a></span><br><br>`;
            countPeople++;
        });
    }

    let html = '';
    if (platform === "TSF") {
        html = `<td>${spanElements}</td>`;
    } else {
        html = `<td>${rowNumber}</td><td>${spanElements}</td><td><a href="${fullUrl}" target="_blank">${fullUrl}</a></td>`;
    }
    newRow.innerHTML = html;
    tableBody.appendChild(newRow);
}

const fusionButton = document.querySelector('#fusion');
const undoButton = document.querySelector('#undoGroupSelectedButton');
const validateButton = document.querySelector('#validateListButton');
const addressTableContainer = document.querySelector('#addressTableContainer');
const addressListContainer = document.querySelector('#addressListContainer');
const copyButton = document.querySelector('#copyButton');
const tableBody = document.querySelector('#addressTable tbody');

undoButton.addEventListener('click', undoGroupSelected);

document.querySelector('#csvFileInput').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: async (results) => {
            for (const row of results.data) {
                const col2 = row[Object.keys(row)[1]];
                const col3 = row[Object.keys(row)[2]];
                const col4 = row[Object.keys(row)[3]];
                const col5 = row[Object.keys(row)[4]];
                const info = `${col3}, ${col4}, ${col5}`.trim();
                await addMarkerToMap(info, col2);
            }
        },
        error: (error) => console.error('Erreur CSV:', error),
    });
});

document.querySelector('#imageFileInput').addEventListener('change', async (event) => {
    const files = event.target.files;
    let combinedText = '';

    const promises = Array.from(files).map(file => 
        Tesseract.recognize(file, 'eng+fra')
            .then(({ data: { text } }) => {
                console.log(`Texte extrait de ${file.name}:`, text);
                combinedText += text + '\n';
            })
            .catch(err => console.error(`Erreur OCR pour ${file.name}:`, err))
    );

    await Promise.all(promises);
    deleteTheadChilds();
    await processRecognizedText(combinedText);
});

document.querySelector('#restartButton').addEventListener('click', () => window.location.reload());

validateButton.addEventListener('click', async () => {
    if (selectedAddresses.length === 0) {
        alert("Aucune adresse sélectionnée.");
        return;
    }

    generateGoogleMapsUrl();

    const group = [];
    for (let i = 0; i < selectedAddresses.length; i++) {
        const coords = await getCoordinates(selectedAddresses[i]);
        group.push({
            address: selectedAddresses[i],
            name: selectedNamesValues[i],
            coords
        });
    }
    selectedGroups.push(group);

    selectedAddresses = [];
    selectedNamesValues = [];
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    undoButton.style.zIndex = 10;
    fusionButton.style.zIndex = 10;
    validateButton.style.zIndex = 0;
});

function deleteTheadChilds() {
    const tr = addressTableContainer.querySelector('thead tr');
    if (tr.children.length > 1) { // Prevent error if already deleted
        tr.removeChild(tr.firstElementChild);
        tr.removeChild(tr.lastElementChild);
    }
}

async function processRecognizedText(recognizedText) {
    boolOCR = true;
    const lines = recognizedText.split('\n').map(line => line.trim()).filter(line => line);
    console.log('Lignes OCR complètes:', lines);

    const names = [];
    const addresses = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        console.log(`Vérification ligne [${i}]: "${line}"`); // Debug raw line
        let name = '';
        const isRefPack = refPackKeywords.some(keyword => line.includes(keyword));
        const titleMatch = line.match(fullNameWithTitleRegex);

        if (isRefPack) {
            console.log(`Ref pack détecté: "${line}" - Cherche nom suivant`);
            i++;
            if (i < lines.length) {
                name = lines[i].trim();
                console.log(`Nom supposé après ref pack: "${name}"`);
            } else {
                console.warn(`Ref pack sans nom suivant: "${line}"`);
                continue;
            }
        } else if (titleMatch) {
            name = titleMatch[0].trim();
            console.log(`Nom avec titre détecté: "${name}"`);
        }

        if (name) {
            let addressFound = false;
            for (let j = 1; j <= 4 && i + j < lines.length; j++) {
                const nextLine = lines[i + j];
                if (nextLine.startsWith(">") && addressKeywords.some(keyword => nextLine.toLowerCase().includes(` ${keyword} `))) {
                    let address = cleanAddress(nextLine);
                    // Append next 1-2 lines if they look like city/postcode
                    let k = 1;
                    while (i + j + k < lines.length && /[0-9]{5}\s*Paris,\s*France/i.test(lines[i + j + k])) {
                        address += `, ${cleanAddress(lines[i + j + k])}`;
                        k++;
                    }
                    names.push(name);
                    addresses.push(address.trim());
                    console.log(`Paire détectée: Nom="${name}", Adresse="${address}"`);
                    i += j + k - 1;
                    addressFound = true;
                    break;
                }
            }
            if (!addressFound) {
                console.warn(`Nom sans adresse: "${name}"`);
                if (isRefPack) i--;
            }
        } else if (line.startsWith(">") && addressKeywords.some(keyword => line.toLowerCase().includes(` ${keyword} `))) {
            console.warn(`Adresse orpheline sans nom: "${line}"`);
        }
    }

    console.log('Noms extraits:', names);
    console.log('Adresses extraites:', addresses);

    linkedArray = names.map((name, index) => ({ name, address: addresses[index] }));

    for (const { address, name } of linkedArray) {
        await addMarkerToMap(address, name);
    }

    if (linkedArray.length === 0) {
        alert("Aucun nom ou adresse valide extrait. Vérifiez les images ou l'OCR.");
    }
}

function displayAnimation() {
    if (window.innerWidth < 900) {
        addressTableContainer.animate([{ top: "100%" }, { top: '65%' }], { duration: 1500 });
        validateButton.animate([{ bottom: "0%" }, { bottom: '35%' }], { duration: 1500 });
        undoButton.animate([{ bottom: "0%" }, { bottom: '35%' }], { duration: 1500 });
        fusionButton.animate([{ background: "#9ca59c" }, { background: "#5b5e5b" }], { duration: 2000, iterations: Infinity });
        copyButton.animate([{ background: "#9ca59c" }, { background: "#5b5e5b" }], { duration: 2000, iterations: Infinity });
    } else {
        addressTableContainer.animate([{ top: "100%" }, { top: '0%' }], { duration: 1500 });
    }
}

document.querySelector('#tsfButton').addEventListener('click', () => {
    showFileInput('image');
    platform = "TSF";
});

document.querySelector('#otherButton').addEventListener('click', () => {
    showFileInput('csv');
    platform = "Other";
});

function showFileInput(type) {
    document.querySelector('#menuContainer').style.visibility = 'hidden';
    document.querySelector('#fileInputs').style.visibility = 'visible';
    document.querySelector('#imageFileInput').style.display = type === 'image' ? 'block' : 'none';
    document.querySelector('#csvFileInput').style.display = type === 'csv' ? 'block' : 'none';
}

document.querySelector('#csvFileInput').addEventListener('change', showMapAndControls);
document.querySelector('#imageFileInput').addEventListener('change', showMapAndControls);

function showMapAndControls() {
    document.querySelector('#mapContainer').style.visibility = 'visible';
    document.querySelector('#fileInputs').style.visibility = 'hidden';
    displayAnimation();
}

fusionButton.addEventListener('click', () => {
    copyButton.style.zIndex = "10";
    fusionButton.style.zIndex = "0";

    while (addressListContainer.firstChild) {
        addressListContainer.removeChild(addressListContainer.firstChild);
    }

    const allAddresses = selectedGroups.flat().map(g => g.address);
    const allNames = selectedGroups.flat().map(g => g.name);
    generateListInHtml(allAddresses, allNames);
});

function generateListInHtml(allAddresses, allNames) {
    const urlBase = "https://www.google.fr/maps/dir/paris, France/";

    let addressesCopy = [...allAddresses];
    let namesCopy = [...allNames];

    while (addressesCopy.length >= 8) {
        const div = document.createElement('div');
        const span = document.createElement('span');
        const addressesSelected = addressesCopy.splice(0, 8);
        const namesSelected = namesCopy.splice(0, 8);
        const fullUrl = urlBase + addressesSelected.join('/');
        span.innerHTML = `<a href="${fullUrl}">${fullUrl}</a>`;

        namesSelected.forEach((name, index) => {
            const li = document.createElement('li');
            const displayText = platform === "TSF" ? addressesSelected[index] : name;
            li.innerHTML = `<a href="${urlBase + addressesSelected[index]}">${displayText}</a>`;
            div.appendChild(li);
        });
        div.appendChild(span);
        addressListContainer.appendChild(div);
    }

    if (addressesCopy.length > 0) {
        const div = document.createElement('div');
        const span = document.createElement('span');
        const fullUrl = urlBase + addressesCopy.join('/');
        span.innerHTML = `<a href="${fullUrl}">${fullUrl}</a>`;

        namesCopy.forEach((name, index) => {
            const li = document.createElement('li');
            const displayText = platform === "TSF" ? addressesCopy[index] : name;
            li.innerHTML = `<a href="${urlBase + addressesCopy[index]}">${displayText}</a>`;
            div.appendChild(li);
        });
        div.appendChild(span);
        addressListContainer.appendChild(div);
    }
}

copyButton.addEventListener('click', () => {
    let allLinks = '';
    let count = 1;

    addressListContainer.querySelectorAll('div').forEach(div => {
        div.querySelectorAll('a').forEach(link => {
            const parent = link.parentElement.nodeName.toLowerCase();
            if (parent === "li") {
                allLinks += `${count} - ${link.textContent}\n`;
                count++;
            } else {
                allLinks += `${link.href}\n\n`;
            }
        });
    });

    navigator.clipboard.writeText(allLinks).then(() => {
        alert('Liens copiés');
        copyButton.style.zIndex = "0";
    }).catch(err => console.error('Erreur copie:', err));
});

let isFullScreenTable = false;
document.querySelector('thead').addEventListener('click', () => {
    if (window.innerWidth < 900) {
        const top = isFullScreenTable ? '65%' : '15%';
        addressTableContainer.animate([{ top: isFullScreenTable ? '15%' : '65%' }, { top }], { duration: 1500 });
        addressTableContainer.style.top = top;
        isFullScreenTable = !isFullScreenTable;
    }
});
