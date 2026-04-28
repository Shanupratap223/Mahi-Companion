import express, { Request, Response } from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "MAHI AI is running 🚀" });
});

// Chat route
app.post("/chat", async (req: Request, res: Response) => {
  try {
    const message = req.body.message || "";

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.json({ reply: "API key missing ❌" });
    }

    const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
      "MAHI samajh nahi paayi 😅";

    res.json({ reply });
  } catch (error) {
    console.log(error);
    res.json({ reply: "Error aaya bhai 😢" });
  }
});

export default app;
