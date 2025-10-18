import ReconnectingWebsocket from 'reconnecting-websocket';
import * as msgpack from './transports/msgpack';

let transport = msgpack;
let connected;

const inFlight = {};
function wsMessage({ data }) {
  const [msgId, response] = transport.decode(data);
  console.log({ msgId, response, inFlight });
  if (msgId in inFlight) {
    inFlight[msgId].port.postMessage([msgId, response]);
    delete inFlight[msgId];
  }
}

const actions = {
  async call({ msgId, mtd, arg }, port, sock) {
    console.log('call', mtd, arg);
    inFlight[msgId] = { port, mtd, arg };
    sock.send(transport.encode([msgId, mtd, arg]));
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
    connected = new Promise((resolve) =>
      sock.addEventListener('open', () => {
        log?.info('ws connected');
        resolve(sock);
        for (const { port, mtd, arg } of Object.values(inFlight)) {
          console.log('timeout retry', mtd);
          actions.call({ mtd, arg }, port, sock);
        }
      }),
    );
  }
  reset();
  sock.onclose = () => {
    log?.info('lost ws connection');
    reset();
  };
  sock.addEventListener('message', wsMessage);
  return connected;
}

export default function apiWorker({ transport: customTransport, url, log }) {
  if (customTransport) {
    transport = customTransport;
  }
  return (evt) => {
    const port = evt.ports[0];
    port.onmessage = async ({ data: [action, payload] }) => {
      try {
        await actions[action](
          payload,
          port,
          await connect(url ?? location.origin.replace(/^http/, 'ws'), log),
        );
      } catch (ex) {
        console.error(ex);
      }
    };
    port.start();
  };
}
