process.title = 'sphere-cloud-rpc';

if (process.env.BUGSNAG_KEY) {
  var bugsnag = require("bugsnag");
  bugsnag.register(process.env.BUGSNAG_KEY, { releaseStage: process.env.USVC_CONFIG_ENV || 'development' });
}

var usvc = require('usvc');

var service = usvc.microService({
  // bus connections
  amqp: usvc.facets.msg.amqp(),

  // internal cloud RPC
  notificationService: usvc.facets.rpc.jsonClient(),

  // userspace message routing (MQTT -> service facets)
  userspaceRPCHook: require('./lib/userspace_rpc')([ 'userNotificationRPC' ]),

  // userspace RPC services
  userNotificationRPC: require('./lib/user_rpc/userNotificationRPC'),
}).run();
