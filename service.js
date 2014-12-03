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
  modelStoreService: usvc.facets.rpc.jsonClient(),
  locationService: usvc.facets.rpc.jsonClient({methodPrefix: 'Location.'}),

  // userspace message routing (MQTT -> service facets)
  userspaceRPCHook: require('./lib/userspace_rpc')([ 'userNotificationRPC', 'userModelStoreRPC', 'userLocationRPC' ]),

  // userspace RPC services
  userNotificationRPC: require('./lib/user_rpc/userNotificationRPC'),
  userModelStoreRPC: require('./lib/user_rpc/userModelStoreRPC'),
  userLocationRPC: require('./lib/user_rpc/userLocationRPC'),

  // external rest api
  frontendRest: usvc.facets.web.express(require('./lib/web'))
}).run();
