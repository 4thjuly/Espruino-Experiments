var wifi = require("Wifi");

wifi.on('connected', () => {
  console.log('connected'); 
  wifi.getIP((err, d) => { console.log('IP: ', d); } );
  wifi.getAPIP( (info) => { console.log('getAPIP: ', info); } );
});

wifi.on('disconnected', (details) => {
  console.log('disconnected:', details); 
});

wifi.startAP('EspruinoAP', { password: '0123456789', authMode: 'open' }, function(err) {
  if (err) throw err;
  console.log("Connected!");
  wifi.getAPIP( (info) => { console.log('getAPIP: ', info); } );
  // console.log('debug: ', wifi.debug());
});