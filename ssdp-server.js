var wifi = require('Wifi');
var dgram = require('dgram');

var _ledOn = false;
var _blinkIntervalID = 0;
var SSID = 'Black';
var PASSWORD = 'DelayFinish88';

wifi.on('connected', () => {
  console.log('Connected'); 
  greenLedBlink(false);
  greenLed(true);

  wifi.getIP((err, d) => { 
    let ip = d.ip;
    console.log('IP: [' + ip + ']' );
    console.log('Creating socket');
    let dgramSocket = dgram.createSocket('udp4');
    console.log('Socket created');
    dgramSocket.on('close', function(err) { console.log('Socket close: ', err); });
    dgramSocket.bind(1900, (res) => {
      console.log('Socket bound');
      dgramSocket.addMembership('239.255.255.250', ip);
      res.on('message', (msg, info) => { 
        let type = msg.split(' ')[0];
        console.log('Type: ', type);
      });
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
