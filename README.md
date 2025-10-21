# koa-wsapi

## What?
A system for publishing type-safe RPC and pub-sub over a websocket using [Koa](https://github.com/gcanti/io-ts), [Redis](https://github.com/redis/redis) and [io-ts](https://github.com/gcanti/io-ts).

## Why?
You want a websocket API and would like declarative checking of client parameters to simplify validation.

## How?
Check the [example app](./example).

In particular, on the server, make a folder for your actions, and then use this library to attach them with the websocket interface:

```javascript
import * as t from 'io-ts';

// see the io-ts docs for info about how to make more useful custom types
function isEnthusiasm(input) {
  return [1, 2, 3].includes(input);
}
export const enthusiasm = new t.Type(
  'enthusiasm',
  isEnthusiasm,
  (input, context) =>
    isEnthusiasm(input) ? t.success(input) : t.failure(input, context),
  t.identity,
);

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
  // set to false to disable pub-sub, omit to use this default
  redis: 'redis://localhost:6379'
});

// put anything you need here that you want available to your actions that you can't/don't want to import separately
app.context.actionsContext = { greeting: 'Hello' };

```

On the client side, there are two parts, your main thread app:

```javascript
const api = start({
  // this is the default
  worker: './worker.js',
  log: console,
});

// optional to cache responses or share them between tabs
api.hello.memoize();
```

and a shared worker:

```javascript
onconnect = apiWorker({
  // should probably persist the key in localStorage or something to be any use
  transport: signedMsgpack(sign.keyPair()),
  // this is the default
  url: location.origin.replace(/^http/, 'ws'),
  log: console,
});
```

after which:
```javascript
await api.hello({ name: 'world', enthusiasm: 2 });
// {"message":"Hello, world! (and hello, 9VEllJ9pbQeaP4dFgffFqxUnv1OVvm8CS3kFCU68ZPQ=!)"}
await api.hello({ enthusiasm: 4 });
// {"error":[
//    "Invalid value undefined supplied to : { name: string, enthusiasm: enthusiasm }/name: string",
//    "Invalid value 4 supplied to : { name: string, enthusiasm: enthusiasm }/enthusiasm: enthusiasm"
// ]}
```

### pub-sub

Consider an action, `tick.js`:

```javascript
import * as t from 'io-ts';

export const arg = t.type({});

let interval;
export default function tick(_, { channels, sock }) {
  if (!interval) {
    let ticks = 0;
    interval = setInterval(() => channels.pub('tick', { ticks: ++ticks }), 1000);
  }
  channels.connectSocket('tick', sock);
}
```

The client can now call:
```javascript
const [result, unsubscribe] = api.tick.subscribe({}, console.log)
```

Which will log incrementing `{ ticks: N }` every second until `unsubscribe` is called.
