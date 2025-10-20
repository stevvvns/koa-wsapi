import start from '../../client/src';
const api = start({
  // this is the default
  worker: './worker.js',
  log: console,
});

// optional to cache responses/share between tabs
api.hello.memoize();

addEventListener('DOMContentLoaded', async () => {
  const ticksEl = document.createElement('p');
  const dl = document.createElement('dl');
  dl.style.fontFamily = 'monospace';
  document.body.appendChild(dl);
  document.body.appendChild(ticksEl);
  for (const [mtd, arg] of [
    ['hi', { name: 'world', enthusiasm: 1 }],
    ['hello', { name: 'world', enthusiasm: 1 }],
    ['hello', { enthusiasm: 1 }],
    ['hello', { name: 'everybody', enthusiasm: 10 }],
    ['hello', { name: 'everybody', enthusiasm: 3 }],
    ['hello', { name: 'everybody', enthusiasm: 3 }],
    ['hello', { enthusiasm: 4 }],
  ]) {
    let response;
    try {
      response = await api[mtd](arg);
    } catch (error) {
      response = { error };
    }
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dd.style.marginBottom = '1em';
    dt.textContent = `api.${mtd}(${JSON.stringify(arg)})`;
    dd.textContent = JSON.stringify(response);
    dl.appendChild(dt);
    dl.appendChild(dd);
  }
  // push events
  api.tick.subscribe({}, ({ ticks }) => (ticksEl.textContent = ticks));
});
