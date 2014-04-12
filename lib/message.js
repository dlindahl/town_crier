/* jshint node:true, strict:false */
var util = require('util');
var extend = require('node.extend');
var proto = {};

exports = module.exports = createMessage;

proto.transform = function transform() {
  return {
    id : null,
    event : null,
    data : {}
  };
};

proto.toJSON = function toJSON() {
  return {
    id : this.id,
    event : this.event,
    data : this.data
  };
};

exports.proto = proto;

function createMessage(args) {
  function message(args) {
    var params = {};

    if(util.isArray(args)) {
      params = this.transform.apply(this, args);
    } else {
      params = args;
    }

    this.id = params.id || +new Date();
    this.event = params.event;
    this.data = params.data;
  }
  extend(message.prototype, proto);
  return new message(args);
}