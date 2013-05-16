var fs      = require('fs'),
    port    = process.argv[2],
    express = require('express');

var app = express();
app.use(app.router);

app.get('/', function(request, response){
  console.log('Request received');
  response.send('<html><body><h1>Hello world! <small>' + new Date() + '</small></h1></body></html>');
});

console.log('Server running at\n  => http://localhost:' + port + '/\nCTRL + C to shutdown');

app.listen(port);