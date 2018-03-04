const wifi = require('Wifi');
const dgram = require('dgram');

const SSID = 'Black';
const PASSWORD = 'DelayFinish88';

var _ledOn = false;
var _blinkIntervalID = 0;

wifi.on('connected', () => {
  console.log('Connected'); 
  greenLedBlink(false);
  greenLed(true);

  wifi.getIP((err, d) => { 
    let ip = d.ip;
    console.log('Creating socket: ', ip);
    let srv = dgram.createSocket('udp4');
    srv.addMembership('239.255.255.250', ip);
    srv.bind(1900, (res) => {
      console.log('Socket bound');
      res.on('message', (msg, info) => { 
        console.log('Message: ' + JSON.stringify(msg));
      });
      res.on('close', (err) => { console.log('Socket closed: ', err); });
    });
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
