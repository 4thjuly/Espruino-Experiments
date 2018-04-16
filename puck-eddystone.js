// Eddystone UID beacon

var header = [
    0x03,       // Length of Service List
    0x03,       // Param: Service List
    0xAA, 0xFE, // Eddystone ID
    0x17,       // Length of Service Data
    0x16,       // Service Data
    0xAA, 0xFE, // Eddystone ID
    0x00,       // Frame type: UUID
    0xF8        // Power
];

// 10 byte namespace
// e157bd5df90aad1dc2fb42144cecb40b67b1e189 = SHA-1 of 'placesgraph1.microsoft.com'
var namespace = [ 0xe1, 0x57, 0xbd, 0x5d, 0xf9, 0x0a, 0xad, 0x1d, 0xc2, 0xfb ];
// 6 byte instance
var instance = [ 0x00, 0x00, 0x00, 0x00, 0x00, 0x01 ];
var RFU = [0x00, 0x00];
var data = header.concat(namespace, instance, RFU);

function onInit() {
    NRF.setAdvertising(data, {interval:300});
    console.log('Advertising');
}