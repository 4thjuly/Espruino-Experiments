const wifi = require('Wifi');
const http = require("http");

const SSID = 'iet-wlan-1';
const PASSWORD = 'alumbrook';
const SMARTTHINGS_HOST = '192.168.1.159';
const SMARTTHINGS_PORT = '39500';

const SEND_TIMEOUT = 10*1000;
const SEND_INTERVAL = 2000;

var _ledOn = false;
var _blinkIntervalID = 0;
var _timeout = false;
var _sendInterval;
var _starting = false;

// Stop after a while
function onSendComplete() {
  console.log('Send complete');
  clearInterval(_sendInterval);
  setDeepSleep(1);
}

// Send HTTP stuff to Smartthings
// NB Smartthings DeviceId must match the Espr mac address 
function onSendInterval() {
  let content = JSON.stringify({A0: analogRead(A0)});
  console.log('Send: ' + content);
  var options = {
    host: SMARTTHINGS_HOST,
    port: SMARTTHINGS_PORT,
    path:'/',
    method:'POST',
    headers: { "Content-Type":"application/json", "Content-Length":content.length }
  };
  http.request(options, (res) => {
    let allData = "";
    res.on('data', function(data) { allData += data; });
    res.on('close', function(data) { console.log("Closed: " + allData); }); 
  }).end(content);
}

wifi.on('connected', () => {
  console.log('Connected'); 
  doneStarting(true);
  wifi.getIP((err, d) => { console.log('IP: ', d.ip); }); 
  _sendInterval = setInterval(onSendInterval, SEND_INTERVAL);
  setTimeout(onSendComplete, SEND_TIMEOUT);
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

function greenLedOnThenOff() {
  digitalWrite(LED2, 1);
  setTimeout(() => { digitalWrite(LED2,0);}, 10*1000);
}

function redLedOnThenOff() {
  digitalWrite(LED1, 1);
  setTimeout(() => { digitalWrite(LED1,0);}, 10*1000);
}

function starting() {
  _starting = true;
  greenLedBlink(true);
}

function doneStarting(setOK) {
  greenLedBlink(false);
  if (setOK) greenLedOnThenOff();
  else redLedOnThenOff();
  _starting = false;
}

function restart() {
  if (!_starting) {
    starting();
    console.log('Connecting');
    wifi.connect(SSID, {password:PASSWORD}, (err) => { 
      if (err) { 
        doneStarting(false);
        console.log('Connect error: ', err);
        setTimeout(restart, 60*1000);
      }
    });
  }
}

function onInit() {
  console.log('Memory: ', process.memory().free); 
  restart();
  // setSleepIndicator(LED1); // Debugging
  setInterval(() => { 
    setDeepSleep(0);
    restart(); 
  }, 60*60*1000); // Wake every hour
}

// setTimeout(onInit, 1000);
