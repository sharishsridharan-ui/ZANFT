import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize GoogleGenAI SDK with recommended header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

// Multi-turn Gemini Chat API Endpoint
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { messages, model = 'gemini-3.5-flash', role = 'curator' } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    // Role-specific System Instructions
    let systemInstruction = '';
    if (role === 'fast') {
      systemInstruction = `You are ZANFT QuickBot, a lightning-fast anime assistant. Provide rapid, concise, highly accurate answers about anime episode counts, character names, release dates, studio credits, and instant recommendations. Keep answers direct and punchy without fluff.`;
    } else if (role === 'critic') {
      systemInstruction = `You are the ZANFT Master Cinema Critic & Sakuga Analyst. Provide deep, sophisticated, auteur-level analysis of anime directing, key frame animation (sakuga), sound design, narrative pacing, character arcs, and studio aesthetics. Reference both ZANFT exclusive titles and legendary industry classics.`;
    } else {
      // Default: curator
      systemInstruction = `You are ZANFT AI, the premier anime concierge and curator for ZANFT Anime Streaming Cinema & Studio Platform. You are passionate, knowledgeable, cinematic, and welcoming. Help viewers discover shows, analyze plot themes, explain lore, recommend series based on mood/genres, and guide creators on how to publish works on ZANFT. Format responses cleanly with markdown bolding, lists, and spacing where appropriate.`;
    }

    // Format conversation history for @google/genai SDK
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    let responseText = '';
    const targetModel = model || 'gemini-3.5-flash';

    try {
      const response = await ai.models.generateContent({
        model: targetModel,
        contents,
        config: {
          systemInstruction
        }
      });
      responseText = response.text || '';
    } catch (primaryErr: any) {
      console.warn(`Primary model ${targetModel} issue:`, primaryErr.message);
      // Fallback to gemini-3.1-flash-lite or gemini-3.8-flash for zero downtime
      const fallbackModel = targetModel === 'gemini-3.1-flash-lite' ? 'gemini-3.8-flash' : 'gemini-3.1-flash-lite';
      const fallbackResponse = await ai.models.generateContent({
        model: fallbackModel,
        contents,
        config: {
          systemInstruction
        }
      });
      responseText = fallbackResponse.text || '';
    }

    const reply = responseText || 'I could not generate a response. Please try again.';
    res.json({ reply });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({
      error: error.message || 'Failed to communicate with Gemini API'
    });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      }
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ZANFT Server running on port ${PORT}`);
  });
}

startServer();
