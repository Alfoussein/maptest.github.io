APP.fileHandlers = {
    setupInputs: function() {
        document.querySelector('#csvFileInput').addEventListener('change', APP.fileHandlers.handleCSVFile);
        document.querySelector('#imageFileInput').addEventListener('change', APP.fileHandlers.handleImageFile);
    },

    handleCSVFile: function(event) {
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
                    APP.api.getCoordinates(info)
                        .then(coords => {
                            APP.map.addMarker(info, col2, coords);
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
    },

    handleImageFile: function(event) {
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
                    return text;
                });
            });

            Promise.all(promises).then(texts => {
                APP.addressProcessing.processRecognizedText(combinedText);
            }).catch(error => {
                console.error('Erreur lors de la reconnaissance du texte:', error);
            });
        }
    }
};