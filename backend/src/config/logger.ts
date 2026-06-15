import pino from 'pino';
import { Transform } from 'stream';

const levelLabels: Record<number, string> = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
};

const prettyStream = new Transform({
  objectMode: true,
  transform(chunk, _encoding, callback) {
    try {
      const obj = JSON.parse(chunk.toString());
      const time = obj.time || new Date().toISOString();
      const level = levelLabels[obj.level] || 'info';
      const pid = obj.pid || process.pid;

      let detail = '';
      if (obj.req?.method) {
        const rt = obj.responseTime ? ` ${obj.responseTime}ms` : '';
        detail = `${obj.req.method} ${obj.req.url} ${obj.res?.statusCode || ''}${rt}`;
      } else {
        detail = obj.msg || '';
      }

      let errInfo = '';
      if (obj.err) {
        errInfo = ` {"exception":${JSON.stringify({ message: obj.err.message, stack: obj.err.stack })}}`;
      }

      callback(null, `<${time}> ${level} [${pid}] - ${detail}${errInfo}\n`);
    } catch {
      callback(null, chunk);
    }
  },
});

prettyStream.pipe(process.stdout);

export const logger = pino(
  {
    level: process.env.NODE_ENV === 'test' ? 'silent' : process.env.LOG_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  prettyStream,
);
