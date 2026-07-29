import pino from 'pino';
import pinoHttp from 'pino-http';

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Pretty-printed console output only in local dev; real newline-delimited
// JSON everywhere else (production logs get shipped/grepped as JSON, tests
// stay quiet at 'error' so `npm test`/E2E output isn't drowned in routine
// per-request info logs — but a genuine 500 still surfaces. Fully silencing
// this (as an earlier version did) meant a real backend error during the
// E2E CI job left zero trace anywhere, the exact gap that made ADR-030's
// CI failure take two extra round-trips to diagnose.
export const logger = pino({
  level: isTest ? 'error' : (process.env.LOG_LEVEL || 'info'),
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
