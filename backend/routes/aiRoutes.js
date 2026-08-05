import express from "express";
import multer from "multer";
import {
  chat,
  getContext,
  transcribe,
  tts,
} from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// In-memory storage for audio transcription uploads (max 25MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.use(protect);

router.post("/chat", chat);
router.post("/transcribe", upload.single("audio"), transcribe);
router.post("/tts", tts);
router.get("/context", getContext);

export default router;
