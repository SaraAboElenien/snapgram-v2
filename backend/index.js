import dotenv from "dotenv";
import path from "path";
dotenv.config({path: path.resolve("config/.env")});

// Must run before express is imported — @sentry/node's Express
// auto-instrumentation patches the module at import time.
const { initSentry, Sentry } = await import('./helpers/sentry.js');
initSentry();

const { default: express } = await import('express');
const { initApp, allowedOrigins } = await import('./src/initApp.js');
const { initSocket } = await import('./src/socket.js');
const { logger } = await import('./helpers/logger.js');

// Previously unhandled entirely — a crash outside any request (e.g. a bad
// await in a timer/socket handler) would exit with no trace at all. Logs
// once, reports to Sentry, then exits; per Node's own guidance, the process
// is in an unknown state after an uncaught exception and shouldn't keep
// serving requests.
process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    Sentry.captureException(err);
    process.exit(1);
});
process.on('unhandledRejection', (err) => {
    logger.fatal({ err }, 'Unhandled rejection');
    Sentry.captureException(err);
    process.exit(1);
});

const app = express()

let port = process.env.PORT || 3000
initApp(app, express)

const server = app.listen(port, () => console.log(`running successfully on ${port}!`))
initSocket(server, allowedOrigins)


