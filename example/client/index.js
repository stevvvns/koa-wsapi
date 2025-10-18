import start from '../../client/src';
const api = start({
  // default
  worker: './worker.mjs',
  log: console,
});
document.body.innerText = (await api.hello({ name: 'world' })).message;
