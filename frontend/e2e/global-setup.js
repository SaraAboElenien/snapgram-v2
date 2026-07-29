import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(__dirname, '../../backend');
const BACKEND_URL = 'http://localhost:3000/';

const waitForServer = async (url, timeoutMs) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Backend did not become ready at ${url} within ${timeoutMs}ms`);
};

// A replica set, not a standalone instance — matches backend/test/db.setup.js,
// since some code paths (e.g. followUser) use real Mongoose transactions,
// which MongoDB only supports on a replica set.
async function globalSetup() {
  const mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongoServer.getUri();

  // Set here (not just passed to the spawned backend below) so test files —
  // which Playwright forks after globalSetup completes, inheriting this
  // process's env at fork time — can also connect directly, e.g. to flip
  // `confirmed: true` the same way every disposable verification script
  // this project has used all along does, since real email confirmation
  // isn't practical in an automated test.
  process.env.DB_URL = uri;

  // The backend loads its own config/.env for real Cloudinary/email creds
  // (dotenv never overwrites an already-set var), so only DB_URL/NODE_ENV
  // need overriding here to point it at the ephemeral test database instead
  // of the real Atlas cluster.
  const backendProcess = spawn('node', ['index.js'], {
    cwd: BACKEND_DIR,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DB_URL: uri,
      PORT: '3000',
    },
    stdio: 'inherit',
  });

  try {
    await waitForServer(BACKEND_URL, 30000);
  } catch (err) {
    backendProcess.kill();
    await mongoServer.stop();
    throw err;
  }

  return async () => {
    backendProcess.kill();
    await mongoServer.stop();
  };
}

export default globalSetup;
