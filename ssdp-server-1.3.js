const wifi = require('Wifi');
const dgram = require('dgram');

// const SSID = 'Black-TP-Link_0BF4';
// const PASSWORD = 'DelayFinish88';

const SSID = 'Godfrey_2.4GHz';
const PASSWORD = 'broadandpalm';

const SSDP_IP = '239.255.255.250';
const BROADCAST_IP = '255.255.255.255';
const SSDP_PORT = 1900;
const SSDP_NOTIFY = [
  'NOTIFY * HTTP/1.1', 
  'HOST: 239.255.255.250:1900',
  'CACHE-CONTROL: max-age = 1800',
  'LOCATION: *', 
  'NT: upnp:rootdevice',
  'NTS: ssdp:alive',
  'SERVER: EspruinoWifi UPnP/1.0 SSDP-Server/1.0',
  'USN: uuid:f214e5fe-2a1c-42e6-9365-aff5a353547f::upnp:rootdevice',
  ''
].join('\r\n');
const SEND_TIMEOUT = 10*1000;

var _ledOn = false;
var _blinkIntervalID = 0;
var _timeout = false;
var _sendInterval;

// When the send timeout fires
function onSendTimeout() {
  console.log('Send timeout');
  clearInterval(_sendInterval);
}

// Send SSDP stuff every second or so
function onSendInterval(srv) {
  console.log('.');
  srv.send(SSDP_NOTIFY, SSDP_PORT, SSDP_IP);
}

wifi.on('connected', () => {
  console.log('Connected'); 
  greenLedBlink(false);
  greenLed(true);

  wifi.getIP((err, d) => { 
    let ip = d.ip;
    console.log('IP: ', ip);
    let srv = dgram.createSocket('udp4');
    srv.bind(SSDP_PORT);
    srv.on('error', () => { console.log('error'); });
    srv.on('close', () => { console.log('close'); });
    _sendInterval = setInterval(() => onSendInterval(srv), 1000);
    setTimeout(() => onSendTimeout(), SEND_TIMEOUT);
  });
});

dgram.on('error', () => { console.log('Dgram error'); });
    
wifi.on('dhcp_timeout', (details) => {
  console.log('dhcp_timeout:', details); 
  greenLed(false);
});

wifi.on('disconnected', (details) => {
  console.log('disconnected:', details); 
  greenLed(false);
});

function greenLedBlink(setOn) {
  if (setOn) {
    if (_blinkIntervalID) clearInterval(_blinkIntervalID);
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
  console.log('Memory: ', process.memory().free); 
  console.log('Connecting');
  greenLedBlink(true);
  wifi.connect(SSID, {password:PASSWORD}, (err) => { 
    if (err) { 
      console.log('Connect error: ', err);
      greenLedBlink(false);
      greenLed(false);
    }
  });
}

setTimeout(onInit, 1000);
