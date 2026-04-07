// backend/routes/doctor.routes.js
import express from "express";
import { verifyToken, requireRole } from "../middlewares/auth.middleware.js";
import {
  getAssignedPatients,
  getPatientDetails,
  downloadPatientReport,
  getPatientTimeline,
  addMedicationToPatient,
} from "../controllers/doctor.controller.js";

const router = express.Router();

router.get(
  "/patients",
  verifyToken,
  requireRole("doctor"),
  getAssignedPatients
);
router.get(
  "/patients/:id",
  verifyToken,
  requireRole("doctor"),
  getPatientDetails
);
router.get(
  "/patients/:id/download",
  verifyToken,
  requireRole("doctor"),
  downloadPatientReport
);

router.get(
  "/patients/:id/timeline",
  verifyToken,
  requireRole("doctor"),
  getPatientTimeline
);
router.post(
  "/patient/:id/medications",
  verifyToken,
  requireRole("doctor"),
  addMedicationToPatient
);

export default router;
