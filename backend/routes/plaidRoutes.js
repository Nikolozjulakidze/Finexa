import express from "express";
import {
  createPlaidLinkToken,
  exchangePlaidPublicToken,
  getPlaidConnections,
  getPlaidAccounts,
  syncPlaidConnection,
} from "../controllers/plaidController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.post("/link-token", createPlaidLinkToken);
router.post("/exchange-token", exchangePlaidPublicToken);
router.get("/connections", getPlaidConnections);
router.get("/accounts", getPlaidAccounts);
router.post("/sync/:connectionId", syncPlaidConnection);

export default router;
