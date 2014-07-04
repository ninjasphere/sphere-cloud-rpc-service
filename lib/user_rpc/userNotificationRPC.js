var debug = require('debug')('notification:rpc');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var when = require('when');
var whennode = require('when/node');

function UserNotificationServiceFacet(service, name) {
  this.service = service;
  this.name = name;
}
util.inherits(UserNotificationServiceFacet, EventEmitter);

UserNotificationServiceFacet.prototype.initialise = function() {
  return this.service.facets('notificationService', 'amqp').spread(function (notificationService, amqp) {
    this._notificationService = notificationService;
    this._amqp = amqp;
  }.bind(this));
};

UserNotificationServiceFacet.prototype.getUserspaceRPCMethods = function(rpcBroker) {
  rpcBroker.register('notification.subscribe', this._subscribeRPC.bind(this));
  rpcBroker.register('notification.unsubscribe', this._unsubscribeRPC.bind(this));
};

UserNotificationServiceFacet.prototype._handleStandardSubscriptionRPC = function(remoteMethod, rpc, deviceId, subscriber) {
  if (typeof deviceId !== 'string') throw new rpc.JSONRPCError('deviceId must be a string');
  if (typeof subscriber !== 'object') throw new rpc.JSONRPCError('subscriber must be an object');

  if (typeof subscriber.platform !== 'string') throw new rpc.JSONRPCError('subscriber.platform must be a string');
  if (typeof subscriber.environment !== 'string') throw new rpc.JSONRPCError('subscriber.environment must be a string');
  if (typeof subscriber.token !== 'string') throw new rpc.JSONRPCError('subscriber.token must be a string');

  debug(remoteMethod, 'for user', rpc.userId, 'device', deviceId);

  var internalResponse = this._notificationService.call(
    'notification.' + remoteMethod,
    rpc.userId, // authenticated user ID (via mqtt-proxy)
    'device_' + deviceId, // any "topic" is really fine, they are prefixed by user
    {
      platform: subscriber.platform,
      environment: subscriber.environment,
      token: subscriber.token,
    }
  );

  return internalResponse.then(function(response) {
    return {
      success: response.success, // only share success with userspace, not ARN etc
    };
  });
};

UserNotificationServiceFacet.prototype._subscribeRPC = function(rpc, deviceId, subscriber) {
  return this._handleStandardSubscriptionRPC('subscribeDeviceToTopic', rpc, deviceId, subscriber);
};

UserNotificationServiceFacet.prototype._unsubscribeRPC = function(rpc, deviceId, subscriber) {
  return this._handleStandardSubscriptionRPC('unsubscribeDeviceFromTopic', rpc, deviceId, subscriber);
};

module.exports = UserNotificationServiceFacet;
