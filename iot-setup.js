const Wifi = require('Wifi');
const WebServer = require('WebServer'); 
const http = require("http");
const dgram = require('dgram');

const SSID = 'IET-IoT-1';

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

function createWebServer() {
  _webServer = new WebServer({
    port: 80,
    default_type: 'text/plain',
    default_index: 'index.html',
    memory: {
      'index.html': { 
        'content': '<html>Hello World!</html>',
        'type': 'text/html'
      }
    }
  });
  
  _webServer.on('start', function (WebServer) {
    console.log('WebServer listening on port ' + WebServer.port);
  });
  
  _webServer.on('request', function (request, response, parsedUrl, WebServer) {
    console.log('WebServer requested', parsedUrl);
  });
  
  _webServer.on('error', function (error, WebServer) {
    console.log('WebServer error', error);
  });

  _webServer.createServer();
}

function createWebServer2() {
  http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Hello World");
  }).listen(80);
}

function createDgramServer() {
  let srv = dgram.createSocket('udp4');
  srv = srv.bind(8080, () => {
    srv.on('message', function(msg, info) {
      console.log("Dgram message: ", msg);
    });
  });
}

Wifi.on('connected', () => {
  console.log('Connected'); 
  // Wifi.getIP((err, data) => { console.log('IP: ', data); });
  // createWebServer2();
});

Wifi.on('associated', () => {
  console.log('Associated'); 
});

function onInit() {
  console.log('OnInit');
  Wifi.startAP(SSID, {authMode:"open", password:'12345678'}, () => {
    console.log('AP Started'); 
    Wifi.setAPIP({ip:'192.168.0.1'}, () => { });
    Wifi.getAPIP((err, data) => {  
      console.log('APIP: ', data); 
      // Wifi.getStatus((status) => { console.log('Status: ', status); });
      // createWebServer2();
      try {
        createDgramServer();
      } catch (exc) {
        console.log(exc);
      }
    });
    // Wifi.scan((err, data) => { processAccessPoints(err, data); });
  });
}


function onInit2() {
  console.log('OnInit');
  
  Wifi.connect('Black-TP-Link_0BF4', {password:'DelayFinish88'}, (err) => {
    if (err) throw err;
    console.log("Connected");
    Wifi.getIP((err, data) => { console.log('IP: ', data); });
    createWebServer();
  });
  
}

setTimeout(()=> { onInit(); }, 1000);