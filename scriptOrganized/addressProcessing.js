APP.addressProcessing = {
    processRecognizedText: function(recognizedText) {
        const lines = recognizedText.split('\n');
        let currentName = '';
        let currentAddress = '';
        let selectedPreviousElements = [];

        lines.forEach(line => {
            if (APP.fullNameWithTitleRegex.test(line)) {
                if (currentName && currentAddress) {
                    APP._fullNames.push(currentName);
                    APP._addresses.push(currentAddress);
                    selectedPreviousElements.push(currentName);
                    currentAddress = '';
                }
                currentName = line.trim();
            } else if (APP.addressKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
                currentAddress += line.trim() + ' ';
            }
        });

        if (currentName && currentAddress) {
            APP._fullNames.push(currentName);
            APP._addresses.push(currentAddress);
            selectedPreviousElements.push(currentName);
        }

        APP._addresses.forEach(address => {
            APP.api.getCoordinates(address)
                .then(coords => {
                    APP._mapPoints.push(coords);
                    APP.map.addMarker(address, '', coords);
                })
                .catch(error => console.error('Erreur de géocodage:', error));
        });

        APP.addressProcessing.mergeArrayOCR(selectedPreviousElements);
        APP.boolOCR = true;
    },

    mergeArrayOCR: function(selectedPreviousElements) {
        for (let i = 0; i < APP._addresses.length; i++) {
            APP.linkedArray.push({ address: APP._addresses[i], name: selectedPreviousElements[i] });
        }
        console.log(APP.linkedArray);
    }
};