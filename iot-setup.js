const Wifi = require('Wifi');
const WebServer = require('WebServer'); 
const http = require("http");
const dgram = require('dgram');
const FlashEEPROM = require('FlashEEPROM');

const SSID_DEFAULT = 'iot-0000';
const SMARTTHINGS_PORT = '39500';
const LED_TIMEOUT = 30*1000;                  // Only show the led indicator for a while
const SMARTTHINGS_SEND_INTERVAL = 15*60*1000; // Update smartthings every x minutes
const SETUP_TIMEOUT = 60*1000;                // If setup times out, load default values from flash
const EDIT_SETTINGS_TIMEOUT = 15*60*1000;     // If editing settings but then get disconnected, load value from flash
const WIFI_CLIENT_RETRY_TIMEOUT = 5*60*1000;  // If wifi goes out, retry ever x minutes
const RELAY_PIN = B15;

const PAGE_STYLE = 'font-family:Verdana; font-size:20px;';
const PAGE_HEADER = 
`
    <!DOCTYPE html>
    <html style="${PAGE_STYLE}"> 
    <head> 
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
`;
const PAGE_FOOTER = 
 `
  </body>
  </html>
`;

var _flashMem = new FlashEEPROM();
var _webServer;
var _macAddr = '';
var _apList;
var _ssid;
var _pw;
var _clientIP;
var _connectError;
var _smartthingsIP = '192.168.1.159';
var _setupTimeoutID;
var _sendDataIntervalID;
var _relayOn = false;
var _ledBlink;
var _blinkIntervalID;

// Nothing set manually so used the last save params
function onSetupTimeout() {
  ledStopBlink();
  _setupTimeoutID = 0;
  console.log('Setup timeout, using default params');
  loadWifiParams();
  if (_ssid && _pw && _smartthingsIP) {
    connectWifiAsClient();
  } else {
    console.log('Setup timeout but no default params');
  }  
}

function saveWifiParams() {
  console.log('Saving params');
  _flashMem.write(1, _ssid);
  _flashMem.write(2, _pw);
  _flashMem.write(3, _smartthingsIP);
}

function loadWifiParams() {
  console.log('Loading params');
  let v1 = _flashMem.read(1);
  let v2 = _flashMem.read(2);
  let v3 = _flashMem.read(3);

  if (v1 && v2 && v3) { 
    _ssid = E.toString(v1);
    _pw = E.toString(v2);
    _smartthingsIP = E.toString(v3);
    console.log(`Loaded params: ${_ssid} ${_pw} ${_smartthingsIP}`);
  } else {
    console.log('Failed to load params');
  }
}

function ledBlink() {
  _ledBlink = true;
  digitalWrite(LED2, _ledBlink);
  _blinkIntervalID = setInterval( () => {
    _ledBlink = !_ledBlink;
    digitalWrite(LED2, _ledBlink);
  }, 1000);
}

function ledStopBlink() {
  if (_blinkIntervalID) { 
    clearInterval(_blinkIntervalID);
    _blinkIntervalID = undefined;
  }
}

function ledNotify(success) {
  ledStopBlink();
  if (success) {
    digitalWrite(LED1, 0);
    digitalWrite(LED2, 1);
  } else {
    digitalWrite(LED1, 1);
    digitalWrite(LED2, 0);
  }
  // Automatically clear the leds after a while
  setTimeout(() => { 
    digitalWrite(LED1, 0);
    digitalWrite(LED2, 0);
  }, LED_TIMEOUT);
}

function processAccessPoints(err, data) {
  if (err) throw err;
  console.log('Access Points: ', data.length);
  _apList = data;
  for (var i = 0; i < _apList.length; i++) {
    console.log(`AP: ${_apList[i].rssi}dB - "${_apList[i].ssid}"`);
  }
}

function sendDataToSmartthings() {
  if (!_smartthingsIP) {
    console.log('Smartthings IP not set');
    return;
  }

  try {
    let content = JSON.stringify({
      IP: _clientIP,
      A0: analogRead(A0),
      A1: analogRead(A1),
      B15: _relayOn ? 1 : 0
    });
    console.log('Smartthings send: ' + content);
    var options = {
      host: _smartthingsIP,
      port: SMARTTHINGS_PORT,
      path: '/',
      method: 'POST',
      headers: { "Content-Type":"application/json", "Content-Length":content.length }
    };
    http.request(options, (res) => {
      let allData = "";
      res.on('data', (data) => { allData += data; });
      res.on('close', (data) => { console.log("Send closed: " + allData); }); 
    }).end(content);
  } catch (exc) {
    console.log('sendDataToSmartthings error: ', exc);
    Wifi.disconnect();
    connectWifiAsClient();
  }
}

