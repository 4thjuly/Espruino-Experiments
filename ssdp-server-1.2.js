const wifi = require('Wifi');
const dgram = require('dgram');

const SSID = 'Black-TP-Link_0BF4';
const PASSWORD = 'DelayFinish88';
const SSDP_IP = '239.255.255.250';
const BROADCAST_IP = '255.255.255.255';
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
    srv.bind(SSDP_PORT, (bsrv) => {
      bsrv.on('message', (msg, rinfo) => {
        let type = msg.split(' ')[0];
        if (type == 'M-SEARCH') {
          console.log('message: ', JSON.stringify(rinfo)); 
          srv.send('Test reply', rinfo.port, rinfo.address);
        }
      });
      srv.on('error', () => {
        console.log('error');
      });
    });
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
