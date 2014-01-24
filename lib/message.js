var util   = require('util'),
    extend = require('node.extend');

exports = module.exports = createMessage;

var proto = {};

proto.transform = function transform(args) {
  return {
    id    : null,
    event : null,
    data  : {}
  };
};

proto.toJSON = function toJSON() {
  return {
    id    : this.id,
    event : this.event,
    data  : this.data
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

    this.id    = params.id || +new Date();
    this.event = params.event;
    this.data  = params.data;
  }
  extend(message.prototype, proto);
  return new message(args);
}