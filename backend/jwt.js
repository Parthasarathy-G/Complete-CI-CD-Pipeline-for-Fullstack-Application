import express from "express";
import { generateToken } from "../utils/generateToken.js";

const router = express.Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Mock users for demo
  const users = [
    { id: 1, email: "admin@example.com", password: "admin123", role: "admin" },
    { id: 2, email: "user@example.com", password: "user123", role: "user" },
  ];

  const user = users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = generateToken(user);

  res.json({ token, role: user.role });
});

export default router;