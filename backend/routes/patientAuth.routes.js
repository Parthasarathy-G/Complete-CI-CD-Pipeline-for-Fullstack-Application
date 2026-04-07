import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Patient from "../models/patient.model.js";

const router = express.Router();
const must = (v, k) => { if (!v) throw new Error(`${k} not set`); return v; };

// POST /api/auth/patient/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, age, gender } = req.body;
    const exists = await Patient.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    const patient = await Patient.create({ name, email, password: hash, age, gender });

    const token = jwt.sign(
      { id: patient._id, email: patient.email, role: "patient" },
      must(process.env.JWT_SECRET, "JWT_SECRET"),
      { expiresIn: "7d", algorithm: "HS256" }
    );

    res.status(201).json({ token, user: { id: patient._id, name: patient.name, email: patient.email, role: "patient" } });
  } catch (e) {
    res.status(500).json({ message: "Registration failed" });
  }
});

// POST /api/auth/patient/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const patient = await Patient.findOne({ email });
    if (!patient) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, patient.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: patient._id, email: patient.email, role: "patient" },
      must(process.env.JWT_SECRET, "JWT_SECRET"),
      { expiresIn: "7d", algorithm: "HS256" }
    );

    res.json({ token, user: { id: patient._id, name: patient.name, email: patient.email, role: "patient" } });
  } catch (e) {
    res.status(500).json({ message: "Login failed" });
  }
});

export default router;
