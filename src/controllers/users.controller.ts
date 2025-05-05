import {
  Request as ExpressRequest,
  Response as ExpressResponse
} from "express";
import QRCode from "qrcode";
import User from "../models/user.model";

interface UserRequestBody {
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

interface QueryParams {
  page?: string;
  limit?: string;
  becado?: boolean;
  email?: string;
  userID?: string;
}

export const createNewUser = async (
  req: ExpressRequest<{}, {}, UserRequestBody>,
  res: ExpressResponse
): Promise<void> => {
  try {
    // 1. Obtener información del usuario
    const { name, email, avatar } = req.body;

    if (!name || !email) {
      res.status(400).json({ message: "Name and email are required" });
      return;
    }

    // 2. Asignar el role de administrador
    let { role } = req.body;
    const adminEmailsString = process.env.ADMIN_EMAILS;
    const adminEmailsArray = adminEmailsString
      ? adminEmailsString.split(",")
      : [];

    if (adminEmailsArray.includes(email)) {
      role = "admin";
      try {
        await User.create({ name, email, avatar, role });
        res.status(201).json({ message: "Admin User Registered" });
        return;
      } catch (error) {
        console.error("Error registering admin user:", error);
        res.status(500).json({ message: "Internal Server Error" });
        return;
      }
    }

    // 3. Obtener el estudiante ID del email
    const correoInstitucional = /^(\d{2}-\d{5})@usb\.ve$/;
    let estudianteID: string | undefined;

    if (correoInstitucional.test(email)) {
      const numeroCarnet = correoInstitucional.exec(email);
      if (numeroCarnet && numeroCarnet[1]) {
        estudianteID = numeroCarnet[1].replace("-", "");
      } else {
        res
          .status(400)
          .json({ message: "Correo institucional de estudiante no valido" });
        return;
      }
    }

    // 4. Generar código QR
    const qrCode = await QRCode.toDataURL(email || "");

    // 5. Guardar usuario
    const newUser = {
      name,
      email,
      estudianteID,
      avatar,
      qrCode,
      role
    };

    await User.create(newUser);
    res.status(201).json({ message: "User Registered" });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUsers = async (
  req: ExpressRequest<{}, {}, {}, QueryParams>,
  res: ExpressResponse
): Promise<void> => {
  try {
    console.log(req.query);
    // 1. Paginación
    const page = parseInt(req.query.page || "0");
    const limit = parseInt(req.query.limit || "0");
    const offset = page * limit;

    // 2. Filtros
    const filtros: Record<string, any> = {};

    if (req.query.userID) {
      filtros._id = req.query.userID;
    }

    if (req.query.becado !== undefined) {
      filtros.becado = req.query.becado;
    }

    // 3. Consulta
    const users = await User.find(filtros).skip(offset).limit(limit);
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const generateQR = async (
  req: ExpressRequest<{}, {}, {}, QueryParams>,
  res: ExpressResponse
): Promise<void> => {
  const { email } = req.query;

  if (!email) {
    res.status(400).send("Email parameter is required");
    return;
  }

  try {
    const user = await User.findOne({ email });

    if (user) {
      res.status(200).json({ qrCode: user.qrCode });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to get QR code" });
  }
};

export const verifyUser = async (
  req: ExpressRequest<{}, {}, { email: string }>,
  res: ExpressResponse
): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (user) {
      res.json({
        exists: true,
        userData: {
          _id: user._id,
          role: user.role,
          becado: user.becado,
          qrCode: user.qrCode
        }
      });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error("Error verificando usuario:", error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Error verificando usuario"
    });
  }
};