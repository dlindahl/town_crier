exports = module.exports = { transform:transform };

// TODO: This assumes that the message is a JSON string but does not have the
// Content-Type header set correctly. This is obviously a bad assumption.
function parsePayload(amqpMsg) {
  // var data = {};
  var data = amqpMsg.data.toString();

  try {
    data = JSON.parse(data);
  } catch(err) {
    // No-op
  }

  return data;
}

function transform(sub, payload, headers, deliveryInfo, rawMessage) {
  payload = parsePayload(payload);

  return {
    event : payload.type || sub.info.routingKey,
    data : {
      headers         : headers,
      exchange        : deliveryInfo.exchange,
      contentType     : deliveryInfo.contentType,
      routingKey      : deliveryInfo.routingKey,
      boundRoutingKey : sub.info.routingKey,
      payload         : payload
    }
  };
}