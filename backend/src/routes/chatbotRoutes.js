import express from 'express';
import protectRoute from '../middleware/auth.middleware.js';

const router = express.Router();

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

const SYSTEM_PROMPT = `
You are EduBot, a specialized assistant for the EduHub application. 
Your goal is to help users with two main areas:
1. Application Support: Help with bookings, payments, finding tutors, and profile management.
2. Academic Support: Assist students with their studies, explaining concepts, or providing guidance on subjects.

STRICT RULES:
- If a user asks a question unrelated to EduHub or studies (e.g., gossip, politics, general non-academic trivia, "How to cook", "Who is celebrity X"), politely refuse and remind them of your purpose.
- Do NOT answer any questions that are not related to education or the EduHub platform.
- Maintain a professional, encouraging, and helpful tone.
- If you don't know the answer to a specific app issue, suggest they contact human support.
- Keep your answers concise and accurate.
- You can answer in English.
`;

router.post('/chat', protectRoute, async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: "Messages are required" });
    }

    if (!NVIDIA_API_KEY) {
      console.error("NVIDIA_API_KEY is not set in environment variables");
      return res.status(500).json({ message: "Chatbot service is not configured. Please add NVIDIA_API_KEY to .env" });
    }

    // Prepend the system prompt to the conversation
    const conversation = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages
    ];

    const response = await fetch(NVIDIA_NIM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${NVIDIA_API_KEY}`
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-8b-instruct", 
        messages: conversation,
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024,
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("NVIDIA NIM Error:", data);
      return res.status(response.status).json({ 
        message: "Error from AI service", 
        error: data 
      });
    }

    res.status(200).json(data.choices[0].message);
  } catch (error) {
    console.error("Chatbot Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
