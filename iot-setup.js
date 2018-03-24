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
  page += `<div> SSID: ${_ssid} </div>`;
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
      console.log('IP: ', JSON.stringify(data));
      _mac = data.mac.split(':').join('').toUpperCase();
    });
  });
  
  _webServer.on('request', (request, response, parsedUrl, WebServer) => {
    console.log('WebServer requested', parsedUrl);
    if (parsedUrl.pathname == '/ssidConfirm.njs') {
      _ssid = parsedUrl.query.ssid;
      _pw = parsedUrl.query.password;
      console.log(`set ssid: ${_ssid}, password: ${_pw}`);
    }
  });
  
  _webServer.on('error', (error, WebServer) => {
    console.log('WebServer error', error);
  });

  _webServer.createServer();
}

Wifi.on('connected', () => {
  console.log('Connected'); 
});

Wifi.on('associated', () => {
  console.log('Associated'); 
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