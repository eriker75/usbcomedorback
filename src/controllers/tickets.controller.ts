import {
  Request as ExpressRequest,
  Response as ExpressResponse
} from "express";
import Ticket, { ITicket, TicketStatus } from "../models/ticket.model";
import { JsonApiError, PaginatedResponse } from "../definitions/interfaces";
import User from "../models/user.model";
import mongoose from "mongoose";
import { ERROR_CODES } from "../definitions/constants";

interface TicketCreationBody {
  precioTicket: number;
  quantity: string;
  userId: string;
}

interface ConsumeTicketBody {
  email: string;
  ticketType?: string;
}

interface UserData {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
}

interface TicketWithUser extends Omit<ITicket, "user"> {
  _id: mongoose.Types.ObjectId;
  precioTicket: number;
  fechaEmision: Date;
  fechaUso: Date | null;
  status: TicketStatus;
  user: UserData;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TicketResponse {
  _id: mongoose.Types.ObjectId;
  precioTicket: number;
  fechaEmision: Date;
  fechaUso: Date | null;
  status: TicketStatus;
  user: {
    name: string;
    email: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

interface QueryParams {
  limit?: string;
  page?: string;
  fechaInicio?: string;
  fechaFin?: string;
  userID?: string;
  userName?: string;
  userEmail?: string;
  status?: TicketStatus;
}

interface UserData {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
}

interface TicketWithUser extends Omit<ITicket, "user"> {
  user: UserData;
}

interface TicketResponse {
  _id: mongoose.Types.ObjectId;
  precioTicket: number;
  fechaEmision: Date;
  fechaUso: Date | null;
  status: TicketStatus;
  user: {
    name: string;
    email: string;
  };
}

interface CreateTicketResponse {
  message?: string;
  tickets: TicketResponse | TicketResponse[];
}

export const createTicket = async (
  req: ExpressRequest<{}, {}, TicketCreationBody>,
  res: ExpressResponse<CreateTicketResponse | JsonApiError>
): Promise<void> => {
  try {
    const { quantity: quantityStr, userId, precioTicket } = req.body;
    const quantity = parseInt(quantityStr) || 1;

    if (quantity > 5) {
      res.status(400).json({
        errors: [
          {
            code: ERROR_CODES.MAX_TICKETS_EXCEEDED,
            status: "400",
            title: "Límite de tickets excedido",
            detail:
              "No se pueden crear más de 5 tickets simultáneamente. Por favor, realice múltiples solicitudes si necesita más tickets."
          }
        ]
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        errors: [
          {
            code: ERROR_CODES.USER_NOT_FOUND,
            status: "404",
            title: "Usuario no encontrado",
            detail: `No se encontró ningún usuario con el ID: ${userId}`
          }
        ]
      });
      return;
    }

    const ticketBase = {
      precioTicket,
      user: new mongoose.Types.ObjectId(userId),
      fechaEmision: new Date(),
      fechaUso: null,
      status: TicketStatus.Disponible
    };

    let savedTickets: TicketWithUser[];

    if (quantity > 1) {
      const ticketsToCreate = Array(quantity).fill(ticketBase);
      const createdTickets = await Ticket.insertMany(ticketsToCreate);

      savedTickets = await Ticket.find({
        _id: { $in: createdTickets.map((ticket) => ticket._id) }
      })
        .populate<{ user: UserData }>({
          path: "user",
          select: "name email"
        })
        .lean<TicketWithUser[]>();

      res.status(201).json({
        message: `Se crearon ${quantity} tickets exitosamente`,
        tickets: savedTickets.map((ticket) => ({
          _id: ticket._id,
          precioTicket: ticket.precioTicket,
          fechaEmision: ticket.fechaEmision,
          fechaUso: ticket.fechaUso,
          status: ticket.status,
          user: {
            name: ticket.user.name,
            email: ticket.user.email
          }
        }))
      });
    } else {
      const newTicket = new Ticket(ticketBase);
      const savedTicket = await newTicket.save();

      // Populate y lean en un paso separado
      const populatedTicket = await Ticket.findById(savedTicket._id)
        .populate<{ user: UserData }>({
          path: "user",
          select: "name email"
        })
        .lean<TicketWithUser>();

      if (!populatedTicket) {
        throw new Error("Failed to create ticket");
      }

      res.status(201).json({
        tickets: {
          _id: populatedTicket._id,
          precioTicket: populatedTicket.precioTicket,
          fechaEmision: populatedTicket.fechaEmision,
          fechaUso: populatedTicket.fechaUso,
          status: populatedTicket.status,
          user: {
            name: populatedTicket.user.name,
            email: populatedTicket.user.email
          }
        }
      });
    }
  } catch (error) {
    console.error("Error creating ticket(s):", error);
    res.status(400).json({
      message: error instanceof Error ? error.message : "Error creating ticket",
      tickets: []
    });
  }
};

export const getAllTickets = async (
  req: ExpressRequest<{}, {}, {}, QueryParams>,
  res: ExpressResponse
): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit || "0");
    const page = req.query.page ? parseInt(req.query.page) - 1 : 0;
    const offset = page * limit;

    const filtros: Record<string, any> = {};

    // Procesamiento de filtros de fecha
    if (req.query.fechaInicio || req.query.fechaFin) {
      const fechaInicioStr = req.query.fechaInicio as string;
      const fechaFinStr = req.query.fechaFin as string;

      if (fechaInicioStr && fechaFinStr) {
        let fechaInicio = new Date(fechaInicioStr);
        let fechaFin = new Date(fechaFinStr);

        if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
          res.status(400).json({ message: "Fechas de inicio o fin inválidas" });
          return;
        }

        if (fechaInicio > fechaFin) {
          res.status(400).json({
            message:
              "La fecha de inicio debe ser anterior o igual a la fecha de fin"
          });
          return;
        }

        fechaInicio.setHours(0, 0, 0, 0);
        fechaFin.setHours(23, 59, 59, 999);

        filtros.fechaEmision = {
          $gte: fechaInicio,
          $lte: fechaFin
        };
      } else if (fechaInicioStr) {
        let fechaInicio = new Date(fechaInicioStr);
        if (isNaN(fechaInicio.getTime())) {
          res.status(400).json({ message: "Fecha de inicio inválida" });
          return;
        }
        fechaInicio.setHours(0, 0, 0, 0);
        filtros.fechaEmision = { $gte: fechaInicio };
      } else if (fechaFinStr) {
        let fechaFin = new Date(fechaFinStr);
        if (isNaN(fechaFin.getTime())) {
          res.status(400).json({ message: "Fecha de fin inválida" });
          return;
        }
        fechaFin.setHours(23, 59, 59, 999);
        filtros.fechaEmision = { $lte: fechaFin };
      }
    }

