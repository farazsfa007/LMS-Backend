import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];

    if (!token || token === "null") {
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    console.error("Token verification error:", error.message);
    res
      .status(401)
      .json({ message: "Unauthorized: Token failed or malformed" });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") next();
  else res.status(403).json({ message: "Admin access only" });
};

export const protect = verifyToken;
