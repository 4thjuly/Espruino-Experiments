setInterval(function() {
  digitalWrite(LED1, Math.random()>0.5);
  digitalWrite(LED2, Math.random()>0.5);
}, 100);
