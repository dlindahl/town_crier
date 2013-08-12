var fs      = require('fs'),
    util    = require('util'),
    http    = require('http'),
    express = require('express'),
    amqp    = require('amqp'),
    when    = require('when');

var townCrier = require('./index.js');

var auth = function(req, res, next) {
  if(req.query && req.query.token == process.env.AUTH_TOKEN) {
    next();
  } else {
    return util.unauthorized(res, 'Authorization Required');
  }
};

var app = express();
app.set('port', process.argv[2] || process.env.PORT || 3000);
app.use(express.logger('dev'));
app.use(express.cookieParser(process.env.SESSION_SECRET));
app.use(express.session({secret: process.env.SESSION_SECRET}));
app.use('/firehose', townCrier({ middleware:auth }));
app.use(app.router);
app.use(express.static(__dirname + '/public'));

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server running at\n  => http://localhost:' + app.get('port') + '/\nCTRL + C to shutdown\n');
});