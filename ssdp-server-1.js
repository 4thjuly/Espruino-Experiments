const wifi = require('Wifi');
const dgram = require('dgram');

const SSID = 'Black';
const PASSWORD = 'DelayFinish88';
const SSDP_IP = '239.255.255.250';
const SSDP_PORT = 1900;

// var _ledOn = false;
// var _blinkIntervalID = 0;

wifi.on('connected', () => {
  console.log('Connected'); 
  // greenLedBlink(false);
  // greenLed(true);

  wifi.getIP((err, d) => { 
    let ip = d.ip;
    console.log('Creating socket: ', ip);
    let srv = dgram.createSocket('udp4', (sckt) => {
      sckt.addMembership(SSDP_IP, ip);
      // sckt.on('message', (msg, rinfo) => { console.log('Sckt Message: ', JSON.stringify(msg)); });
      // sckt.on('close', (err) => { console.log('Sckt Close: ', JSON.stringify(err)); });
      sckt.bind(SSDP_PORT, (res) => {
        // res.addMembership(SSDP_IP, ip);
        res.on('message', (msg, rinfo) => { console.log('Res Message: ', JSON.stringify(msg)); });
        res.on('close', (err) => { console.log('Res Close: ', JSON.stringify(err)); });
      });
    });
    // srv.addMembership(SSDP_IP, ip);
    // srv.bind(SSDP_PORT, ip);
    // srv.on('message', (msg, rinfo) => { console.log('Srv Message: ', JSON.stringify(msg)); });
    // srv.on('close', (err) => { console.log('Srv Close: ', JSON.stringify(err)); });  
  });
});

wifi.on('dhcp_timeout', (details) => {
  console.log('dhcp_timeout:', details); 
  // greenLed(false);
});

wifi.on('disconnected', (details) => {
  console.log('disconnected:', details); 
  // greenLed(false);
});

// function greenLedBlink(setOn) {
//   if (setOn) {
//     _blinkIntervalID = setInterval(() => {
//       _ledOn = !_ledOn;
//       digitalWrite(LED2, _ledOn);
//     }, 500);
//   } else {
//     clearInterval(_blinkIntervalID);
//     _blinkIntervalID = 0;
//   }
// }

// function greenLed(setOn) {
//   digitalWrite(LED2, setOn);
// }

function onInit() {
  console.log('connecting...');
  // greenLedBlink(true);
  wifi.connect(SSID, {password:PASSWORD}, (err) => { 
    if (!err) { 
      console.log('Connect success');
    } else {
      console.log('Connect error: ', err);
      // greenLedBlink(false);
      // greenLed(false);
    }
  });
}

onInit();
