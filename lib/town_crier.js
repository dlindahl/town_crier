var util        = require('util'),
    express     = require('express'),
    streamer    = require('./streamer.js'),
    eventsource = require('./eventsource/amqp'),
    router      = new express.Router();

var es_opts = {
  exchanges:['notes','order_status'] // Adds as option in server.js middleware declaration
};

var es = eventsource(es_opts);

module.exports = function townCrier(options) {
  options = options || {};
  options.middleware = options.middleware || [];
  if(util.isArray(options.middleware)) {
    options.middleware = [options.middleware];
  }

  router.get('/:app_name/:routing_key', options.middleware, streamer(es, options));

  return router.middleware;
};