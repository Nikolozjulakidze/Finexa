import express from "express";
import {
  getCards,
  createCard,
  getCardById,
  updateCard,
  deleteCard,
} from "../controllers/cardController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getCards);
router.post("/", createCard);
router.get("/:id", getCardById);
router.put("/:id", updateCard);
router.delete("/:id", deleteCard);

export default router;
