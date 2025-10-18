# koa-wsapi

## What?
A system for publishing type-safe APIs over a websocket using [Koa](https://github.com/gcanti/io-ts) and [io-ts](https://github.com/gcanti/io-ts).

## Why?
You want a simple way to do RPC type stuff in your JS app and would like declarative checking of client parameters to simplify validation.

## How?
Check the [example app](./example).

In particular, on the server, make a folder for your actions, and then use this library to attach them with the websocket interface:

```javascript
import * as t from 'io-ts';
// custom type
import { enthusiasm } from '../types.js';

export const arg = t.type({
  name: t.string,
  enthusiasm: enthusiasm
});

export default function hello({ name, enthusiasm }, { greeting, publicKey }) {
  const punc = { 1: '.', 2: '!', 3: '!!!' }[enthusiasm];
  return {
    message:
      `${greeting}, ${name}${punc}` +
      (publicKey
        ? ` (and ${greeting.toLowerCase()}, ${publicKey.toString('base64')}${punc})`
        : ''),
  };
}
```

```javascript
const app = new Koa();

await attachActions({
  app,
  path: resolve('actions'),
  // you can omit this, provide an entire console-like object, or provide only the log levels you want to see
  log: { info: console.info, error: console.error },
  // by default this uses msgpack, you can use signed msgpack if it's useful to you to have unique identifiers for each client
  transport: signedMsgpack,
});

// put anything you need here that you want available to your actions that you can't/don't want to import separately
app.context.actionsContext = { greeting: 'Hello' };

```

On the client side, there are two parts, your main thread app:

```javascript
const api = start({
  // this is the default
  worker: './worker.mjs',
  log: console,
});

// optional to cache responses/share between tabs
api.hello.memoize();

console.log(await api.hello({ name: 'world', enthusiasm: 2 }));
```

and a shared worker:

```javascript
onconnect = apiWorker({
  // should probably perist the key in localStorage or something to be any use
  transport: signedMsgpack(sign.keyPair()),
  // this is the default
  url: location.origin.replace(/^http/, 'ws'),
  log: console,
});
```
