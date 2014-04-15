/* jshint browser:true */
'use strict';

var EventEmitter = require('events').EventEmitter;
var semver = require('./version');
var proto = require('./prototype');
var merge = require('./merge');
var configuration = require('./configuration');

function TownCrier(options) {
  var globalCfg = merge({}, this.constructor.config);
  this.options = merge(globalCfg, options);
  this.state = this.constructor.CLOSED;
}

TownCrier.prototype = new EventEmitter();
TownCrier.prototype.constructor = TownCrier;
Object.defineProperty(TownCrier, 'VERSION', {value:semver});
merge(TownCrier.prototype, proto);
merge(TownCrier, configuration);

module.exports = TownCrier;