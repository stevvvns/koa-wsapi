import { readdirSync } from 'fs';
import websocket from 'koa-easy-ws';
import * as msgpack from './transports/msgpack.js';
import { isLeft } from 'fp-ts/lib/Either.js';
import { PathReporter } from 'io-ts/lib/PathReporter.js';
import _ from 'lodash';

const { mapKeys, mapValues, camelCase } = _;

function camelCaseKeys(map) {
  return mapKeys(map, (val, key) => camelCase(key));
}
function camelCaseMap(map) {
  return mapValues(camelCaseKeys(map), (val) =>
    val?.constructor === Object ? camelCaseKeys(val) : val,
  );
}
function camelCaseBody(body) {
  if (Array.isArray(body)) {
    return body.map(camelCaseBody);
  }
  if (body?.constructor === Object) {
    return camelCaseMap(body);
  }
  return body;
}

export class PublicError extends Error {}

const actions = {};

export default async function attach({ app, path, transport, log }) {
  log?.info?.(`loading actions from ${path}`);
  for (const file of readdirSync(path).filter((file) => /[.]js$/.test(file))) {
    const { arg, default: impl } = await import(`${path}/${file}`);
    if (impl.name in actions) {
      throw new Error(`duplicate action name ${impl.name}`);
    }
    log?.info?.(`\t${impl.name}(${arg.name})`);
    actions[impl.name] = { arg, impl };
  }
  if (!transport) {
    transport = msgpack;
  }

  app.use(websocket());
  app.use(async (ctx, next) => {
    if (!ctx.ws) {
      return next(ctx);
    }
    const ws = await ctx.ws();
    ctx.req.socket.ignoreTimeout = true;
    ws.on('message', async (msg) => {
      const [data, transportCtx] = await (async () => {
        try {
          return await transport.decode(msg);
        } catch (ex) {
          log?.error?.('transport error', { ex });
          return [null, null];
        }
      })();
      if (
        !Array.isArray(data) ||
        data.length !== 3 ||
        typeof data[0] !== 'string' ||
        typeof data[1] !== 'string' ||
        data[2].constructor !== Object
      ) {
        ws.send(
          transport.encode([
            Array.isArray(data) && typeof data[0] === 'string' ? data[0] : null,
            { error: 'transport error' },
          ]),
        );
        return;
      }
      const [msgId, mtd, arg] = data;
      const reply = (msg) => ws.send(transport.encode([msgId, msg]));
      if (!(mtd in actions)) {
        reply({ error: 'unknown method' });
        return;
      }
      const parsedArg = actions[mtd].arg.decode(arg);
      if (isLeft(parsedArg)) {
        reply({ error: PathReporter.report(parsedArg) });
        return;
      }
      try {
        reply(
          camelCaseBody(
            await actions[mtd].impl(parsedArg.right, {
              ...(ctx.actionsContext ?? {}),
              ...transportCtx,
            }),
          ),
        );
      } catch (ex) {
        log?.error?.(ex.message, { ex });
        reply({
          error: ex instanceof PublicError ? ex.message : 'an error occurred',
        });
      }
    });
  });
}
