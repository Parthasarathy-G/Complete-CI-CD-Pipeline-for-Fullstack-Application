import express from "express";
import {
  getAvailability,
  setAvailability,
} from "../controllers/doctorAvailability.controllers.js";
import { verifyToken, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", verifyToken, requireRole("doctor"), getAvailability);
router.post("/", verifyToken, requireRole("doctor"), setAvailability);

export default router;
