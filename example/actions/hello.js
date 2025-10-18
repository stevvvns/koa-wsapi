import * as t from 'io-ts';

export const arg = t.type({
  name: t.string,
});

export default function hello({ name }, { greeting, publicKey }) {
  return {
    message:
      `${greeting}, ${name}!` +
      (publicKey
        ? ` (and ${greeting.toLowerCase()}, ${publicKey.toString('base64')})`
        : ''),
  };
}
