const wifi = require('Wifi');
const dgram = require('dgram');
const http = require("http");

const SSID = 'Black';
const PASSWORD = 'DelayFinish88';
const UPNP_IP = '239.255.255.250';
const BROADCAST_IP = '255.255.255.255';
const TEST_IP = '10.0.0.145';
const TEST_MSG = 'NOTIFY * HTTP/1.1\r\n\r\n';
const UPNP_PORT = 1900;

const SSDP_NOTIFY = [
  'NOTIFY * HTTP/1.1', 
  'HOST: 239.255.255.250:1900',
  'CACHE-CONTROL: max-age = 1800',
  'LOCATION: http://[x.x.x.x]', 
  'NT: upnp:rootdevice',
  'NTS: ssdp:alive',
  'SERVER: EspruinoWifi UPnP/1.0 SSDP-Server/1.0',
  'USN: uuid:f214e5fe-2a1c-42e6-9365-aff5a353547f::upnp:rootdevice',
  ''
].join('\r\n');

const SSDP_RESPONSE = [
  'NOTIFY * HTTP/1.1', 
  'HOST: 239.255.255.250:1900',
  'CACHE-CONTROL: max-age = 1800',
  'EXT',
  'LOCATION: http://[x.x.x.x]', 
  'ST: upnp:rootdevice',
  'NTS: ssdp:alive',
  'SERVER: EspruinoWifi UPnP/1.0 SSDP-Server/1.0',
  'USN: uuid:f214e5fe-2a1c-42e6-9365-aff5a353547f::upnp:rootdevice',
  ''
].join('\r\n');

const SSDP_DEVICE_DESC = [
  '<?xml version="1.0"?>',
  '<root xmlns="urn:schemas-upnp-org:device-1-0">',
    '<specVersion>',
      '<major>1</major>',
      '<minor>0</minor>',
    '</specVersion>',
    '<device>',
      '<deviceType>urn:reszolve.com:device:espruinowifi:1</deviceType>',
      '<friendlyName>Espruino Wifi</friendlyName>',
      '<manufacturer>Reszolve</manufacturer>',
      '<modelDescription>Espruino Wifi</modelDescription>',
      '<modelName>EspruinoWifi</modelName>',
      '<modelNumber>1</modelNumber>',
      '<UDN>uuid:f214e5fe-2a1c-42e6-9365-aff5a353547f</UDN>',
    '</device>',
  '</root>',
].join('\r\n');

var _ledOn = false;
var _blinkIntervalID = 0;

wifi.on('connected', () => {
  console.log('Connected'); 
  greenLedBlink(false);
  greenLed(true);

  wifi.getIP((err, d) => { 
    let ip = d.ip;
    console.log('IP: ', ip);

    http.createServer((req, res) => {
      console.log('Sending device description: ', JSON.stringify(req)); 
      res.writeHead(200, {'Content-Type': 'text/xml'});
      res.end(SSDP_DEVICE_DESC);
    }).listen(80);

    sendNotify(ip);
    setInterval(() => { sendNotify(ip); }, 10000);

    // Doesn't work
    let rcvSocket = dgram.createSocket('udp4');
    rcvSocket.addMembership(UPNP_IP);
    rcvSocket.on('message', (msg, rinfo) => { console.log('Message: ', JSON.stringify(msg)); });
    rcvSocket.on('close', (err) => { console.log('Close: ', JSON.stringify(err)); });
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

function sendNotify(ip) {
  let ssdpMsg = SSDP_NOTIFY.replace('[x.x.x.x]', ip);
  let ssdpIP = UPNP_IP;
  console.log(`Sending: ${ssdpMsg.split(' ')[0]} to ${ssdpIP}`);
  try {
    let srv = dgram.createSocket('udp4');
    srv.on('close', () => { console.log('Close'); });
    srv.send(ssdpMsg, UPNP_PORT, ssdpIP);
    srv.close();
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
  console.log('Connecting');
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
