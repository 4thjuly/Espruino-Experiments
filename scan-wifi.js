var wifi = require('Wifi');

function processAccessPoints(err, data) {
  console.log(' ');
  console.log(' ');
  console.log('--- Done scanning ---');

  if (err) throw err;
  
  if (data) {
    for (var i=0; i<data.length; i++) {
      // console.log(`Access Point: ${data[i].ssid} - ${data[i].rssi}`);
      console.log('Access Point: ', data[i]);
    }
  } else {
    console.log('No access points');
  }
  
  setTimeout(() => {
    wifi.scan((err, data) => { processAccessPoints(err, data); });
  }, 10000);
  
}

function onInit() {
  console.log('Scanning');
  wifi.scan((err, data) => { processAccessPoints(err, data); });
}

onInit();