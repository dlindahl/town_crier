/* jshint browser:true, node:true */
/* globals define */
'use strict';

if (typeof define === 'function' && define.amd) {
  define('./src/client');
} else if (typeof module === 'object' && module.exports) {
  module.exports = require('./src/client');
}