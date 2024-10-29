APP.map = {
    init: function() {
        APP.map.instance = L.map('map').setView([48.8566, 2.3522], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(APP.map.instance);
    },

    addMarker: function(info, name, coordinates) {
        if (APP.selectedAddresses.length >= 9) {
            alert("Vous avez déjà sélectionné 9 adresses. Veuillez annuler une sélection avant d'en ajouter d'autres.");
            return;
        } 

        var marker = L.marker([coordinates.lat, coordinates.lng]).addTo(APP.map.instance);
        marker.bindPopup(`<b>${info} \n ${name}</b>`).openPopup();
        marker.isSelected = false;
        APP.ui.attachMarkerClickEvent(marker, info, name, "add");
    }
};