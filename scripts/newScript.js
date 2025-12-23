const apiKey = 'de012302a8b6464691dbd1df48f474fe';
const map = L.map('map', { zoomControl: false }).setView([48.8566, 2.3522], 12);

// Fond de carte sombre
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

let selectedPoints = [];
let allMarkers = [];
let groupedResults = [];
let expectedCount = 0;
let platform = 'TSF';

// --- UI Logic ---
function toggleSheet() {
    document.getElementById('bottomSheet').classList.toggle('open');
}

function prepareUpload(type) {
    platform = type === 'image' ? 'TSF' : 'Other';
    document.getElementById('tsfBtn').classList.toggle('active', type === 'image');
    document.getElementById('otherBtn').classList.toggle('active', type === 'csv');
    document.getElementById(type === 'image' ? 'imgInput' : 'csvInput').click();
}

// --- Corrélation & OCR ---
document.getElementById('imgInput').onchange = () => {
    document.getElementById('correlationModal').style.display = 'flex';
};

async function startProcessing() {
    expectedCount = parseInt(document.getElementById('expectedCount').value);
    document.getElementById('correlationModal').style.display = 'none';
    
    const files = document.getElementById('imgInput').files;
    let combinedText = "";
    
    for (let file of files) {
        const { data: { text } } = await Tesseract.recognize(file, 'fra+eng');
        combinedText += text + "\n";
    }
    processText(combinedText);
}

// Logique simplifiée d'extraction (basée sur ton code original)
function processText(text) {
    const lines = text.split('\n').filter(l => l.trim().length > 5);
    let found = 0;
    
    lines.forEach(async (line) => {
        if (line.includes('rue') || line.includes('avenue') || line.includes('boulevard')) {
            await addAddressToMap(line, "Client OCR");
            found++;
        }
    });

    setTimeout(() => {
        if (found < expectedCount) {
            alert(`Attention: seulement ${found} adresses trouvées sur ${expectedCount} attendues.`);
        }
    }, 2000);
}

// --- Map Logic ---
async function addAddressToMap(address, name) {
    try {
        const resp = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${apiKey}`);
        const data = await resp.json();
        if (data.results.length > 0) {
            const pos = data.results[0].geometry;
            const marker = L.marker([pos.lat, pos.lng], {
                icon: L.divIcon({ className: '', html: `<div class="m-icon" style="background:#999"></div>` })
            }).addTo(map);

            marker.data = { address, name, pos };
            marker.on('click', () => toggleSelection(marker));
            allMarkers.push(marker);
        }
    } catch (e) { console.error(e); }
}

function toggleSelection(marker) {
    const index = selectedPoints.indexOf(marker);
    if (index > -1) {
        selectedPoints.splice(index, 1);
        marker.getElement().querySelector('.m-icon').style.background = '#999';
    } else {
        if (selectedPoints.length >= 8) return alert("Maximum 8 points");
        selectedPoints.push(marker);
        marker.getElement().querySelector('.m-icon').style.background = '#3b82f6';
    }
    updateUI();
}

function updateUI() {
    const count = selectedPoints.length;
    document.getElementById('selectionBadge').textContent = `${count} / 8`;
    const btn = document.getElementById('validateBtn');
    btn.textContent = `Valider la sélection (${count}/8)`;
    btn.classList.toggle('disabled', count === 0);
}

// --- Validation & Export ---
function validateGroup() {
    if (selectedPoints.length === 0) return;
    
    const group = selectedPoints.map(m => m.data);
    groupedResults.push(group);
    
    const tbody = document.querySelector('#addressTable tbody');
    const urlBase = "https://www.google.fr/maps/dir/";
    const fullUrl = urlBase + group.map(p => encodeURIComponent(p.address)).join('/');
    
    const row = `<tr>
        <td>${groupedResults.length}</td>
        <td><a href="${fullUrl}" target="_blank" style="color:var(--primary)">Ouvrir l'itinéraire (${group.length} arrêts)</a></td>
    </tr>`;
    
    tbody.innerHTML += row;
    
    // Reset selection
    selectedPoints.forEach(m => map.removeLayer(m));
    selectedPoints = [];
    updateUI();
    if (!document.getElementById('bottomSheet').classList.contains('open')) toggleSheet();
}

function copyAll() {
    let text = "";
    groupedResults.forEach((group, i) => {
        text += `GROUPE ${i+1}:\n`;
        group.forEach(p => text += `- ${p.name}: ${p.address}\n`);
    });
    navigator.clipboard.writeText(text);
    alert("Copié !");
}

// Gestion CSV
document.getElementById('csvInput').onchange = (e) => {
    Papa.parse(e.target.files[0], {
        header: true,
        complete: (results) => {
            results.data.forEach(row => {
                const addr = `${row.Adresse || ''} ${row.Ville || ''}`;
                if (addr.length > 5) addAddressToMap(addr, row.Nom || "Client");
            });
        }
    });
};