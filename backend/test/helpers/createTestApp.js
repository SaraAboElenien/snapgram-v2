import express from 'express';
import { configureApp } from '../../src/initApp.js';

// Mounts the real routes/middleware without initApp's own connection() call —
// the test suite's db.setup.js already manages the mongoose connection
// (mongodb-memory-server), so this avoids connecting twice.
export const createTestApp = () => {
  const app = express();
  configureApp(app, express);
  return app;
};
