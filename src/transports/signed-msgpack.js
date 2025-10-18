import msgpack from 'msgpack5/dist/msgpack5.js';
const mp = msgpack();
import nacl from 'tweetnacl';

const { sign } = nacl;

export const encode = mp.encode;

export function decode(msg) {
  const publicKey = msg.slice(0, sign.publicKeyLength);
  const body = msg.slice(sign.publicKeyLength);
  return [mp.decode(sign.open(body, publicKey)), { publicKey }];
}
