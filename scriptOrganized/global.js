var APP = {
    apiKey: 'fc1af9eaec3c47c9b31d0dd09e0dc933',
    selectedAddresses: [],
    selectedNameValues: [],
    markers: [],
    selectedAddressesStorage: [],
    sortDeliveryArray: [],
    linkedArray: [],
    boolOCR: false,
    countPeople: 1,
    map: null,
    _fullNames: [],
    _addresses: [],
    _mapPoints: [],
    _selectedMarkers: [],
    fullNameWithTitleRegex: /(Mme\/m|M|Mme)\s+([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)*)/g,
    addressKeywords: [
        'rue', 'avenue', 'boulevard', 'place', 'chemin', 'route',
        'square', 'impasse', 'allée', 'esplanade', 'passage'
    ]
};