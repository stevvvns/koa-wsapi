import ReconnectingWebsocket from 'reconnecting-websocket';
import * as msgpack from './transports/msgpack';

let transport = msgpack;
let connected;

const inFlight = {};
const cache = {};
function wsMessage({ data }) {
  const [msgId, response] = transport.decode(data);
  if (msgId in inFlight) {
    inFlight[msgId].port.postMessage([msgId, response]);
    delete inFlight[msgId];
  }
  if (msgId in cache) {
    cache[cache[msgId].mtd][cache[msgId].key] = response;
    delete cache[msgId];
  }
}

const actions = {
  async call({ msgId, mtd, arg }, port, sock, log) {
    if (mtd in cache) {
      const key = msgpack.encode(arg).toBase64();
      if (key in cache[mtd]) {
        log?.debug('cache hit', msgId);
        port.postMessage([msgId, cache[mtd][key]]);
        return;
      }
      cache[msgId] = { mtd, key };
    }
    inFlight[msgId] = { port, mtd, arg };
    sock.send(transport.encode([msgId, mtd, arg]));
  },
  memoize(mtd) {
    if (!cache[mtd]) {
      cache[mtd] = {};
    }
  },
};

function connect(url, log) {
  if (connected) {
    return connected;
  }
  const sock = new ReconnectingWebsocket(url);
  sock.binaryType = 'arraybuffer';
  sock.onerror = log?.error ? log.error : () => {};
  function reset() {
    connected = new Promise((resolve) => {
      const onOpen = () => {
        resolve(sock);
        for (const [msgId, { port, mtd, arg }] of Object.entries(inFlight)) {
          log?.info(`retrying in-flight ${msgId}`);
          actions.call({ msgId, mtd, arg }, port, sock);
        }
        sock.removeEventListener('open', onOpen);
      };
      sock.addEventListener('open', onOpen);
    });
  }
  reset();
  sock.onclose = () => {
    reset();
  };
  sock.addEventListener('message', wsMessage);
  return connected;
}

export function initializer(callback) {
  let worker;
  return (evt) => {
    evt.ports[0].onmessage = ({ data }) => {
      if (!worker) {
        worker = apiWorker(callback(data));
        worker(evt);
      }
    };
  };
}

export default function apiWorker({ transport: customTransport, url, log }) {
  if (customTransport) {
    transport = customTransport;
  }
  if (!url) {
    url = location.origin.replace(/^http/, 'ws');
  }
  return (evt) => {
    const port = evt.ports[0];
    port.onmessage = async ({ data: [action, payload] }) => {
      try {
        await actions[action](payload, port, await connect(url, log), log);
      } catch (ex) {
        log?.error?.(ex);
      }
    };
    connect(url, log);
    port.start();
  };
}
