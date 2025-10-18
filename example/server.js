import Koa from 'koa';
import http from 'node:http';
import serve from 'koa-static';
import attachActions from '../src/index.js';
import * as signedMsgpack from '../src/transports/signed-msgpack.js';
import path from 'node:path';

const app = new Koa();

function resolve(relative) {
  return path.resolve(import.meta.dirname, relative);
}

app.context.actionsContext = { greeting: 'Hello' };
await attachActions({
  app,
  path: resolve('actions'),
  // you can omit this, provide an entire console-like object, or provide only the log levels you want to see
  log: { info: console.info, error: console.error },
  // by default this uses msgpack, you can use signed msgpack if it's useful to you to have unique identifiers for each client
  transport: signedMsgpack,
});

app.use(serve(resolve('client/dist')));

const port = process.env.NODE_PORT ?? 3333;
console.log(`http://localhost:${port}`);

app.listen(port).on('clientError', (error, socket) => {
  if (error.code === 'ERR_HTTP_REQUEST_TIMEOUT' && socket.ignoreTimeout) {
    return;
  }

  console.warn(`client error:`, error);
  socket.destroy();
});
