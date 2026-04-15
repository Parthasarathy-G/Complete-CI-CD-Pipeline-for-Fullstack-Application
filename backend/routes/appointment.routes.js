import express from "express";
import {
  getAppointments,
  createAppointment,
} from "../controllers/appointment.controllers.js";
import { verifyToken, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/appointments",
  verifyToken,
  requireRole("doctor"),
  getAppointments
);
router.post(
  "/appointments",
  verifyToken,
  requireRole("doctor"),
  createAppointment
);

export default router;
