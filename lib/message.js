// TODO: This assumes that the message is a JSON string but does not have the
// Content-Type header set correctly. This is obviously a bad assumption.
function parsePayload(M) {
  var data = M.message.data.toString();

  try {
    data = JSON.parse(data);
  } catch(err) {
    // No-op
  }

  return data;
}

function toJSON() {
  var payload = parsePayload(this);

  return {
    event : payload.type || this.routingKey,
    id    : +new Date(),
    data  : {
      headers         : this.headers,
      exchange        : this.deliveryInfo.exchange,
      contentType     : this.deliveryInfo.contentType,
      routingKey      : this.routingKey,
      boundRoutingKey : this.boundKey,
      payload         : payload
    }
  };
}

function Message(boundKey, message, headers, deliveryInfo, rawMessage) {
  this.boundKey     = boundKey;
  this.message      = message;
  this.headers      = headers;
  this.deliveryInfo = deliveryInfo;
  this.rawMessage   = rawMessage;

  this.__defineGetter__('routingKey', function() {
    return deliveryInfo.routingKey || rawMessage.routingKey;
  });
}

Message.prototype.toJSON = toJSON;

module.exports = Message;