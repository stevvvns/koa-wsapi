import * as redis from '@redis/client';
import msgpack from 'msgpack5/dist/msgpack5.js';
import { Buffer } from 'node:buffer';

const { encode, decode } = msgpack();

export default async function pubsub({ redisUrl, transport, log }) {
  const connect = () =>
    redis
      .createClient({ url: redisUrl })
      .on('error', (ex) =>
        log?.error?.('failed connection to redis', { ex, redisUrl }),
      )
      .connect();

  const dbh = {
    pub: await connect(),
    sub: await connect(),
  };

  const pub = (channel, data) =>
    dbh.pub.publish(channel, Buffer.from(encode(data)), true);

  const dispatch = {};
  const sub = async (channel, cb) => {
    if (!(channel in dispatch)) {
      dispatch[channel] = [];
      await dbh.sub.subscribe(
        channel,
        (msg, channel) => {
          const channelStr = channel.toString('utf8');
          const data = decode(msg);
          for (const listener of dispatch[channel]) {
            listener(data, channelStr);
          }
        },
        true,
      );
    }
    dispatch[channel].push(cb);
    return () => {
      dispatch[channel] = dispatch[channel].filter(
        (listener) => listener !== cb,
      );
      if (dispatch[channel].length === 0) {
        delete dispatch[channel];
        dbh.sub.unsubscribe(channel);
      }
    };
  };

  const socketUnsub = {};
  const connectSocket = (channel, sock, cb = null) => {
    if (!(sock._id in socketUnsub)) {
      socketUnsub[sock._id] = [];
    }
    socketUnsub[sock._id].push(
      sub(channel, (msg, channel) => {
        if (cb) {
          const res = cb(msg, channel);
          if (res) {
            sock.send(transport.encode([channel, res]));
          }
        } else {
          sock.send(transport.encode([channel, msg]));
        }
      }),
    );
  };
  const closeSocket = (sock) => {
    if (sock._id in socketUnsub) {
      for (const unsub of socketUnsub[sock._id]) {
        unsub();
      }
    }
  };

  return { pub, sub, connectSocket, closeSocket };
}
