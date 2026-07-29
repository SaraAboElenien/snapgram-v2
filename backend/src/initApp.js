import { connection } from '../db/connection.js'
import { AppError } from '../helpers/classError.js'
import { globleErrorHandling } from '../helpers/globleErrorHandling.js'
import * as routers from '../src/modules/index.routes.js'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { httpLogger } from '../helpers/logger.js'
import * as Sentry from '@sentry/node'
import mongoose from 'mongoose'
import swaggerUi from 'swagger-ui-express'
import { openApiSpec } from '../docs/openapi.js'

export const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://snapgram-nu-green.vercel.app',
];

// Builds the app (routes, middleware) with no side effects beyond that —
// no DB connection. Split out from initApp so tests can reuse the exact
// same route/middleware wiring against a test-managed DB connection,
// without initApp's own connection() call trying to connect a second time.
export const configureApp = (app, express) => {
  // helmet/httpLogger must be registered before any route (including / and
  // /health) — otherwise those specific routes never pass through them,
  // found live 2026-07-28 while verifying Finding 4/6 (curl against / showed
  // no security headers and no request log line at all).
  app.use(helmet());
  app.use(httpLogger);
  // Gzips JSON responses (this API's only response type) — same "before any
  // route" placement as helmet/morgan above, for the same reason.
  app.use(compression());

  app.get("/", (req, res) => {
    res.status(200).json({message: "Your project is now ONLINE SARA"})
  })

  // Actually checks Mongo connectivity (readyState 1 = connected), unlike the
  // root route above which is just a static "online" string — see
  // PHASE3_SECURITY_SCOPE.md Finding 6.
  app.get("/health", (req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;
    res.status(dbConnected ? 200 : 503).json({
      status: dbConnected ? "ok" : "degraded",
      db: dbConnected ? "connected" : "disconnected",
    });
  })

  // Interactive API docs — see ENGINEERING_PRINCIPLES.md's documentation
  // requirement. Helmet's default CSP blocks Swagger UI's inline script, so
  // it gets a relaxed CSP scoped to just this one route rather than loosening
  // the app-wide policy every other endpoint runs under.
  app.use(
    '/api-docs',
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': ["'self'", "'unsafe-inline'"],
          'style-src': ["'self'", "'unsafe-inline'"],
        },
      },
    }),
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec)
  );

  app.use(cors({
    origin: function(origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  }));

  app.use(express.json())

  // app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  app.use('/api/v1/auth/user', routers.userRoutes)
  app.use('/api/v1/auth/post', routers.postRoutes)
  app.use('/api/v1/auth/post/:postId/comment', routers.commentRoutes);
  app.use('/api/v1/auth/notification', routers.notificationRoutes);
  app.use('/api/v1/auth/story', routers.storyRoutes);
  app.use('/api/v1/auth/chat', routers.chatRoutes);

  app.all('*', (req, res, next) => {
    const err = new AppError(`Invalid URL${req.originalUrl}`, 404)
    next(err)
  })

  // Must come after all routes/the catch-all, before globleErrorHandling —
  // captures 5xx errors to Sentry (a no-op if SENTRY_DSN isn't set) and calls
  // next(err), so globleErrorHandling still runs and sends the actual
  // response. See ADR-027 for the logging half of this; this is the error-
  // tracking half.
  Sentry.setupExpressErrorHandler(app);

  app.use(globleErrorHandling)
}

export const initApp = (app, express) => {
  configureApp(app, express);
  connection();
}
