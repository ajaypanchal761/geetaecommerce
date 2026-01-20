import { Router } from "express";
import { getVideoFinds } from "../modules/customer/controllers/customerVideoController";

const router = Router();

// Public route to get video finds
router.get("/", getVideoFinds);

export default router;
