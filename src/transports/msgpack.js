import msgpack from 'msgpack5/dist/msgpack5.js';
const mp = msgpack();
export const encode = mp.encode;
export function decode(msg) {
  return [mp.decode(msg), {}];
}
