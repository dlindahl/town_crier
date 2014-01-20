var util     = require('util'),
    errors   = require('./errors');

if(!process.env.NODE_ENV) {
  throw new errors.InvalidConfiguration(
      'The Node.js environment must be declared by setting the NODE_ENV' +
      ' environment variable'
    );
}

var express  = require('express'),
    streamer = require('./streamer.js'),
    router   = new express.Router();

module.exports = function townCrier(options) {
  options = options || {};
  options.middleware = options.middleware || [];
  if(util.isArray(options.middleware)) {
    options.middleware = [options.middleware];
  }

  router.get('/:app_name', options.middleware, streamer(options));

  return router.middleware;
};