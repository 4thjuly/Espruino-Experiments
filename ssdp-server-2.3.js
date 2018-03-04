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
  'LOCATION: http://127.0.0.0', 
  'NT: upnp:rootdevice',
  'NTS: ssdp:alive',
  'SERVER: EspruinoWifi UPnP/1.0 SSDP-Server/1.0',
  'USN: uuid:f214e5fe-2a1c-42e6-9365-aff5a353547f::upnp:rootdevice',
  ''
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
      console.log('Sending'); 
      res.writeHead(200);
      res.end("Hello World");
    }).listen(80);

    sendNotify();
    setInterval(() => { sendNotify(); }, 2000);
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
  let sendMsg = SSDP_NOTIFY;
  let sendIP = UPNP_IP;
  console.log(`Sending: ${sendMsg.split(' ')[0]} to ${sendIP}`);
  try {
    let srv = dgram.createSocket('udp4');
    srv.on('close', () => { console.log('Close'); });
    srv.send(sendMsg, UPNP_PORT, sendIP);
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
