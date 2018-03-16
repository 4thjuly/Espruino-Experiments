const wifi = require('Wifi');
const dgram = require('dgram');
const http = require("http");

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
  'NT: urn:schemas-reszolve-com:device:espruino:1',
  'NTS: ssdp:alive',
  'SERVER: EspruinoWifi UPnP/1.0 SSDP-Server/1.0',
  'USN: uuid:f214e5fe-2a1c-42e6-9365-aff5a353547f::urn:schemas-reszolve-com:device:espruino:',
  ''
].join('\r\n');
const SEND_TIMEOUT = 10*1000;

var _ledOn = false;
var _blinkIntervalID = 0;
var _timeout = false;
var _ssdpInterval;
var _httpServer;
var _dgramServer;
var _starting = false;

// When the send timeout fires
function onSSDPComplete() {
  console.log('SSDP complete');
  clearInterval(_ssdpInterval);
}

// Send SSDP stuff every second or so
function onSSDPInterval() {
  console.log('.');
  if (_dgramServer) _dgramServer.send(SSDP_NOTIFY, SSDP_PORT, SSDP_IP);
}

function onHttpReq(req, res) {
  let a = url.parse(req.url, true);
  console.log('onHttp: ' + a.pathname);
  if (a.pathname == '/A0') {
    res.writeHead(200, {'Content-Type': 'text/json'});
    res.end(JSON.stringify({value: analogRead(A0)}));
  } else {
    res.writeHead(400, {'Content-Type': 'text/json'});    
    res.end();
  }
}

function cleanUp() {
  try { 
    if (_httpServer) _httpServer.close(); 
  } catch (exc) { 
    console.log('cleanUp: ', exc); 
  }
  _httpServer = undefined;

  try { 
    if (_dgramServer) _dgramServer.close(); 
  } catch (exc) { 
    console.log('cleanUp: ', exc); 
  }
  _dgramServer = undefined;

  try {
    wifi.disconnect();
  } catch (exc) {
    console.log('cleanUp: ', exc); 
  }

}

function onDgramError() {
  console.log('Dgram error');
  setTimeout(restart, 1000);
}

function onDgramClose() {
  console.log('Dgram close');
  setTimeout(restart, 1000);
}

wifi.on('connected', () => {
  console.log('Connected'); 

  _httpServer = http.createServer((req, res) => onHttpReq(req, res));
  _httpServer.listen(80);

  wifi.getIP((err, d) => { 
    if (!err && d) {
      let ip = d.ip;
      console.log('IP: ', ip);
      _dgramServer = dgram.createSocket('udp4');
      _dgramServer.bind(SSDP_PORT);
      _dgramServer.on('error', onDgramError);
      _dgramServer.on('close', onDgramClose);
      _ssdpInterval = setInterval(onSSDPInterval, 1000);
      setTimeout(onSSDPComplete, SEND_TIMEOUT);
    } else {
      console.log('getIP error: ', err);
      setTimeout(restart, 1000);
    }
  });

  doneStarting(true);
});
    
wifi.on('dhcp_timeout', (details) => {
  console.log('dhcp_timeout:', details); 
  setTimeout(restart, 1000);
});

wifi.on('disconnected', (details) => {
  console.log('disconnected:', details); 
  setTimeout(restart, 1000);
});

function greenLedBlink(setOn) {
  if (_blinkIntervalID) { 
    clearInterval(_blinkIntervalID);
    _blinkIntervalID = 0;
  }

  if (setOn) {
    _blinkIntervalID = setInterval(() => {
      _ledOn = !_ledOn;
      digitalWrite(LED2, _ledOn);
    }, 500);
  }
  
}

function greenLed(setOn) {
  digitalWrite(LED2, setOn);
}

function starting() {
  _starting = true;
  greenLedBlink(true);
}

function doneStarting(success) {
  greenLedBlink(false);
  greenLed(success);
  _starting = false;
}

function restart() {
  if (!_starting) {
    starting();
    cleanUp();
    console.log('Connecting');
    wifi.connect(SSID, {password:PASSWORD}, (err) => { 
      if (err) { 
        doneStarting(false);
        console.log('Connect error: ', err);
        setTimeout(restart, 5000);
      }
    });
  }
}

function onInit() {
  console.log('Memory: ', process.memory().free); 
  restart();
}

// setTimeout(onInit, 1000);
