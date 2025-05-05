import express, { Application } from "express";
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
  "http://localhost:7000",
  "http://localhost:7500",
  "https://usbtesis.site"
];

// Initialize express
const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    }
  })
);

// API Routes
app.use("/api/user", userRoutes);
app.use("/api/ticket", ticketRoutes);

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

main();
