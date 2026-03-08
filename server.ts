import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API routes FIRST
  app.post("/api/save-image", async (req, res) => {
    try {
      const { archetype, gender, mood, base64Image } = req.body;
      
      if (!archetype || !gender || !mood || !base64Image) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Extract base64 data
      const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: "Invalid base64 string" });
      }

      const imageBuffer = Buffer.from(matches[2], 'base64');
      const safeArchetype = archetype.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const safeGender = gender.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const safeMood = mood.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      const filename = `${safeArchetype}-${safeGender}-${safeMood}.png`;
      const publicDir = path.join(__dirname, 'public', 'fallbacks');
      
      // Ensure directory exists
      await fs.mkdir(publicDir, { recursive: true });
      
      const filePath = path.join(publicDir, filename);
      await fs.writeFile(filePath, imageBuffer);
      
      res.json({ success: true, url: `/fallbacks/${filename}` });
    } catch (error) {
      console.error("Error saving image:", error);
      res.status(500).json({ error: "Failed to save image" });
    }
  });

  app.get("/api/fallback-image", async (req, res) => {
    try {
      const { archetype, gender, mood } = req.query;
      
      const safeArchetype = String(archetype || '').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const safeGender = String(gender || '').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const safeMood = String(mood || '').replace(/[^a-z0-9]/gi, '_').toLowerCase();

      const publicDir = path.join(__dirname, 'public', 'fallbacks');
      
      try {
        await fs.access(publicDir);
      } catch {
        return res.json({ url: null });
      }

      const files = await fs.readdir(publicDir);
      
      // Try exact match
      const exactMatch = `${safeArchetype}-${safeGender}-${safeMood}.png`;
      if (files.includes(exactMatch)) {
        return res.json({ url: `/fallbacks/${exactMatch}` });
      }

      // Try archetype + gender match
      const archGenderMatch = files.find(f => f.startsWith(`${safeArchetype}-${safeGender}-`) && f.endsWith('.png'));
      if (archGenderMatch) {
        return res.json({ url: `/fallbacks/${archGenderMatch}` });
      }

      // Try archetype match
      const archMatch = files.find(f => f.startsWith(`${safeArchetype}-`) && f.endsWith('.png'));
      if (archMatch) {
        return res.json({ url: `/fallbacks/${archMatch}` });
      }

      res.json({ url: null });
    } catch (error) {
      console.error("Error finding fallback image:", error);
      res.status(500).json({ error: "Failed to find fallback image" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
