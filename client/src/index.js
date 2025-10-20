import { v4 as uuid } from 'uuid';
const inFlight = {};

export default function start({ worker: workerUrl, log, ws: wsUrl, initMsg }) {
  log?.info?.('start', workerUrl);
  let msgLog = () => {};
  if (log?.debug) {
    msgLog = (msgId, mtd, body) => {
      const isError = mtd === null && 'error' in body;
      log.debug(
        `%c ${mtd ? '>' : '<'} %c ${msgId}\n%c${mtd ?? ''}%c${mtd ? '(' : ''}${isError ? '%c' : ''}${JSON.stringify(body, (_key, val) => (typeof val === 'bigint' ? Number(val) : val), 2)}${isError ? '%c' : ''}${mtd ? ')' : ''}`,
        `background: ${mtd ? 'purple' : isError ? 'red' : 'green'}; font-weight: bold; color: white; border-radius: 3px;`,
        'color: gray',
        'font-weight: bold',
        'color: #555',
        ...(isError
          ? ['color: darkred; font-weight: bold', 'color: gray']
          : []),
      );
    };
  }
  const worker = new SharedWorker(
    new URL(workerUrl ?? './worker.js', import.meta.url),
    { type: 'module' },
  );
  worker.onerror = log?.error ? log.error : () => {};
  worker.port.onmessage = ({ data: [msgId, response] }) => {
    msgLog(msgId, null, response);
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
  if (initMsg) {
    worker.port.postMessage(initMsg);
  }
  return new Proxy(
    {},
    {
      get(_target, mtd) {
        const rv = (arg = {}) =>
          new Promise((resolve, reject) => {
            const msgId = uuid();
            inFlight[msgId] = { resolve, reject };
            msgLog(msgId, mtd, arg);
            worker.port.postMessage(['call', { msgId, mtd, arg }]);
          });
        rv.memoize = () => {
          worker.port.postMessage(['memoize', mtd]);
        };
        return rv;
      },
    },
  );
}
