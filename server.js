const express = require("express");
const { spawn } = require("child_process");

const app = express();
const PORT = 3000;

// Simple in-memory cache (use Redis/Mongo for production)
const cache = new Map();

app.get("/api/fetch", (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.json({ error: "No URL provided" });

  // Serve from cache if available
  if (cache.has(videoUrl)) {
    return res.json({ cached: true, ...cache.get(videoUrl) });
  }

  // Run yt-dlp
  const ytdlp = spawn("yt-dlp", [
    "-j",
    "--no-playlist",
    "--skip-download",
    "-f",
    "best[ext=mp4]",
    videoUrl,
  ]);

  let output = "";
  let errorOutput = "";

  ytdlp.stdout.on("data", (data) => {
    output += data.toString();
  });

  ytdlp.stderr.on("data", (data) => {
    errorOutput += data.toString();
  });

  ytdlp.on("close", (code) => {
    if (code !== 0) {
      return res.json({ error: "yt-dlp failed", details: errorOutput });
    }
    try {
      const data = JSON.parse(output);
      const result = {
        title: data.title,
        thumbnail: data.thumbnail,
        duration: data.duration,
        url: data.url, // direct playable link
      };

      // Save to cache
      cache.set(videoUrl, result);

      res.json(result);
    } catch (e) {
      res.json({ error: "Error parsing video data" });
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