function apListPageContent() {
  let page = PAGE_HEADER + 
    'Device ID: ' + _mac + 
    '<br><hr><br>' +
    '<div style="text-align:center">Access Point List</div>' + 
    '<br>';
  
  if (_apList) {
    page += '<ul>';
    for (var i=0; i<_apList.length; i++) {
      page += `<li> ${_apList[i].rssi}dB - "${_apList[i].ssid}" </li>`;
      page += '<br>';
    }
    page += '</ul>';
  } 

  page += '<hr>' + 
    '<a href="/enterSSID.njs">Continue</a>' +
    PAGE_FOOTER;

  // Async refresh the list
  setTimeout( () => {
    console.log('Wifi scan'); 
    Wifi.scan((err, data) => { 
      console.log('Scan complete'); 
      processAccessPoints(err, data); 
    });
  }, 5000);

  return {'content': page};
}

function relayPageContent(req, res, parsedUrl, webserver) {
  console.log('RelayPage: ', JSON.stringify(parsedUrl));

  if (parsedUrl.query) {
    _relayOn = parsedUrl.query.on == 'true' ? 1 : 0; 
    if (_relayOn) {
      console.log('Turning on relay');
      digitalWrite(RELAY_PIN, 1);
    } else {
      console.log('Turning off relay');
      digitalWrite(RELAY_PIN, 0);
    }
  }

  let page = PAGE_HEADER + 
    'Device ID: ' + _mac + 
    '<br><hr><br>' +
    '<div style="text-align:center">Relay</div>' + 
    '<br>';
  
  if (_relayOn) {
    page += 'Relay: On';
  } else {
    page += 'Relay: Off';
  }

  page += '<hr>' + PAGE_FOOTER;

  return {'content': page};
}


function enterSSIDPageContent() {
  _connectError = false;
  _ssid = undefined;
  _pw = undefined;
  _clientIP = undefined;
  let page = PAGE_HEADER +
    'Device ID: ' + _mac + 
    '<br><hr><br>' +
    '<div style="text-align:center">Set SSID</div>' +
    '<br>' +
    '<form action="/ssidConfirm.njs">' +
      '<label>SSID</label><br><input name="ssid">' +
      '<br><br>' +
      '<label>Password</label><br><input name="password">' +
      '<br><br>' +
      '<label>Smartthings IP</label><br><input name="smartthingsIP">' +
      '<br><br><hr>' +
      '<button>Save</button>' +
    '</form>' +
    PAGE_FOOTER;
  
  return {'content': page};
}

function ssidConfirmPageContent(req, res, parsedUrl, webserver) {

  if (parsedUrl.query) {
    let newSSID = parsedUrl.query.ssid;
    let newPW = parsedUrl.query.password;
    if (_ssid != newSSID || _pw != newPW || _connectError) {
      _ssid = parsedUrl.query.ssid;
      _pw = parsedUrl.query.password;
      _smartthingsIP = parsedUrl.query.smartthingsIP;
      saveWifiParams();
      _clientIP = undefined;
      _connectError = false;
      console.log(`set ssid: ${_ssid}, password: ${_pw}`);
      connectWifiAsClient();
    }
  }

  let page = PAGE_HEADER +
    'Device ID: ' + _mac + 
    '<br><hr><br>' +
    '<div style="text-align:center">SSID Set</div>' +
    '<br>';
  
  if (_ssid) {
    page += `<div> SSID: ${_ssid} </div>`;
  } else {
    page += `<div> SSID: [Connecting] </div>`;
  }

  if (_clientIP) {
    page += `<div> Client IP: ${_clientIP} </div>`;
    // setTimeout( () => { 
    //   console.log('Stopping AP');
    //   ledStopBlink();
    //   Wifi.stopAP();
    // }, 1000);
  } else {
    page += `<div> Client IP: [Connecting] </div>`;
  } 
  
  if (_smartthingsIP) {
    page += `<div> Smartthings IP: ${_smartthingsIP} </div>`;
  }

  page += '<br><hr>' + PAGE_FOOTER;

  if (_connectError) {
    page += `<div> Connection Error </div>`;
  } else { 
    if (!_ssid || !_clientIP) {
      console.log('ssidConfirm no ssid or ip, refresh');
      page += '<script> setTimeout( function(){window.location.href = "ssidConfirm.njs"}, 5000); </script>';
    }
  }

  return {'content': page};
}

function connectWifiAsClient() {
  console.log('Connecting as wifi client: ', _ssid);
  Wifi.connect(_ssid, {password:_pw}, (err) => {
    if (err) {
      console.log('Wifi connect error');
      _connectError = true;
      ledNotify(false);
      setTimeout(connectWifiAsClient, WIFI_CLIENT_RETRY_TIMEOUT);
    }
  });
}

