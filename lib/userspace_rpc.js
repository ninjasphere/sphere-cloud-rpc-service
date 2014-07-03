var debug = require('debug')('rpc-service:userspace');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var when = require('when');
var whennode = require('when/node');

// $cloud/ninja/services/rpc/<registered/method>

function NotificationRouterFacet(facetNames, service, name) {
  this.facetNames = facetNames;
  this.service = service;
  this.name = name;
}
util.inherits(NotificationRouterFacet, EventEmitter);

NotificationRouterFacet.prototype.initialise = function() {
  var dependencies = this.service.facets.apply(this.service, this.facetNames);
  var amqp = this.service.facet('amqp');

  return when.all([dependencies, amqp]).spread(function(exportedFacets, amqp) {
    this.amqp = amqp;

    exportedFacets.map(function(facet) {
      facet.getUserspaceRPCMethods(this);
    }.bind(this));
  }.bind(this));
};

NotificationRouterFacet.prototype.register = function(methodPath, handler) {
  debug('register', methodPath);

  var topic = '$cloud.:userId.ninja.services.rpc.' + methodPath;

  // bind to userspace MQTT
  this.amqp.route(
    topic,
    {exchange:'amq.topic', queue: methodPath.replace(':', '')},
    this._handleIncomingRPC.bind(this, handler, { topic: topic })
  );
};

NotificationRouterFacet.prototype._handleIncomingRPC = function(handler, options, amqMsg) {
  debug(options.topic, 'Received on topic');

  var attemptRPC = when.try(function() {
    var userId = amqMsg.params.userId;
    var message = JSON.parse(amqMsg.content.toString());

    if (typeof message.id === 'undefined') {
      return this._errors.parseError(null);
    }

    if (!message.jsonrpc || message.jsonrpc != '2.0') {
      return this._errors.parseError(message.id);
    }

    if (!message.params || !(message.params instanceof Array)) {
      return this._errors.invalidRequest(message.id);
    }

    if (typeof message.method !== 'undefined') {
      return this._errors.methodNotAllowed(message.id);
    }

    // got valid request!
    var params = [{ userId: userId, params: amqMsg.params }];
    params.push.apply(params, message.params);
    var result = handler.apply(undefined, params);

    return when(result).then(function(result) {
      // handler returned a result
      return {"jsonrpc": "2.0", "result": (typeof result == 'undefined' ? null : result), "id": message.id};
    }, function (err) {
      // handler threw an unhandled error
      debug(options.topic, 'Internal error');
      return this._errors.internalError(message.id);
    }.bind(this));
  }.bind(this));

  var response = attemptRPC.then(function(response) {
    // success, valid json rpc to pass through
    return response;
  }.bind(this), function(err) {
    // error, something broke in the parsing
    debug(options.topic, 'Parse error', err);
    return this._errors.parseError(null);
  }.bind(this));

  return response.then(function(response) {
    // send back the response on the amq.topic
    var topic = options.topic.replace(':userId', amqMsg.params.userId) + '.reply';
    var payload = new Buffer(JSON.stringify(response));

    debug(options.topic, 'Publishing');

    return this.amqp.publish('amq.topic', topic, payload);
  }.bind(this));
  

  return this.notificationService.sendNotificationToTopic(userId, topicId, message);
};

NotificationRouterFacet.prototype._errors = {
  parseError: function(id) {
    return {"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": id};
  },
  invalidRequest: function(id) {
    return {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": id};
  },
  internalError: function(id) {
    return {"jsonrpc": "2.0", "error": {"code": -32000, "message": "Internal Error"}, "id": id};
  },
  methodNotAllowed: function(id) {
    return {"jsonrpc": "2.0", "error": {"code": 10000, "message": "The 'method' key is not supported, use topic names instead."}, "id": id};
  },
};

module.exports = function(facetNames) {
  return NotificationRouterFacet.bind(undefined, facetNames);
};

