var fs      = require('fs'),
    http    = require('http'),
    express = require('express'),
    amqp    = require('amqp'),
    when    = require('when');

var townCrier = require('./index.js');

var connectToAmqp = function() {
  var deferred = when.defer(),
      connection = amqp.createConnection({
        host:      process.env.AMQP_HOST,     // TODO: Make these more configurable
        login:     process.env.AMQP_USERNAME,
        password:  process.env.AMQP_PASSWORD,
        port:      5672,
        ssl:       { enabled : false },
        vhost:     '/',
        authMechanism: 'AMQPLAIN'
      });

  connection.on('error', deferred.reject);
  connection.on('ready', function() {
    deferred.resolve(connection);
  });

  return deferred.promise;
}();

var app = express();
app.set('port', process.argv[2] || process.env.PORT || 3000);
app.use(express.logger('dev'));
app.use(express.cookieParser('your secret here'));
app.use(express.session({secret: '1234567890QWERTY'}));
app.use(townCrier({ mount:'/firehose' }));
app.use(app.router);
app.use(express.static(__dirname + '/public'));

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

app.get('/', function(request, response){
  console.log('Request received');
  response.send('<html>' +
    '<script src="stream.js"></script>' +
    '<body>' +
      '<h1>Hello world! <small>' + new Date() + '</small></h1>' +
      '<div id="stream"></div>' +
    '</body></html>'
  );
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server running at\n  => http://localhost:' + app.get('port') + '/\nCTRL + C to shutdown\n');
});