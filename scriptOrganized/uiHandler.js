APP.ui = {
    setupHandlers: function() {
        document.querySelector('#undoGroupSelectedButton').addEventListener('click', APP.ui.undoGroupSelected);
        document.querySelector('#validateListButton').addEventListener('click', APP.ui.validateList);
        document.querySelector('#restartButton').addEventListener('click', APP.ui.restartApplication);
        document.querySelector('#tsfButton').addEventListener('click', () => APP.ui.showFileInput('image'));
        document.querySelector('#otherButton').addEventListener('click', () => APP.ui.showFileInput('csv'));
    },

    attachMarkerClickEvent: function(marker, info, name, action) {
        marker.on('click', function() {
            if (marker.isSelected) {
                alert("Ce marqueur a déjà été sélectionné.");
                return;
            }
            console.log("attachMarkerClickEvent --- marker.on");
            let index = APP.linkedArray.findIndex(data => data.address === info);
           
            if (APP.boolOCR && index !== -1)  {
                APP.sortDeliveryArray.push(APP.linkedArray[index]);
                APP.selectedAddresses.push(info);
                APP.selectedNameValues.push(APP.linkedArray[index].name);
                console.log(APP.selectedNameValues);
                APP.markers.push(marker);
                console.log("here1");
            } else {
                APP.selectedAddresses.push(info);
                APP.selectedNameValues.push(name);
                APP.markers.push(marker);
                console.log("here2");
            }
            marker.isSelected = true;

            marker.setIcon(L.icon({
                iconUrl: 'https://cdn-icons-png.flaticon.com/512/64/64572.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
            }));

            if (APP.selectedAddresses.length === 9) {
                if (confirm("Vous avez sélectionné 9 adresses. Voulez-vous continuer ?")) {
                    document.querySelector('#addressTable').style.display = 'block';
                    APP.markers.forEach(marker => {
                        APP.map.instance.removeLayer(marker);
                    });
                    APP.markers = [];
                    APP.ui.generateGoogleMapsUrl();
                    APP.selectedAddressesStorage.push([...APP.selectedAddresses]);
                    APP.selectedAddresses = [];
                    APP.selectedNameValues = [];
                }
            } else if (APP.selectedAddresses.length % 9 === 0 && APP.selectedAddresses.length > 0) {
                if (confirm(`Vous avez sélectionné ${APP.selectedAddresses.length} adresses. Voulez-vous générer l'URL ?`)) {
                    APP.ui.generateGoogleMapsUrl();
                    APP.selectedAddressesStorage.push([...APP.selectedAddresses]);
                    APP.selectedAddresses = [];
                    APP.selectedNameValues = [];
                }
            }
        });
    },

        undoGroupSelected: async function() {
            if (APP.selectedAddressesStorage.length > 0) {
                var lastGroup = APP.selectedAddressesStorage.pop();
                lastGroup.forEach(address => {
                    APP.api.getCoordinates(address)
                        .then(coords => {
                            var marker = L.marker([coords.lat, coords.lng]).addTo(APP.map.instance);
                            marker.bindPopup(address).openPopup();
                            
                            marker.setIcon(L.icon({
                                iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                                iconSize: [25, 41],
                                iconAnchor: [12, 41],
                                popupAnchor: [1, -34],
                            })); 
    
                            marker.isSelected = false; 
                            APP.countPeople--;
                            console.log("Count People:", APP.countPeople);
                            APP.ui.attachMarkerClickEvent(marker, address, "", "add");
                        })
                        .catch(error => {
                            console.error('Erreur lors du géocodage de l\'adresse:', error);
                        });
                });
            }
            document.querySelector('#addressTable').style.display = 'none';
        },
    
        validateList: function() {
            APP.ui.generateGoogleMapsUrl();
            APP.selectedAddressesStorage.push([...APP.selectedAddresses]);
            APP.selectedAddresses = [];
            APP.selectedNameValues = [];
            APP.markers.forEach(marker => {
                APP.map.instance.removeLayer(marker);
            });
            APP.markers = [];
        },
    
        restartApplication: function() {
            location.reload();
        },
    
        showFileInput: function(type) {
            if (type === 'image') {
                document.getElementById('imageFileInput').click();
            } else if (type === 'csv') {
                document.getElementById('csvFileInput').click();
            }
        },
    
        generateGoogleMapsUrl: function() {
            var baseUrl = "https://www.google.com/maps/dir/";
            var waypoints = APP.selectedAddresses.map(encodeURIComponent).join('/');
            var fullUrl = baseUrl + waypoints;
    
            var outputDiv = document.getElementById('output');
            var linkElement = document.createElement('a');
            linkElement.href = fullUrl;
            linkElement.textContent = `Itinéraire pour le groupe ${APP.countPeople}`;
            linkElement.target = "_blank";
    
            outputDiv.appendChild(linkElement);
            outputDiv.appendChild(document.createElement('br'));
    
            APP.ui.displayAnimation();
            APP.countPeople++;
        },
    
        displayAnimation: function() {
            var outputDiv = document.getElementById('output');
            var animationContainer = document.createElement('div');
            animationContainer.className = 'animation-container';
            
            for (var i = 0; i < 5; i++) {
                var animationElement = document.createElement('div');
                animationElement.className = 'animation-element';
                animationContainer.appendChild(animationElement);
            }
            
            outputDiv.appendChild(animationContainer);
            
            setTimeout(function() {
                animationContainer.remove();
            }, 5000);
        }
    };