    // Filtros de usuario para populate
    let userMatch: Record<string, any> = {};
    if (req.query.userName) {
      userMatch = {
        ...userMatch,
        name: new RegExp(req.query.userName, "i")
      };
    }
    if (req.query.userEmail) {
      userMatch = {
        ...userMatch,
        email: new RegExp(req.query.userEmail, "i")
      };
    }

    // Filtro por ID de usuario
    if (req.query.userID) {
      filtros.user = new mongoose.Types.ObjectId(req.query.userID);
    }

    // Filtro por estado del ticket
    if (
      req.query.status &&
      Object.values(TicketStatus).includes(req.query.status)
    ) {
      filtros.status = req.query.status;
    }

    console.log("filtros", filtros);

    // Obtener todos los tickets que coinciden con los filtros básicos
    // pero sin paginación para calcular el total después de filtrar por usuario
    const allTickets = await Ticket.find(filtros)
      .populate<{ user: UserData }>({
        path: "user",
        match: userMatch,
        select: "name email"
      })
      .lean<TicketWithUser[]>();

    // Filtrar los tickets que no tienen usuario (porque no coinciden con userMatch)
    const filteredAllTickets = allTickets.filter(
      (ticket): ticket is TicketWithUser =>
        ticket.user !== null &&
        typeof ticket.user === "object" &&
        "name" in ticket.user &&
        "email" in ticket.user
    );

    // El total correcto es el número de tickets después de filtrar por usuario
    const totalCount = filteredAllTickets.length;

