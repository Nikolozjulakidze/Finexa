import express from "express";
import {
  register,
  login,
  getMe,
  googleAuth,
  sendGoogleOtp,
  verifyGoogleOtp,
  sendRegistrationOtp,
  verifyRegistrationOtp,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register/send-otp", sendRegistrationOtp);
router.post("/register/verify", verifyRegistrationOtp);
router.post("/register", register);
router.post("/login", login);
router.post("/google/send-otp", sendGoogleOtp);
router.post("/google/verify", verifyGoogleOtp);
router.post("/google", googleAuth);
router.get("/me", protect, getMe);

export default router;
