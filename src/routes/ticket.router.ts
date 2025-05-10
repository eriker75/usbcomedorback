import { Router } from "express";
import {
  getAllTickets,
  createTicket,
  consumeTicket,
  getTicketStats
} from "../controllers/tickets.controller";

const router = Router();

// CRUD operations
router.get("/", getAllTickets);
router.post("/", createTicket);

// Special actions
router.post("/consume-ticket", consumeTicket);
router.get("/stats", getTicketStats);

export default router;
