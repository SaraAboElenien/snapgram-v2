import dotenv from 'dotenv';
import path from 'path';

// Runs before any test file's own imports (Vitest setupFiles execute first),
// so these dummy values win even though modules like helpers/cloudinary.js
// call dotenv.config() themselves later — dotenv never overwrites an
// already-set process.env value. Same dummy env locally and in CI, since
// this file (unlike config/.env) is committed.
dotenv.config({ path: path.resolve('config/.env.test') });
