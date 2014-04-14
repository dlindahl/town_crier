/* jshint browser:true */
'use strict';

module.exports = function merge(defaults, options) {
  defaults = defaults || {};
  options = options || {};

  Object.keys(options).forEach(function(k) {
    if('undefined' !== typeof options[k]) {
      defaults[k] = options[k];
    }
  });

  return defaults;
};