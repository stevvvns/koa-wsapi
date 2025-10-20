import * as t from 'io-ts';

export const arg = t.type({});

let interval;

export default function tick(_, { channels, sock }) {
  if (!interval) {
    let ticks = 0;
    interval = setInterval(() => channels.pub('tick', { ticks: ++ticks }), 1000);
  }
  channels.connectSocket('tick', sock);
}