    // Obtener los tickets para la página actual
    // Aplicamos skip/limit en memoria ya que ya tenemos todos los tickets filtrados
    const paginatedTickets = filteredAllTickets.slice(offset, offset + limit);

    const response: PaginatedResponse<TicketResponse> = {
      data: paginatedTickets.map((ticket) => ({
        _id: ticket._id,
        precioTicket: ticket.precioTicket,
        fechaEmision: ticket.fechaEmision,
        fechaUso: ticket.fechaUso,
        status: ticket.status,
        user: {
          name: ticket.user.name,
          email: ticket.user.email
        }
      })),
      meta: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error in getAllTickets:", error);
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
  console.log("scanner body", req.body);
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: "Se requiere userId." });
    return;
  }

  const user = await User.findOne({ email });

  try {
    const ticketsDisponibles = await Ticket.find({
      user: user?._id as string,
      status: TicketStatus.Disponible
    }).sort({ fechaEmision: 1 });

    console.log(ticketsDisponibles);

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

interface TicketStats {
  totalTickets: number;
  totalGanancias: number;
  ticketsDisponibles: number;
  ticketsUsados: number;
}

interface StatsQueryParams {
  fechaInicio?: string;
  fechaFin?: string;
  userName?: string;
  userEmail?: string;
}

export const getTicketStats = async (
  req: ExpressRequest<{}, {}, {}, StatsQueryParams>,
  res: ExpressResponse<TicketStats | any>
): Promise<void> => {
  try {
    const matchStage: Record<string, any> = {};
    const userMatch: Record<string, any> = {};

    // Construir filtros de fecha
    if (req.query.fechaInicio || req.query.fechaFin) {
      matchStage.fechaEmision = {};

      if (req.query.fechaInicio) {
        const fechaInicio = new Date(req.query.fechaInicio);
        fechaInicio.setHours(0, 0, 0, 0);
        matchStage.fechaEmision.$gte = fechaInicio;
      }

      if (req.query.fechaFin) {
        const fechaFin = new Date(req.query.fechaFin);
        fechaFin.setHours(23, 59, 59, 999);
        matchStage.fechaEmision.$lte = fechaFin;
      }
    }

    // Construir filtros de usuario
    if (req.query.userName) {
      userMatch.name = new RegExp(req.query.userName, "i");
    }
    if (req.query.userEmail) {
      userMatch.email = new RegExp(req.query.userEmail, "i");
    }

    const pipeline = [
      // Primero hacemos el lookup para obtener la información del usuario
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      // Desenrollamos el array de userInfo
      { $unwind: "$userInfo" },
      // Aplicamos los filtros de usuario si existen
      ...(Object.keys(userMatch).length > 0
        ? [
            {
              $match: {
                $or: [
                  { "userInfo.name": userMatch.name },
                  { "userInfo.email": userMatch.email }
                ]
              }
            }
          ]
        : []),
      // Aplicamos los filtros de fecha
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      // Agrupamos para obtener las estadísticas
      {
        $group: {
          _id: null,
          totalTickets: { $sum: 1 },
          totalGanancias: {
            $sum: {
              $cond: [
                { $eq: ["$status", TicketStatus.Usado] },
                "$precioTicket",
                0
              ]
            }
          },
          ticketsDisponibles: {
            $sum: {
              $cond: [{ $eq: ["$status", TicketStatus.Disponible] }, 1, 0]
            }
          },
          ticketsUsados: {
            $sum: {
              $cond: [{ $eq: ["$status", TicketStatus.Usado] }, 1, 0]
            }
          }
        }
      },
      // Proyectamos el resultado final
      {
        $project: {
          _id: 0,
          totalTickets: 1,
          totalGanancias: 1,
          ticketsDisponibles: 1,
          ticketsUsados: 1
        }
      }
    ];

    const [stats] = await Ticket.aggregate(pipeline);

    // Si no hay resultados, devolvemos valores por defecto
    const response: TicketStats = stats || {
      totalTickets: 0,
      totalGanancias: 0,
      ticketsDisponibles: 0,
      ticketsUsados: 0
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error getting ticket stats:", error);
    res.status(500).json({
      message:
        error instanceof Error ? error.message : "Error getting ticket stats"
    });
  }
};
