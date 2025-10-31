import { Router } from "express";
import {
  chatWithBriefBuddy,
  finalizeBrief,
  prefillBriefFromPdf,
} from "../controllers/briefBuddyController.js";

const router = Router();

router.post("/chat", chatWithBriefBuddy);
router.post("/finalize", finalizeBrief);
router.post("/prefill", prefillBriefFromPdf);

export default router;
