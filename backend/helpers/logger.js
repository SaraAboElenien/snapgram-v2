import pino from 'pino';
import pinoHttp from 'pino-http';

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Pretty-printed console output only in local dev; real newline-delimited
// JSON everywhere else (production logs get shipped/grepped as JSON, tests
// stay silent so `npm test` output isn't drowned in request logs).
export const logger = pino({
  level: isTest ? 'silent' : (process.env.LOG_LEVEL || 'info'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.confirmPassword',
      'res.headers["set-cookie"]',
    ],
    censor: '[REDACTED]',
  },
  ...(isProd || isTest ? {} : {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
    },
  }),
});

// Correlates every log line produced while handling a request (including
// ones logged manually via req.log in controllers/error handling) under one
// request ID — reuses an inbound X-Request-Id if a proxy/load balancer
// already set one, otherwise generates one and echoes it back on the
// response so a user-reported error can be grepped straight out of the logs.
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const id = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
