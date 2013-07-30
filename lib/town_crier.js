var express  = require('express'),
    streamer = require('./streamer.js'),
    router   = new express.Router();

module.exports = function townCrier(options) {
  options = options || {};

  router.get('/:exchange/:routing_key', streamer);

  return router.middleware;
};