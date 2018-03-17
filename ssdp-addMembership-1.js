const wifi = require('Wifi');
const dgram = require('dgram');

// const SSID = 'Black-TP-Link_0BF4';
// const PASSWORD = 'DelayFinish88';

// const SSID = 'Godfrey_2.4GHz';
// const PASSWORD = 'broadandpalm';

const SSID = 'iet-wlan-1';
const PASSWORD = 'alumbrook';

const SSDP_IP = '239.255.255.250';
const SSDP_PORT = 1900;

var _ledOn = false;
var _blinkIntervalID = 0;

wifi.on('connected', () => {
  console.log('Connected'); 
  greenLedBlink(false);
  greenLed(true);

  wifi.getIP((err, d) => { 
    let ip = d.ip;
    console.log('IP: ', ip);
    let srv = dgram.createSocket('udp4');
    srv.addMembership(SSDP_IP);
    srv.bind(SSDP_PORT, (bsrv) => {
      bsrv.on('message', (msg, rinfo) => { console.log('message: ', JSON.stringify(rinfo)); });
      wifi.at.debug();
    });
  });
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

function onInit() {
  console.log('Memory: ', process.memory().free); 
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

setTimeout(onInit, 1000);
