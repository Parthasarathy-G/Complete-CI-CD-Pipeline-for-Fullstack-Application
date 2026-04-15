#!/usr/bin/env node
import mongoose from "mongoose";
import dotenv from "dotenv";
import Patient from "../models/patient.model.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_URI || "mongodb://localhost:27017/YOUR_DB_NAME";

async function cleanup() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const result = await Patient.deleteMany({
    $or: [
      { password: { $exists: false } },
      { password: "" },
      { password: null },
    ],
  });
  console.log(`Deleted ${result.deletedCount} patient(s) without password.`);
  await mongoose.disconnect();
}

cleanup().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
