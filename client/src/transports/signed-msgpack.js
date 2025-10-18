import { encode, decode } from './msgpack';
import { sign } from 'tweetnacl';

export default function signedMsgpack(keys) {
  return {
    encode(msg) {
      const signed = sign(encode(msg), keys.secretKey);
      const signedWithPub = new Uint8Array(
        signed.length + keys.publicKey.length,
      );
      signedWithPub.set(keys.publicKey);
      signedWithPub.set(signed, keys.publicKey.length);
      return signedWithPub;
    },
    decode,
  };
}
