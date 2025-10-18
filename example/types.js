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
