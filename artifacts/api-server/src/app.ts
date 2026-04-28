import express, { Request, Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";

const app = express();

// Simple logger
app.use(pinoHttp());

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Server is running 🚀",
  });
});

// API route
app.get("/api", (req: Request, res: Response) => {
  res.json({
    success: true,
  });
});

export default app;
