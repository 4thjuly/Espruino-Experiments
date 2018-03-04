const wifi = require('Wifi');
const dgram = require('dgram');

const SSID = 'Black';
const PASSWORD = 'DelayFinish88';
const UPNP_IP = '239.255.255.250';
const BROADCAST_IP = '255.255.255.255';
const TEST_IP = '10.0.0.1';
const TEST_MSG = 'Test1234';
const UPNP_PORT = 1900;
const SSDP_NOTIFY = `NOTIFY * HTTP/1.1 
HOST: 239.255.255.250:1900
CACHE-CONTROL: max-age = 1800
LOCATION: http://127.0.0.0
NT: upnp:rootdevice
NTS: ssdp:alive
SERVER: EspruinoWifi UPnP/1.0 SSDP-Server/1.0
USN: uuid:f214e5fe-2a1c-42e6-9365-aff5a353547f::upnp:rootdevice

`; // NB Blank preceding bland line

var _ledOn = false;
var _blinkIntervalID = 0;

wifi.on('connected', () => {
  console.log('Connected'); 
  greenLedBlink(false);
  greenLed(true);

  wifi.getIP((err, d) => { 
    let ip = d.ip;
    console.log('IP: ', ip);
    sendNotify();
    setInterval(() => { sendNotify(); }, 5000);
  });

});

wifi.on('dhcp_timeout', (details) => {
  console.log('dhcp_timeout:', details); 
  greenLed(false);
});

wifi.on('disconnected', (details) => {
  console.log('disconnected:', details); 
  greenLed(false);
});

function sendNotify() {
  console.log('Sending...');
  try {
    let srv = dgram.createSocket('udp4');
    srv.send(TEST_MSG, UPNP_PORT, BROADCAST_IP);
    srv.close();
    console.log('Sent');
  } catch (err) {
     console.log('Error: ', err);
  }
}

function greenLedBlink(setOn) {
  if (setOn) {
    _blinkIntervalID = setInterval(() => {
      _ledOn = !_ledOn;
      digitalWrite(LED2, _ledOn);
    }, 500);
  } else {
    clearInterval(_blinkIntervalID);
    _blinkIntervalID = 0;
  }
}

function greenLed(setOn) {
  digitalWrite(LED2, setOn);
}

function onInit() {
  console.log('connecting...');
  greenLedBlink(true);
  wifi.connect(SSID, {password:PASSWORD}, (err) => { 
    if (!err) { 
      console.log('Connect success');
    } else {
      console.log('Connect error: ', err);
      greenLedBlink(false);
      greenLed(false);
    }
  });
}

onInit();
