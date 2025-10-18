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
