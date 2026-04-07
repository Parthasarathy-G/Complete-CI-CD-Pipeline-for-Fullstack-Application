// scripts/fixAvailabilityIndexes.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Resolve project root and .env no matter where the script is run from
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Adjust this if your .env is elsewhere. From backend/scripts/* -> backend/.env:
const envPath = path.resolve(__dirname, "..", ".env");

dotenv.config({ path: envPath });

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.MONGO_DB_NAME || undefined; // optional
const COLLECTION = process.env.AVAIL_COLLECTION || "doctoravailabilities";

if (!MONGO_URL || typeof MONGO_URL !== "string") {
  console.error("❌ MONGO_URL is missing. Looked for .env at:", envPath);
  console.error("   Add MONGO_URL to that file, or pass it via env var (see below).");
  process.exit(1);
}

async function run() {
  // If your connection string doesn’t include db name, you can pass dbName:
  await mongoose.connect(MONGO_URL, DB_NAME ? { dbName: DB_NAME } : undefined);
  const col = mongoose.connection.db.collection(COLLECTION);

  const indexes = await col.indexes();
  console.log("Current indexes:", indexes.map(i => i.name));

  // Drop legacy (doctor, dayOfWeek) unique index if present
  if (indexes.find(i => i.name === "doctor_1_dayOfWeek_1")) {
    console.log("Dropping legacy index doctor_1_dayOfWeek_1…");
    await col.dropIndex("doctor_1_dayOfWeek_1");
    console.log("Dropped.");
  } else {
    console.log("Legacy index not found.");
  }

  // Ensure (doctor, date) unique index
  if (!indexes.find(i => i.name === "doctor_1_date_1")) {
    console.log("Creating unique index doctor_1_date_1…");
    await col.createIndex({ doctor: 1, date: 1 }, { unique: true });
    console.log("Created.");
  } else {
    console.log("doctor_1_date_1 already exists.");
  }

  // Optional: remove legacy field
  console.log("Unsetting legacy 'dayOfWeek' from all docs…");
  await col.updateMany({ dayOfWeek: { $exists: true } }, { $unset: { dayOfWeek: 1 } });
  console.log("Done.");

  await mongoose.disconnect();
  console.log("✅ Migration complete");
}

run().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});

