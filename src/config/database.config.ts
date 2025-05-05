import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    const dbString = process.env.MONGODB_URI;
    console.log(dbString);
    if (!dbString) {
      throw new Error("No db connection string provided");
    }
    await mongoose.connect(dbString);

    const db: mongoose.Connection = mongoose.connection;

    db.on("error", (error: Error) => {
      console.error("MongoDB connection error:", error);
    });

    db.once("open", () => {
      console.log("Connected to MongoDB");
    });
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1);
  }
};

export default connectDB;
