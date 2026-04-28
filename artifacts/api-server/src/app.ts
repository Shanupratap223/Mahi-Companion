import express, { Request, Response } from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "MAHI AI is running 🚀" });
});

// AI Chat route
app.post("/chat", async (req: Request, res: Response) => {
  try {
    const message = req.body?.message || "";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: message }],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Kuch error aa gaya 😅";

    res.json({ reply });
  } catch (error) {
    res.json({
      reply: "MAHI thoda busy hai 😅",
    });
  }
});

export default app;
