import { Router } from "express";
import {
  getUsers,
  createNewUser,
  generateQR,
  verifyUser
  // getUser,
} from "../controllers/users.controller";

const router = Router();

// User CRUD operations
router.get("/", getUsers);
router.post("/", createNewUser);

// QR code generation
router.get("/qrcode", generateQR);
router.post('/verify', verifyUser);

// Commented out route
// router.get("/:id", getUser);

export default router;
