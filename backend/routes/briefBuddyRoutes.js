import { Router } from "express";
import { chatWithBriefBuddy, finalizeBrief } from "../controllers/briefBuddyController.js";

const router = Router();

router.post("/chat", chatWithBriefBuddy);
router.post("/finalize", finalizeBrief);

export default router;
