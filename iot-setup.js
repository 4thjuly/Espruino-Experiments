const Wifi = require('Wifi');
const WebServer = require('WebServer'); 
const http = require("http");
const dgram = require('dgram');

const SSID = 'iot-2903';
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

var _webServer;
var _macAddr = '';
var _apList;
var _ssid;
var _pw;
var _clientIP;

function processAccessPoints(err, data) {
  if (err) throw err;
  console.log('Access Points: ', data.length);
  _apList = data;
}

function enterSSIDPageContent() {
  let page = PAGE_HEADER +
    'Device ID: ' + _mac + 
    '<br><hr><br>' +
    '<div style="text-align:center">Set SSID</div>' +
    '<br>' +
    '<form action="/ssidConfirm.njs">' +
      '<label>SSID</label><br><input name="ssid">' +
      '<br><br>' +
      '<label>Password</label><br><input name="password">' +
      '<br><br><hr>' +
      '<button>Set SSID</button>' +
    '</form>' +
    PAGE_FOOTER;
  
  return {'content': page};
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

function ssidConfirmPageContent() {
  let page = PAGE_HEADER +
    'Device ID: ' + _mac + 
    '<br><hr><br>' +
    '<div style="text-align:center">SSID Set</div>' +
    '<br>';
  if (_ssid) {
    page += `<div> SSID: ${_ssid} </div>`;
  } 
  if (_clientIP) {
    page += `<div> Client IP: ${_clientIP} </div>`;
    setTimeout( () => {
      console.log('Stopping AP');
      Wifi.stopAP();
    }, 1000);
  } 
  
  // Refresh
  if (!_ssid || !_clientIP) {
    console.log('ssidConfirm no ssid');
    page += 
    '<script>' +
      'setTimeout( function(){window.location.href = "ssidConfirm.njs"},5000);' +
    '</script>';
  }
  
  page += PAGE_FOOTER;
  
  return {'content': page};
}
    
function createWebServer() {
  _webServer = new WebServer({
    port: 80,
    default_type: 'text/html',
    default_index: 'apList.njs',
    memory: {
      'apList.njs' : {'content': apListPageContent},
      'enterSSID.njs': {'content': enterSSIDPageContent},
      'ssidConfirm.njs': { 'content': ssidConfirmPageContent},
    }
  });
    
  _webServer.on('start', (WebServer) => {
    console.log('WebServer listening on port ' + WebServer.port);
    Wifi.getIP((err, data) => {  
      _mac = data.mac.split(':').join('').toUpperCase();
      console.log('Mac: ', _mac);
    });
  });
  
  _webServer.on('request', (request, response, parsedUrl, WebServer) => {
    console.log('WebServer requested', parsedUrl.path);
    if (parsedUrl.pathname == '/ssidConfirm.njs' && parsedUrl.query) {
      let newSSID = parsedUrl.query.ssid;
      let newPW = parsedUrl.query.password;
      if (_ssid != newSSID || _pw != newPW) {
        _ssid = parsedUrl.query.ssid;
        _pw = parsedUrl.query.password;
        console.log(`set ssid: ${_ssid}, password: ${_pw}`);      
        setTimeout(() => {
          Wifi.connect(_ssid, {password:_pw});
        }, 1000);
      }
    }
  });
  
  _webServer.on('error', (error, WebServer) => {
    console.log('WebServer error', error);
  });

  _webServer.createServer();
}

Wifi.on('connected', (err) => {
  if (err) throw err;
  console.log('Wifi connected: '); 
  Wifi.getIP((err, data) => {
    console.log('AP: ', JSON.stringify(data)); 
    _clientIP = data.ip;
    
  });

});

Wifi.on('associated', () => {
  console.log('Wifi associated'); 
});

function onInit() {
  console.log('OnInit');
  Wifi.startAP(SSID, {authMode:"open", password:'12345678'}, () => {
    try {
      console.log('AP Started'); 
      Wifi.setAPIP({ip:'192.168.0.1'}, () => { });
      Wifi.setHostname(SSID, () => { });
      Wifi.getAPIP((err, data) => {  
        console.log('APIP: ', JSON.stringify(data)); 
        console.log('Wifi scan'); 
        Wifi.scan((err, data) => { 
          console.log('Scan complete'); 
          processAccessPoints(err, data); 
          createWebServer();
        });
      });
    } catch (exc) {
      console.log(exc);
    }
  });
}

setTimeout(onInit, 1000);