var wifi = require('Wifi');
var _ledOn = false;
var _blinkIntervalID = 0;
var SSID = 'Black';
var PASSWORD = 'DelayFinish88';

wifi.on('connected', () => {
  console.log('connected'); 
  wifi.getIP((err, d) => { console.log('IP: ', d); } );
  greenLedBlink(false);
  greenLed(true);
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
