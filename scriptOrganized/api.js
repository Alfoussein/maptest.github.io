APP.api = {
    getCoordinates: function(address) {
        return fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${APP.apiKey}`)
            .then(response => response.json())
            .then(data => {
                if (data.results.length > 0) {
                    return data.results[0].geometry;
                } else {
                    throw new Error("Aucune coordonnée trouvée pour cette adresse");
                }
            });
    }
};

console.log("API Key:", APP.apiKey);