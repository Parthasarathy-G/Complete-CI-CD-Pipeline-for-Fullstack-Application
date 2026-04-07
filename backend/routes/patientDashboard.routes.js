import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import {
  listDoctors,
  getUpcomingAppointmentsForPatient,
  bookAppointment,
  getPatientReports,
  addPatientReport,
  getPatientProfile,
  upsertPatientProfile,
} from "../controllers/patientDashboard.controllers.js";
import { verifyToken, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Simple disk storage for uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, "..", "uploads")),
  filename: (_req, file, cb) => {
    const uniq = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || "");
    cb(null, uniq + ext);
  },
});
const upload = multer({ storage });

// Doctors
router.get("/doctors", verifyToken, requireRole("patient"), listDoctors);

// Appointments
router.get("/appointments/upcoming", verifyToken, requireRole("patient"), getUpcomingAppointmentsForPatient);
router.post("/appointments/book", verifyToken, requireRole("patient"), bookAppointment);

// Reports
router.get("/reports", verifyToken, requireRole("patient"), getPatientReports);
router.post("/reports", verifyToken, requireRole("patient"), upload.single("file"), addPatientReport);

// Profile
router.get("/profile", verifyToken, requireRole("patient"), getPatientProfile);
router.post("/profile", verifyToken, requireRole("patient"), upsertPatientProfile);

export default router;
