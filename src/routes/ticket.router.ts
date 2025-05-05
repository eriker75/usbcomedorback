import { Router } from "express";
import {
  getAllTickets,
  createTicket,
  consumeTicket
} from "../controllers/tickets.controller";

const router = Router();

// CRUD operations
router.get("/", getAllTickets);
router.post("/", createTicket);

// Special actions
router.post("/consume-ticket", consumeTicket);

export default router;
