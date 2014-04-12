/* jshint node:true, strict:false */
var util = require('util');
var errors = require('./errors');

if(!process.env.NODE_ENV) {
  throw new errors.InvalidConfiguration(
      'The Node.js environment must be declared by setting the NODE_ENV' +
      ' environment variable'
    );
}

var express = require('express');
var middleware = require('./middleware.js');
var router = new express.Router();

module.exports = function townCrier(options) {
  options = options || {};
  options.middleware = options.middleware || [];
  if(util.isArray(options.middleware)) {
    options.middleware = [options.middleware];
  }

  router.get('/:app_name', options.middleware, middleware(options));

  return router.middleware;
};