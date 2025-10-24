import { Router } from "express";
import {
  createLicense,
  getLicenses,
  getLicenseById,
  updateLicense,
  deleteLicense,
} from "../controllers/licenseController.js";

const router = Router();

router.post("/", createLicense);
router.get("/", getLicenses);
router.get("/:id", getLicenseById);
router.put("/:id", updateLicense);
router.delete("/:id", deleteLicense);

export default router;
