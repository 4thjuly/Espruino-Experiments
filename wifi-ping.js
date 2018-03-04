const wifi = require('Wifi');
const SSID = 'Black';
const PASSWORD = 'DelayFinish88';
const TEST_IP = '10.0.0.1';

var _ledOn = false;
var _blinkIntervalID = 0;

function ping() {
  wifi.ping(TEST_IP, (ping) => { 
    if (!ping) ping = '??';
    console.log(`Ping ${TEST_IP}: ${ping} ms`); 
  });
}

wifi.on('connected', () => {
  console.log('connected'); 
  wifi.getIP((err, d) => { console.log('IP: ', d.ip); } );
  greenLedBlink(false);
  greenLed(true);
  ping();
  setInterval(ping, 1000);
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
      console.log('connect success');
    } else {
      console.log('connect error: ', err);
      greenLedBlink(false);
      greenLed(false);
    }
  });
}

onInit();
