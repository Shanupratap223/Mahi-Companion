import express, { Request, Response } from "express";
import cors from "cors";

const app = express();

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
app.post("/chat", async (req: Request, res: Response) => {
  const { message } = req.body;

  res.json({
    reply: "Tumne bola: " + message,
  });
});
