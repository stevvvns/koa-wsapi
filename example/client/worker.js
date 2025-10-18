import apiWorker from '../../client/src/worker';
import signedMsgpack from '../../client/src/transports/signed-msgpack';
import { sign } from 'tweetnacl';

onconnect = apiWorker({
  transport: signedMsgpack(sign.keyPair()),
  // this is the default
  url: location.origin.replace(/^http/, 'ws'),
  log: console,
});
