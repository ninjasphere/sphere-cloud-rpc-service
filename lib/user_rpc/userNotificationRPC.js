var debug = require('debug')('notification:rpc');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var when = require('when');
var whennode = require('when/node');

var PUSH_NOTIFICATION_CHANNEL_ID = 'cloud-push-notification';

function UserNotificationServiceFacet(service, name) {
  this.service = service;
  this.name = name;
}
util.inherits(UserNotificationServiceFacet, EventEmitter);

UserNotificationServiceFacet.prototype.initialise = function() {
  return this.service.facets('notificationService', 'amqp').spread(function (notificationService, amqp) {
    this._notificationService = notificationService;
    this._amqp = amqp;

    // bind to userspace MQTT (command bridge)
    var topic = ':userId.$cloud.device.:deviceId.channel.'+PUSH_NOTIFICATION_CHANNEL_ID;
    this._amqp.route(
      topic,
      {exchange:'amq.topic', queue: 'push_notification_device_bridge'},
      this._mapUserNotificationDisplayCommand.bind(this)
    );
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
  return this._handleStandardSubscriptionRPC('subscribeDeviceToTopic', rpc, deviceId, subscriber).then(function(response) {
    var channelId = PUSH_NOTIFICATION_CHANNEL_ID;

    // when we have a success, we announce a channel for the device magically
    var announcement = {
      topic: '$device/' + deviceId + '/channel/' + channelId,
      schema: 'http://schema.ninjablocks.com/protocol/notification',
      supportedMethods: ['display'],
      supportedEvents: [],
      id: channelId,
      protocol: 'notification',
      deviceId: deviceId,
      lastState: null
    };

    var wrappedAnnounce = { jsonrpc: "2.0", params: [announcement] };

    var topic = rpc.userId+'.$cloud.device.'+deviceId+'.channel.'+channelId+'.event.announce';
    var payload = new Buffer(JSON.stringify(wrappedAnnounce));

    this._amqp.publish('amq.topic', topic, payload);

    return response;
  }.bind(this));
};

UserNotificationServiceFacet.prototype._unsubscribeRPC = function(rpc, deviceId, subscriber) {
  // FIXME: when a user unsubscribes, the device channel should be revoked.
  // currently no message exists for un-announcing channels.
  return this._handleStandardSubscriptionRPC('unsubscribeDeviceFromTopic', rpc, deviceId, subscriber);
};

UserNotificationServiceFacet.prototype._mapUserNotificationDisplayCommand = function(amqMsg) {
  // FIXME: support this without copy-paste via the userspace_rpc facet
  var userId = amqMsg.params.userId;
  var deviceId = amqMsg.params.deviceId;

  var response = when.try(function() {
    var message = JSON.parse(amqMsg.content.toString());
    var topic = 'device_' + deviceId;

    // var pushText = message.params[0].title;

    var notifyResult = this._notificationService.call(
      'notification.sendNotificationToTopic',
      userId, // authenticated user ID (via mqtt-proxy)
      topic, // topic based on device id in topic (unsafe, but any topic is fine)
      message.params[0] // send the whole ninja notification payload!
    );

    return notifyResult.then(function(response) {
      // success, valid json rpc to pass through
      return { jsonrpc: "2.0", result: { success: response.success }, id: message.id };
    }.bind(this), function(err) {
      // error, something broke in the parsing
      debug('error', err);
      return { jsonrpc: "2.0", error: { message: 'Internal Error', code: -32000}, id: message.id };
    }.bind(this));
  }.bind(this));

  return response.then(function(response) {
    // send back the response on the amq.topic
    var topic = userId+'.$cloud.device.'+deviceId+'.channel.'+PUSH_NOTIFICATION_CHANNEL_ID+'.reply';
    var payload = new Buffer(JSON.stringify(response));

    debug('reply', response);

    return this._amqp.publish('amq.topic', topic, payload);
  }.bind(this));
};

module.exports = UserNotificationServiceFacet;
