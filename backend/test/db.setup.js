import { beforeAll, afterEach, afterAll } from 'vitest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;

beforeAll(async () => {
  // A single-node replica set, not a standalone server — followOrUnfollowUser
  // (user.service.js) uses a real Mongoose transaction (mongoose.startSession
  // + withTransaction, see ADR-001), which MongoDB only supports on a replica
  // set/mongos, never on a standalone instance.
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongoServer.getUri();
  process.env.DB_URL = uri;
  await mongoose.connect(uri);
}, 60000);

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});
