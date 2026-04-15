// backend/middlewares/auth.middleware.js
import jwt from "jsonwebtoken";

// General auth check
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Missing Authorization header" });
  }
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Invalid Authorization header format" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const secret = process.env.JWT_SECRET || "supersecretkey123";
    const decoded = jwt.verify(token, secret);

    // Normalize user object from token payload
    req.user = {
      id: decoded.id || decoded._id || decoded.sub, // <-- added `_id` fallback
      role: (decoded.role || decoded.roles || decoded.roleName || "").toString().toLowerCase(),
      ...(decoded.email ? { email: decoded.email } : {}),
    };

    // Debug logging (non-production)
    if (process.env.NODE_ENV !== "production") {
      console.debug("verifyToken success:", { id: req.user.id, role: req.user.role });
    }

    if (!req.user.id) {
      return res.status(401).json({ message: "Invalid token payload: missing id" });
    }

    next();
  } catch (err) {
    // Log token for debugging
    try {
      const decodedUnverified = jwt.decode(token, { complete: true });
      console.error("verifyToken failed - token decode (unverified):", decodedUnverified);
    } catch (e) {
      console.error("verifyToken failed and token could not be decoded");
    }
    return res.status(403).json({ message: "Token invalid or expired" });
  }
};

// Role-based guard
export const requireRole = (role) => (req, res, next) => {
  const userRole = req.user?.role;
  let allowed = false;

  if (!userRole) {
    allowed = false;
  } else if (Array.isArray(userRole)) {
    allowed = userRole.map((r) => r.toLowerCase()).includes(role.toLowerCase());
  } else if (typeof userRole === "object") {
    // shapes like { name: 'doctor' } or { role: 'doctor' }
    const name = userRole.name?.toLowerCase();
    const roleField = userRole.role?.toLowerCase();
    allowed = name === role.toLowerCase() || roleField === role.toLowerCase();
  } else {
    allowed = userRole.toLowerCase() === role.toLowerCase();
  }

  if (!allowed) {
    return res.status(403).json({ message: `Access denied: ${role}s only` });
  }
  next();
};
