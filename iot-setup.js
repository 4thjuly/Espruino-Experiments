const Wifi = require('Wifi');
const WebServer = require('WebServer'); 
const http = require("http");
const dgram = require('dgram');

const SSID = 'iot-2903';

var _webServer;

function processAccessPoints(err, data) {
  console.log(' ');
  console.log(' ');
  console.log('--- Done scanning ---');

  if (err) throw err;
  
  if (data) {
    for (var i=0; i<data.length; i++) {
      console.log('Access Point: ', data[i]);
    }
  } else {
    console.log('No access points');
  }
  
  // setTimeout(() => {
  //   wifi.scan((err, data) => { processAccessPoints(err, data); });
  // }, 10000);
  
}

function mainPage() {
  let page = '<html>Hello World Dynamic 1.</html>';
  
  return {'type':'text/html', 'content':page};
}
    
function createWebServer() {
  _webServer = new WebServer({
    port: 80,
    default_type: 'text/plain',
    default_index: 'main.njs',
    memory: {
      'main.njs': { 'content': mainPage }
    }
  });
    
  _webServer.on('start', function (WebServer) {
    console.log('WebServer listening on port ' + WebServer.port);
    Wifi.getIP((err, data) => {  
      console.log('IP: ', data);
    });
  });
  
  _webServer.on('request', function (request, response, parsedUrl, WebServer) {
    console.log('WebServer requested', parsedUrl);
  });
  
  _webServer.on('error', function (error, WebServer) {
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
        console.log('APIP: ', data); 
        // Wifi.getStatus((status) => { console.log('Status: ', status); });
        createWebServer();
      });
      // Wifi.scan((err, data) => { processAccessPoints(err, data); });
    } catch (exc) {
      console.log(exc);
    }
  });
}

setTimeout(onInit, 1000);