function onWebServerRequest(request, response, parsedUrl, WebServer) {
  console.log('WebServer requested', parsedUrl.path);
  //console.log('WebServer requested', parsedUrl);

  if (_setupTimeoutID) { 
    // Someone is setting params manually so don't use saved ones, at least not 
    // for a long while
    console.log('Setting new params, delaying setup timeout: ', _setupTimeoutID);
    clearTimeout(_setupTimeoutID);
    _setupTimeoutID = setTimeout(onSetupTimeout, EDIT_SETTINGS_TIMEOUT);
  }

  // Handle POST relay on/off
  if (parsedUrl.pathname == '/relay' && request.method == 'POST') {
    let allData = '';
    request.on('data', (data) => { 
      console.log('Relay data: ', data);
      allData += data;
    });
    request.on('close', () => { 
      console.log('Relay close'); 
      let obj = JSON.parse(allData);
      _relayOn = false;
      if (obj && obj.on == 'true') {_relayOn = true; }
      console.log('Setting relay: ', _relayOn);
      digitalWrite(RELAY_PIN, _relayOn);
      setTimeout(sendDataToSmartthings, 1000);
    });
  }
}

function onWebServerStart(webserver) {
  console.log('WebServer listening on port ' + webserver.port);
  Wifi.getIP((err, data) => {
    if (!err && data && data.mac) { 
      _mac = data.mac.split(':').join('').toUpperCase();
      _flashMem.write(0, _mac);
      console.log('Mac: ', _mac);
    } else {
      console.log('ERROR webServerStart: ' + err + ' ' + data);
    }
  });
}

function createWebServer() {
  try {
    _webServer = new WebServer({
      port: 80,
      default_type: 'text/html',
      default_index: 'apList.njs',
      memory: {
        'apList.njs' : {'content': apListPageContent},
        'enterSSID.njs': {'content': enterSSIDPageContent},
        'ssidConfirm.njs': {'content': ssidConfirmPageContent},
        'relay.njs' : {'content': relayPageContent},
        'relay' : {'content': '{ }'},
      }
    });
    _webServer.on('start', onWebServerStart);
    _webServer.on('request', onWebServerRequest);
    _webServer.on('error', (error, WebServer) => { 
      console.log('WebServer error', error); 
      _webServer = null;
    });
    _webServer.createServer();
  } catch (exc) {
    console.log('Error creating web server: ', exc);
  }
}

function stopAP() {
  console.log('Stopping AP');
  Wifi.stopAP();
}

// Client connected, all ready to go
Wifi.on('connected', (err) => {
  if (err) throw err;
  console.log('Wifi client connected: '); 
  Wifi.getIP((err, data) => {
    console.log('AP: ', JSON.stringify(data)); 
    _clientIP = data.ip;
    sendDataToSmartthings();
    if (!_webServer) { setTimeout(createWebServer, 5000); }
    if (_sendDataIntervalID) { clearInterval(_sendDataIntervalID); }
    _sendDataIntervalID = setInterval(sendDataToSmartthings, SMARTTHINGS_SEND_INTERVAL);
    setTimeout(stopAP, 5*60*1000);
    ledNotify(true);
  });

});

Wifi.on('associated', () => { console.log('Wifi associated'); });

Wifi.on('disconnected', () => { console.log("Wifi disconnected"); });

function onInit() {
  console.log('OnInit');
  let v0 = _flashMem.read(0);
  let ssid = SSID_DEFAULT;
  if (v0) { 
    mac = E.toString(v0);
    ssid = 'iot-' + mac.slice(-4);
  }
  Wifi.disconnect();
  Wifi.stopAP();
  Wifi.startAP(ssid, {authMode:"open", password:'12345678'}, () => {
    try {
      console.log('AP Started'); 
      Wifi.setAPIP({ip:'192.168.0.1'}, () => { });
      Wifi.setHostname(ssid, () => { });
      Wifi.getAPIP((err, data) => {  
        console.log('APIP: ', JSON.stringify(data)); 
        console.log('Wifi scan'); 
        Wifi.scan((err, data) => { 
          console.log('Scan complete'); 
          processAccessPoints(err, data); 
          createWebServer();
        });
      });
      ledBlink();
      _setupTimeoutID = setTimeout(onSetupTimeout, SETUP_TIMEOUT);
      console.log('Starting setup timeout: ', _setupTimeoutID);
    } catch (exc) {
      console.log('Error starting AP: ', exc);
    }
  });
}

// setTimeout(onInit, 1000);

