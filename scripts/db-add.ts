import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pwndora";
const DB_NAME = "pwndora";

async function seed() {
  console.log(`[db-add] Connecting to ${MONGODB_URI}...`);
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  // ── 1. Users collection ──
  console.log("[db-add] Setting up 'users' collection...");
  const usersExists = await db.listCollections({ name: "users" }).hasNext();
  if (!usersExists) {
    await db.createCollection("users", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["email", "password", "displayName", "role", "createdAt"],
          properties: {
            email: { bsonType: "string", description: "unique email address" },
            password: { bsonType: "string", description: "bcrypt hashed password" },
            displayName: { bsonType: "string" },
            role: { enum: ["player", "admin"] },
            createdAt: { bsonType: "date" },
            lastLogin: { bsonType: ["date", "null"] },
          },
        },
      },
    });
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    console.log("[db-add]   ✓ Created 'users' collection + unique index on email");
  } else {
    console.log("[db-add]   ✓ 'users' collection already exists");
  }

  // ── 2. Sessions collection ──
  console.log("[db-add] Setting up 'sessions' collection...");
  const sessionsExists = await db.listCollections({ name: "sessions" }).hasNext();
  if (!sessionsExists) {
    await db.createCollection("sessions", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["sessionId", "username", "startTime", "currentStage"],
          properties: {
            sessionId: { bsonType: "string" },
            userId: { bsonType: ["string", "null"] },
            username: { bsonType: "string" },
            startTime: { bsonType: "double" },
            endTime: { bsonType: ["double", "null"] },
            currentStage: { bsonType: "int" },
            completedStages: { bsonType: "array" },
            flagsFound: { bsonType: "array" },
            hintsUsed: { bsonType: "array" },
            hintsByStage: { bsonType: "object" },
            stageArtifacts: { bsonType: "object" },
            logs: { bsonType: "array" },
          },
        },
      },
    });
    await db.collection("sessions").createIndex({ sessionId: 1 }, { unique: true });
    await db.collection("sessions").createIndex(
      { userId: 1 },
      { unique: true, partialFilterExpression: { userId: { $type: "string" } } }
    );
    console.log("[db-add]   ✓ Created 'sessions' collection + indexes");
  } else {
    console.log("[db-add]   ✓ 'sessions' collection already exists");
  }

  // ── 3. Seed sample user ──
  console.log("[db-add] Seeding sample user...");
  const existingUser = await db.collection("users").findOne({ email: "test@pwndora" });
  let userId: ObjectId;

  if (existingUser) {
    userId = existingUser._id;
    console.log("[db-add]   ✓ User 'test@pwndora' already exists (skipping)");
  } else {
    const hashedPassword = await bcrypt.hash("test@123", 10);
    const result = await db.collection("users").insertOne({
      email: "test@pwndora",
      password: hashedPassword,
      displayName: "Test Operator",
      role: "player",
      createdAt: new Date(),
      lastLogin: null,
    });
    userId = result.insertedId;
    console.log("[db-add]   ✓ Created user: test@pwndora / test@123");
  }

  // ── 4. Seed empty session for sample user ──
  console.log("[db-add] Setting up sample session...");
  const existingSession = await db.collection("sessions").findOne({ userId: userId.toString() });

  if (existingSession) {
    console.log("[db-add]   ✓ Session for test@pwndora already exists (skipping)");
  } else {
    const sessionId = crypto.randomUUID();
    await db.collection("sessions").insertOne({
      sessionId,
      userId: userId.toString(),
      username: "Test Operator",
      startTime: Date.now(),
      endTime: null,
      currentStage: 1,
      completedStages: [],
      flagsFound: [],
      hintsUsed: [],
      hintsByStage: {},
      stageArtifacts: {},
      logs: [
        {
          id: Math.random().toString(36).substring(2, 9).toUpperCase(),
          timestamp: new Date().toLocaleTimeString(),
          method: "SYSTEM",
          path: "INITIALIZE",
          payload: "Lab session started",
          response: "PWNDORA Lab ready. Target: Meridian HR Enterprise Services.",
          status: "INFO",
        },
      ],
    });
    console.log(`[db-add]   ✓ Created empty session for test@pwndora (sessionId: ${sessionId})`);
  }

  // ── Done ──
  console.log("\n[db-add] Seed complete. Collections:");
  const collections = await db.listCollections().toArray();
  for (const c of collections) {
    const count = await db.collection(c.name).countDocuments();
    console.log(`  - ${c.name}: ${count} document(s)`);
  }

  await client.close();
  console.log("[db-add] Disconnected. Done.");
}

seed().catch((err) => {
  console.error("[db-add] Fatal error:", err);
  process.exit(1);
});
