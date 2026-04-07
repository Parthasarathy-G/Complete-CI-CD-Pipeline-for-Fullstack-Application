import express from "express";
import {
  getAssignedPatientsCount,
  getTodaysAppointmentsCount,
  getHighRiskPatients,
  getUpcomingAppointments,
} from "../controllers/dashboard.controller.js";
import { verifyToken, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken, requireRole("doctor"));

router.get("/patients/count", getAssignedPatientsCount);
router.get("/appointments/today", getTodaysAppointmentsCount);
router.get("/patients/high-risk", getHighRiskPatients);
router.get("/appointments/upcoming", getUpcomingAppointments);

export default router;
