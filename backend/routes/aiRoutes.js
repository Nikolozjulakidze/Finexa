import express from "express";
import { chat, getContext } from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/chat", chat);
router.get("/context", getContext);

export default router;
