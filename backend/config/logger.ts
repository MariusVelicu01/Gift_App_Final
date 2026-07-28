import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  // Without this, logging `{ err }` serializes to `{}` — Error's message/stack aren't
  // enumerable own properties, so pino needs the stdlib serializer to pull them out.
  serializers: { err: pino.stdSerializers.err },
  // pino-http logs req.headers by default — without redaction, every authenticated
  // request would write the raw Bearer JWT straight into the logs (and from there,
  // into Sentry/any log aggregator).
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie'],
    censor: '[REDACTED]',
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
      }),
});
