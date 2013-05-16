var http = require('http'),
    url = require('url'),
    path = require('path'),
    fs = require('fs')
    port = process.argv[2] || 8888;

http.createServer(function(request, response) {

  var uri = url.parse(request.url).pathname
    , filename = path.join(process.cwd(), uri);

  fs.exists(filename, function(exists) {
    response.writeHead(200);
    response.write('<html><body><h1>Hello world!</h1></body></html>');
    response.end();
  });
}).listen(parseInt(port, 10));

console.log('Static file server running at\n  => http://localhost:' + port + '/\nCTRL + C to shutdown');