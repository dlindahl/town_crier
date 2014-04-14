/* jshint browser:true */
'use strict';

var merge = require('./merge');
var errors = require('./errors');
var ES = window.EventSource;
var classMethods = {
  ERROR: -1,
  CLOSED: ES.CLOSED,
  CONNECTING: ES.CONNECTING,
  OPEN: ES.OPEN,
  config: {
    url: null,
    token: null,
    userId: null,
    retryInterval: 3000
  }
};

// Global config settings
classMethods.configure = function configure(options) {
  return merge(classMethods.config, options);
};

classMethods.validateConfiguration = function validateConfiguration(opts) {
  var errs = [];

  if(!opts.url || (opts.url && !/\S/.test(opts.url))) {
    errs.push('URL cannot be blank');
  }

  if(!opts.bindings || (opts.bindings && !opts.bindings.length) || opts.bindings.length === 0) {
    errs.push('Bindings cannot be empty');
  } else {
    opts.bindings.forEach(function(binding) {
      if(!binding.exchange || !/\S/.test(binding.exchange)) {
        errs.push('Binding exchange cannot be blank');
        return false;
      } else if(!binding.routingKey || !/\S/.test(binding.routingKey)) {
        errs.push('Binding routing key cannot be blank');
        return false;
      }
    });
  }

  if(errs.length > 0) throw new errors.InvalidConfiguration(errs.join(', '));
};

module.exports = classMethods;