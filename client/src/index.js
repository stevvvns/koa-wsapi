import { v4 as uuid } from 'uuid';
const inFlight = {};

export default function start({ worker: workerUrl, log, ws: wsUrl }) {
  log?.info('start', workerUrl);
  const worker = new SharedWorker(
    new URL(workerUrl ?? './worker.mjs', import.meta.url),
    { type: 'module' },
  );
  worker.onerror = log?.error ? log.error : () => {};
  worker.port.onmessage = ({ data: [msgId, response] }) => {
    if (msgId in inFlight) {
      if ('error' in response) {
        inFlight[msgId].reject(response.error);
      } else {
        inFlight[msgId].resolve(response);
      }
      delete inFlight[msgId];
    }
  };
  worker.port.start();
  return new Proxy(
    {},
    {
      get(_target, mtd) {
        return (arg = {}) =>
          new Promise((resolve, reject) => {
            const msgId = uuid();
            inFlight[msgId] = { resolve, reject };
            worker.port.postMessage(['call', { msgId, mtd, arg }]);
          });
      },
    },
  );
}
