import mongoose from "mongoose";
import dotenv from "dotenv";
import Doctor from "./models/doctor.model.js";
import Patient from "./models/patient.model.js";
import Appointment from "./models/appointement.model.js";
import DoctorAvailability from "./models/doctorAvailability.model.js";

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

const run = async () => {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("Connected to MongoDB");

    // Optional: clear old data
    await Doctor.deleteMany();
    await Patient.deleteMany();
    await Appointment.deleteMany();
    await DoctorAvailability.deleteMany();

    // Create Doctor
    const doctor = await Doctor.create({
      name: "Dr. Lisa Ray",
      email: "lisa@example.com",
      password: "hashed_password", // NOTE: in real apps, hash it
      specialization: "Cardiology",
    });

    // Create Patient
    const patient = await Patient.create({
      name: "John Doe",
      age: 45,
      gender: "Male",
      sbp: 130,
      dbp: 85,
      glucose: 95,
      bmi: 28,
      risk: {
        cardio: { label: "Moderate", interpretation: "Monitor regularly" },
        diabetes: { label: "Low", interpretation: "No immediate risk" },
      },
    });

    // Doctor availability
    const availability = await DoctorAvailability.create({
      doctor: doctor._id,
      date: "2025-08-04",
      slots: ["09:00 AM", "10:30 AM", "02:00 PM"],
    });

    // Appointment
    await Appointment.create({
      doctor: doctor._id,
      patient: patient._id,
      date: "2025-08-04",
      time: "10:30 AM",
      status: "Confirmed",
    });

    console.log("🌱 Seed data inserted successfully");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding data:", err);
    process.exit(1);
  }
};

run();
