var util     = require('util'),
    express  = require('express'),
    streamer = require('./streamer.js'),
    router   = new express.Router();

module.exports = function townCrier(options) {
  options = options || {};
  options.middleware = options.middleware || [];
  if(util.isArray(options.middleware)) {
    options.middleware = [options.middleware];
  }

  router.get('/:exchange/:routing_key', options.middleware, streamer);

  return router.middleware;
};