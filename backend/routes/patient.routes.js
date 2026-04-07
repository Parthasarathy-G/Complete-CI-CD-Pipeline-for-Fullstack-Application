// backend/routes/patient.routes.js
import express from "express";
import {
  addPatientWithRisk,
  addMedicationToPatient,
  getAllPatients,
  computePatientRisk,
  updatePatientLabsByDoctor,
} from "../controllers/patient.controller.js";
import { requireRole, verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/add", verifyToken, requireRole("doctor"), addPatientWithRisk);

router.post(
  "/:id/medications",
  verifyToken,
  requireRole("doctor"),
  addMedicationToPatient
);

router.get(
  "/",
  verifyToken,
  requireRole("doctor"),
  getAllPatients
);

router.post("/:id/compute-risk", verifyToken, requireRole("doctor"), computePatientRisk);

router.post("/:id/profile", verifyToken, requireRole("doctor"), updatePatientLabsByDoctor);

export default router;
