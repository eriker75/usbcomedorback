import mongoose, { Document, Model, models, Schema } from "mongoose";
import { IUser } from "./user.model";

export enum TicketStatus {
  Disponible = "Disponible",
  Usado = "Usado",
  Anulado = "Anulado"
}

export interface ITicket extends Document {
  precioTicket: number;
  fechaEmision: Date;
  fechaUso: Date | null;
  status: TicketStatus;
  userID: string;
  user: mongoose.Types.ObjectId | IUser;
}

const ticketSchema = new Schema<ITicket>(
  {
    precioTicket: {
      type: Number,
      description: "Precio en moneda local del ticket"
    },
    fechaEmision: {
      type: Date,
      description: "Fecha en la cual el ticket fue emitido"
    },
    fechaUso: {
      type: Date,
      default: null,
      description: "Fecha en la cual el ticket fue consumido"
    },
    status: {
      type: String,
      enum: Object.values(TicketStatus),
      default: TicketStatus.Disponible
    },
    userID: {
      type: String,
      description: "Identificador del estudiante a quien el ticket pertenece"
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      description: "Referencia al usuario al que pertenece el ticket"
    }
  },
  { timestamps: true }
);

const Ticket: Model<ITicket> =
  models.Ticket || mongoose.model<ITicket>("Ticket", ticketSchema, "tickets");

export default Ticket;
