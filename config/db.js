const mongoose = require('mongoose');

async function connectDatabase() {
  let uri = process.env.MONGO_URI;

  if (!uri) {
    // No database configured -> start a temporary in-memory MongoDB for demos
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mem = await MongoMemoryServer.create();
    uri = mem.getUri('meshwatch');
    console.log('ℹ  MONGO_URI not set — using in-memory MongoDB (data resets on restart)');
  }

  await mongoose.connect(uri);
  console.log('✔  MongoDB connected');
}

module.exports = connectDatabase;
