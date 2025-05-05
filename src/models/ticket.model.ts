import mongoose, { Document, Model, models, Schema } from "mongoose";

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
}

const ticketSchema = new Schema<ITicket>({
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
  }
}, {timestamps: true});

const Ticket: Model<ITicket> =
  models.Ticket || mongoose.model<ITicket>("Ticket", ticketSchema, "tickets");

export default Ticket;
