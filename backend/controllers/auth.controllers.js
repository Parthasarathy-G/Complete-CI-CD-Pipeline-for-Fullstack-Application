//  backend/controllers/auth.controllers.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Doctor from "../models/doctor.model.js";
import Patient from "../models/patient.model.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey123";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const normalizeEmail = (email) =>
  (email || "").toString().trim().toLowerCase();

/* =========================
   Doctor Register / Login
   ========================= */

export const registerDoctor = async (req, res) => {
  try {
    let { name, email, password, specialization } = req.body || {};
    email = normalizeEmail(email);

    if (!name || !email || !password || !specialization) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await Doctor.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Doctor already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    await Doctor.create({ name, email, password: hashed, specialization });

    return res.status(201).json({ message: "Doctor registered" });
  } catch (err) {
    console.error("registerDoctor error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const loginDoctor = async (req, res) => {
  try {
    let { email, password } = req.body || {};
    email = normalizeEmail(email);

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const doctor = await Doctor.findOne({ email });
    // Use 401 for any invalid combo
    if (!doctor) return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, doctor.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: doctor._id, email: doctor.email, role: "doctor" },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      token,
      user: { id: doctor._id, name: doctor.name, email: doctor.email, role: "doctor" },
    });
  } catch (err) {
    console.error("loginDoctor error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   Patient Register / Login
   ========================= */

export const registerPatient = async (req, res) => {
  try {
    let { name, email, password, age, gender } = req.body || {};
    email = normalizeEmail(email);

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const existing = await Patient.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Patient already exists" });
    }

  const hashed = await bcrypt.hash(password, 10);
  const patientPayload = { name, email, password: hashed, age, gender };
  if (req.body.vitals) patientPayload.vitals = req.body.vitals;
  if (req.body.labs) patientPayload.labs = req.body.labs;
  await Patient.create(patientPayload);

    return res.status(201).json({ message: "Patient registered" });
  } catch (err) {
    console.error("registerPatient error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const loginPatient = async (req, res) => {
  try {
    let { email, password } = req.body || {};
    email = normalizeEmail(email);

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const patient = await Patient.findOne({ email });
    if (!patient) return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, patient.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: patient._id, email: patient.email, role: "patient" },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      token,
      user: { id: patient._id, name: patient.name, email: patient.email, role: "patient" },
    });
  } catch (err) {
    console.error("loginPatient error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
