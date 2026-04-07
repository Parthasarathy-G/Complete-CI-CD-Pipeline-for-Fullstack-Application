import express from "express";
import {
  registerDoctor,
  loginDoctor,
  registerPatient,
  loginPatient,
} from "../controllers/auth.controllers.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Doctor auth
router.post("/doctor/register", registerDoctor);
router.post("/doctor/login", loginDoctor);

// Patient auth
router.post("/patient/register", registerPatient);
router.post("/patient/login", loginPatient);

// Debug: return decoded token (if valid) to help diagnose 401/403 issues
router.get("/me", verifyToken, (req, res) => {
  res.json({ user: req.user });
});

export default router;
