import mongoose from "mongoose";
import dotenv from "dotenv";
import Patient from "./models/patient.model.js"; // <-- fixed path

dotenv.config();

await mongoose.connect(process.env.MONGO_URL);
console.log("✅ Connected");

const patient = await Patient.create({
  name: "Test Patient",
  email: "patient@test.com",
  password: "123456", // hash it before insert if not using register route
  age: 30,
  gender: "Male",
});

console.log("Inserted:", patient);
await mongoose.disconnect();
