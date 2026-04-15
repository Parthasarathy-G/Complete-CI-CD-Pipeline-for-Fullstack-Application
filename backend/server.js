// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import listEndpoints from "express-list-endpoints";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import doctorRoutes from "./routes/doctor.routes.js";
import appointmentRoutes from "./routes/appointment.routes.js";
import availabilityRoutes from "./routes/doctorAvailability.routes.js";
import patientAuthRoutes from "./routes/patientAuth.routes.js";
import patientRoutes from "./routes/patient.routes.js";
import patientDashboardRoutes from "./routes/patientDashboard.routes.js";

dotenv.config();

const must = (v, k) => { if (!v) throw new Error(`${k} not set`); return v; };

const app = express();
app.use(cors());
app.use(express.json());

// --- serve /uploads (for patient reports) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

// --- routes (dashboard routes before generic patient routes to avoid greedy conflicts) ---
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/appointment", appointmentRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/auth/patient", patientAuthRoutes);
app.use("/api/patient", patientDashboardRoutes);
app.use("/api/patient", patientRoutes);

const startServer = async () => {
  try {
    const mongo = must(process.env.MONGO_URL, "MONGO_URL");
    const jwt = must(process.env.JWT_SECRET, "JWT_SECRET");
    void jwt; // referenced for must()

    await mongoose.connect(mongo);
    console.log("✅ MongoDB connected");

    console.log("Available endpoints:");
    console.log(listEndpoints(app));

    const port = Number(process.env.PORT) || 5000;
    app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
  } catch (err) {
    console.error("❌ Startup failed:", err);
    process.exit(1);
  }
};

startServer();
