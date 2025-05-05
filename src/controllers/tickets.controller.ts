import {
  Request as ExpressRequest,
  Response as ExpressResponse
} from "express";
import Ticket, { TicketStatus, ITicket } from "../models/ticket.model";
import { PaginatedResponse } from "../definitions/interfaces";
import User from "../models/user.model";

interface TicketRequestBody {
  precioTicket: number;
  quantity: string;
  userId: string;
}

interface ConsumeTicketBody {
  email: string;
  ticketType?: string;
}

interface QueryParams {
  page?: string;
  limit?: string;
  fechaInicio?: string;
  fechaFin?: string;
  userID?: string;
  status?: TicketStatus;
  userEmail?: string;
  userName?: string;
}

interface EnhancedTicket extends Omit<ITicket, "_id"> {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

interface TicketFilters {
  fechaUso?: {
    $gte?: Date;
    $lte?: Date;
  };
  _id?: string;
  status?: TicketStatus;
  userID?: string;
}

export const createTicket = async (
  req: ExpressRequest<{}, {}, TicketRequestBody>,
  res: ExpressResponse
): Promise<void> => {
  try {
    console.log(req.body);
    const quantity = parseInt(req.body.quantity) || 1;

    const { quantity: _, ...ticketData } = req.body;

    console.log(ticketData);

    const ticketWithDate = {
      precioTicket: ticketData.precioTicket,
      userID: ticketData.userId,
      fechaEmision: new Date(),
      status: TicketStatus.Disponible
    };

    console.log(ticketWithDate);

    if (quantity > 1) {
      const ticketsToCreate = Array(quantity).fill(ticketWithDate);
      const savedTickets = await Ticket.insertMany(ticketsToCreate);

      res.status(201).json({
        message: `Successfully created ${quantity} tickets`,
        tickets: savedTickets
      });
    } else {
      const newTicket = new Ticket(ticketWithDate);
      const savedTicket = await newTicket.save();
      res.status(201).json(savedTicket);
    }
  } catch (error) {
    console.error("Error creating ticket(s):", error);
    res.status(400).json({
      message: error instanceof Error ? error.message : "Error creating ticket"
    });
  }
};

export const getAllTickets = async (
  req: ExpressRequest<{}, {}, {}, QueryParams>,
  res: ExpressResponse
): Promise<void> => {
  try {
    console.log("ALL TICKETS", req.query);

    // 1. Paginación
    const limit = parseInt(req.query.limit || "0");
    const page = req.query.page ? parseInt(req.query.page) - 1 : 0;
    const offset = page * limit;

    // 2. Filtros
    const filtros: TicketFilters = {};

    // Manejo de fechas
    if (req.query.fechaInicio || req.query.fechaFin) {
      filtros.fechaUso = {};
      if (req.query.fechaInicio) {
        filtros.fechaUso.$gte = new Date(req.query.fechaInicio);
      }
      if (req.query.fechaFin) {
        filtros.fechaUso.$lte = new Date(req.query.fechaFin);
      }
    }

    if (req.query.userID) {
      filtros.userID = req.query.userID;
    }

    if (req.query.status) {
      console.log("status", req.query.status);
      if (Object.values(TicketStatus).includes(req.query.status)) {
        filtros.status = req.query.status;
      }
    }

    console.log({ filtros });

    // 3. Consulta
    //const totalTickets = await Ticket.countDocuments(filtros);
    const tickets = await Ticket.find(filtros);//.skip(offset).limit(limit);

    // 4. Enriquecer tickets con información de usuario
    const enhancedTickets = [];

    for await (const ticket of tickets) {
      const user = await User.findById(ticket.userID);
      enhancedTickets.push({
        ...ticket.toJSON(),
        user: {
          name: user?.name || null,
          email: user?.email || null
        }
      });
    }

    let filteredTickets = [...enhancedTickets];

    if (req.query.userName) {
      const searchName = req.query.userName.toLowerCase();
      filteredTickets = filteredTickets.filter((ticket) =>
        ticket.user.name?.toLowerCase().includes(searchName)
      );
    }

    if (req.query.userEmail) {
      const searchEmail = req.query.userEmail.toLowerCase();
      filteredTickets = filteredTickets.filter((ticket) =>
        ticket.user.email?.toLowerCase().includes(searchEmail)
      );
    }

    // 6. Actualizar total y hasMore basado en los filtros
    const filteredTotal = filteredTickets.length;
    const hasMore = offset + limit < filteredTotal;

    const response: PaginatedResponse<EnhancedTicket> = {
      data: filteredTickets.slice(offset, offset + limit),
      meta: {
        total: filteredTotal,
        limit,
        offset,
        hasMore
      }
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      message:
        error instanceof Error ? error.message : "Error retrieving tickets"
    });
  }
};

export const consumeTicket = async (
  req: ExpressRequest<{}, {}, ConsumeTicketBody>,
  res: ExpressResponse
): Promise<void> => {
  console.log("scanner body",req.body)
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: "Se requiere userId." });
    return;
  }

  const user = await User.findOne({email})

  try {
    const ticketsDisponibles = await Ticket.find({
      userID: user?._id as string,
      status: TicketStatus.Disponible
    }).sort({ fechaEmision: 1 });

    console.log(ticketsDisponibles)

    if (ticketsDisponibles.length > 0) {
      const ticketMasAntiguo = ticketsDisponibles[0];
      ticketMasAntiguo.status = TicketStatus.Usado;
      ticketMasAntiguo.fechaUso = new Date();
      await ticketMasAntiguo.save();

      res.status(200).json({
        message: "Entrada registrada y ticket más antiguo utilizado.",
        ticket: ticketMasAntiguo
      });
    } else {
      res.status(404).json({
        message: "No se encontró ningún ticket disponible para este estudiante."
      });
    }
  } catch (error) {
    console.error("Error al registrar la entrada al comedor:", error);
    res.status(500).json({
      message: "Error al procesar la entrada al comedor."
    });
  }
};
