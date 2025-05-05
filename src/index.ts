import express, { Application, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
// Routes
import userRoutes from "./routes/user.router";
import ticketRoutes from "./routes/ticket.router";
// Database
import connectDB from "./config/database.config";
// Load environment variables
dotenv.config();

// Constants
const PORT = process.env.PORT || 7500;
const ALLOWED_ORIGINS = [
  "http://localhost:3000", // Frontend development port
  "http://localhost:7000",
  "http://localhost:7500",
  "https://usbtesis.site",
  "https://www.usbtesis.site",
  "http://usbtesis.site",
  "http://www.usbtesis.site"
];
// Initialize express
const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`Blocked request from unauthorized origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true // Allow credentials (cookies, authorization headers, etc.)
    /* methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'] */
  })
);

// Health check endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/user", userRoutes);
app.use("/api/ticket", ticketRoutes);

// Error handling middleware
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: NextFunction
  ) => {
    console.error("Error:", err);
    res.status(err.status || 500).json({
      error: {
        message: err.message || "Internal Server Error",
        ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {})
      }
    });
  }
);

// Handle 404
app.use((_req, res) => {
  res.status(404).json({
    error: {
      message: "Route not found"
    }
  });
});

async function main() {
  try {
    // Database connection
    await connectDB();

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

main();
