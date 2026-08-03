import express from "express";
import {
  startBankLink,
  handleBankCallback,
  listConnections,
  syncConnection,
  importBankTransactions,
} from "../controllers/bankController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/callback/:provider", handleBankCallback);

router.use(protect);
router.get("/", listConnections);
router.get("/link/:provider", startBankLink);
router.post("/sync/:connectionId", syncConnection);
router.post("/import/:connectionId", importBankTransactions);

export default router;
