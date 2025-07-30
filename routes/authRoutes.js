import express from "express";
import {
  register,
  login,
  sendOtp,
  resetPassword,
  googleLogin,
} from "../controllers/authController.js";
import uploadProfilePic from "../middleware/uploadProfilePic.js";

const router = express.Router();

router.post("/signup", uploadProfilePic.single("profilePic"), register);
router.post("/login", login);
router.post("/google-login", googleLogin);
router.post("/forgot-password", sendOtp);
router.post("/reset-password", resetPassword);


export default router;
