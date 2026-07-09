import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const PORT = process.env.PORT || 8787;
const client = new Anthropic();

const TOPIC_DESC = {
  terrorism:
    "terrorism, insurgency and armed extremist activity (e.g. Sahel, Lake Chad Basin, Somalia, Cabo Delgado)",
  disinformation:
    "disinformation, influence operations, coordinated inauthentic behaviour and information warfare",
  health:
    "health security: disease outbreaks, epidemic response, vaccination campaigns and biosecurity",
  climate:
    "climate and natural disasters: droughts, floods, cyclones, food insecurity and climate-driven displacement",
  military:
    "military and defence affairs: operations, senior personnel changes, official policy statements, major exercises, and weapons or equipment acquisitions",
};

async function fetchThemeStories(category) {
  const isMil = category === "military";
  const prompt = `Search the web for the most recent real news (past 45 days) about ${TOPIC_DESC[category]} in Africa. Find 3 distinct, significant stories from reputable outlets, each from a different country if possible.

Respond with ONLY a raw JSON array — no prose, no markdown fences. Each element must be:
{"headline": "<concise headline, max 14 words>", "summary": "<max 30 words, factual>", "militarySubcategory": ${isMil ? '<one of "operations","personnel","policy","exercises","acquisitions">' : "null"}, "country": "<primary country, common English name>", "lat": <number>, "lng": <number>, "date": "YYYY-MM-DD", "source": "<outlet name>"}`;

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1500,
    tools: [{ type: "web_search_20260209", name: "web_search" }],
    output_config: { effort: "medium" },
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) {
    throw new Error(`No JSON array found in model response for ${category}`);
  }

  const parsed = JSON.parse(text.slice(start, end + 1));
  return parsed.filter(
    (story) =>
      story &&
      typeof story.headline === "string" &&
      typeof story.lat === "number" &&
      typeof story.lng === "number"
  );
}

const app = express();

app.get("/api/news", async (req, res) => {
  const category = req.query.category;
  if (typeof category !== "string" || !(category in TOPIC_DESC)) {
    res.status(400).json({ error: "Unknown or missing category" });
    return;
  }

  try {
    const stories = await fetchThemeStories(category);
    res.json(stories);
  } catch (error) {
    console.error(`Failed to fetch news for ${category}:`, error);
    res.status(502).json({ error: "Failed to fetch live news" });
  }
});

app.listen(PORT, () => {
  console.log(`Meridian Brief API listening on http://localhost:${PORT}`);
});
