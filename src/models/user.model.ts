import mongoose, { Document, Model, models, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  qrCode?: string;
  becado?: boolean;
  estudianteID?: string;
}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
    description: "Nombre del Usuario"
  },
  email: {
    type: String,
    required: true,
    unique: true,
    description: "Correo del Usuario"
  },
  avatar: {
    type: String,
    description: "Foto de perfil"
  },
  role: {
    type: String,
    description: "Role del Usuario"
  },
  qrCode: {
    type: String,
    description: "Codigo QR en base64 para la identificacion del usuario "
  },
  becado: {
    type: Boolean,
    default: false,
    description: "True: Usuario es becado - False: El estudiante no es becado"
  },
  estudianteID: {
    type: String,
    default: false,
    description: "ID unico - Correo institucional si el usuario es estudiante"
  }
});

const User: Model<IUser> =
  models.User || mongoose.model<IUser>("User", userSchema, "users");

export default User;
