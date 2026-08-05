import dotenv from "dotenv";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

if (!process.env.GROQ_API_KEY) {
  console.error(
    "⚠️ WARNING: GROQ_API_KEY is not set. AI features will not work.",
  );
}

// Gemini client for vision tasks. Groq decommissioned all vision-capable
// models, so image analysis is routed through Google's Gemini API instead.
const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

if (!process.env.GEMINI_API_KEY) {
  console.error(
    "⚠️ WARNING: GEMINI_API_KEY is not set. Image analysis will not work.",
  );
}

// Vision-capable Gemini models. gemini-flash-latest is tried first because
// gemini-2.0-flash is frequently quota-blocked on free-tier accounts. If one
// hits a quota limit, the next model is attempted automatically.
const GEMINI_VISION_MODELS = ["gemini-flash-latest", "gemini-2.0-flash"];

// Gemini TTS model. This is Gemini's neural text-to-speech model that produces
// natural, human-sounding speech (much better than the browser's robotic Web
// Speech API voices). Runs on the free tier using the existing GEMINI_API_KEY.
const GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts";
// Default voice name. Change to any of the available Gemini voices:
// Aoede, Charon, Fenrir, Kore, Puck, Zephyr.
const GEMINI_TTS_VOICE = "Aoede";

const MODEL = "llama-3.3-70b-versatile";

const stripMarkdown = (text) => {
  let cleaned = text.trim();

  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\n?/g, "").replace(/\n?```$/g, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\n?/g, "").replace(/\n?```$/g, "");
  }

  return cleaned.trim();
};

const askAI = async (prompt) => {
  const response = await ai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
  });

  return stripMarkdown(response.choices[0].message.content);
};

export const chatRaw = async (prompt) => {
  return askAI(prompt);
};

/**
 * Send a prompt along with an image to a vision-capable model.
 *
 * Groq decommissioned all vision-capable models (e.g. llama-3.2-90b-vision-preview),
 * so image analysis is routed through Google's Gemini vision model.
 *
 * @param {string} prompt - The user's text prompt.
 * @param {string} imageDataUrl - Base64 data URL of the image (e.g. data:image/png;base64,...).
 */
export const chatRawWithImage = async (prompt, imageDataUrl) => {
  if (!gemini) {
    throw new Error(
      "Image analysis is unavailable: GEMINI_API_KEY is not set on the server.",
    );
  }

  // The data URL looks like "data:image/png;base64,....". Gemini expects
  // the mime type and the raw base64 payload separately.
  const match = imageDataUrl.match(
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/,
  );

  let lastError = null;

  for (const model of GEMINI_VISION_MODELS) {
    try {
      let response;
      if (match) {
        const [, mimeType, base64Data] = match;
        response = await gemini.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                { inlineData: { mimeType, data: base64Data } },
              ],
            },
          ],
        });
      } else {
        response = await gemini.models.generateContent({
          model,
          contents: prompt,
        });
      }

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (text) return stripMarkdown(text);
    } catch (error) {
      lastError = error;
      // Only try the next model on quota/resource-exhausted errors.
      const isQuota =
        error?.status === 429 ||
        /quota|rate.?limit|resource.?exhausted/i.test(error?.message || "");
      if (!isQuota) {
        throw error;
      }
    }
  }

  // All models were quota-blocked.
  if (lastError) {
    const friendly = new Error(
      "Image analysis is temporarily rate-limited. Please try again in a moment.",
    );
    friendly.status = 429;
    throw friendly;
  }

  return "";
};

/**
 * Convert text to natural-sounding speech using Gemini's neural TTS model.
 *
 * This produces human-quality audio (compared to the browser's robotic Web
 * Speech API voices). Runs on the free tier using the existing GEMINI_API_KEY.
 * Returns the raw MP3 audio bytes.
 *
 * @param {string} text - The text to speak.
 * @param {string} [voice] - Optional Gemini voice name (default Aoede).
 * @returns {Promise<Buffer>} MP3 audio buffer.
 */
export const textToSpeech = async (text, voice = GEMINI_TTS_VOICE) => {
  if (!gemini) {
    throw new Error(
      "Text-to-speech is unavailable: GEMINI_API_KEY is not set on the server.",
    );
  }

  if (!text || !text.trim()) {
    throw new Error("Text to speak is required.");
  }

  const response = await gemini.models.generateContent({
    model: GEMINI_TTS_MODEL,
    contents: [{ role: "user", parts: [{ text }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voice,
          },
        },
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      // Decode the base64 audio payload into a Buffer.
      return Buffer.from(part.inlineData.data, "base64");
    }
  }

  throw new Error("No audio was returned from the TTS model.");
};

/**
 * Transcribe an audio buffer using Groq's Whisper endpoint
 * (OpenAI-compatible API). Returns the recognized text.
 * @param {Buffer} audioBuffer - Raw audio bytes (e.g. webm/opus from MediaRecorder)
 * @param {string} mimeType - audio MIME type, e.g. "audio/webm"
 */
export const transcribeAudio = async (audioBuffer, mimeType = "audio/webm") => {
  const extension = mimeType.includes("mp4")
    ? "m4a"
    : mimeType.includes("ogg")
      ? "ogg"
      : mimeType.includes("wav")
        ? "wav"
        : "webm";

  const file = new File([audioBuffer], `recording.${extension}`, {
    type: mimeType,
  });

  const response = await ai.audio.transcriptions.create({
    model: "whisper-large-v3",
    file,
    language: "en",
  });

  return response.text;
};

export const generateMonthlyInsight = async ({
  totalIncome,
  totalExpenses,
  savingsRate,
  expenseBreakdown,
  previousMonths,
  currency = "USD",
}) => {
  const breakdownText =
    expenseBreakdown.length > 0
      ? expenseBreakdown
          .map((c) => `- ${c.category}: ${currency} ${c.amount.toFixed(2)}`)
          .join("\n")
      : "- No expenses recorded yet";

  const trendText =
    previousMonths.length > 0
      ? previousMonths
          .map(
            (m) =>
              `- ${m.month}: Income ${currency} ${m.income.toFixed(
                2,
              )}, Expenses ${currency} ${m.expenses.toFixed(2)}`,
          )
          .join("\n")
      : "- No previous month data available";

  const prompt = `
Analyze this user's monthly financial data and generate actionable insights.

Currency: ${currency}

Total Income:
${currency} ${totalIncome.toFixed(2)}

Total Expenses:
${currency} ${totalExpenses.toFixed(2)}

Savings Rate:
${savingsRate.toFixed(1)}%

Expense breakdown:
${breakdownText}

Previous months:
${trendText}

Return ONLY valid JSON:

{
  "summary": "2-3 sentence summary",
  "highlights": [
    "Positive observation 1",
    "Positive observation 2"
  ],
  "concerns": [
    "Concern 1",
    "Concern 2"
  ],
  "recommendations": [
    {
      "title": "Short title",
      "detail": "Actionable suggestion"
    }
  ],
  "topSpendingCategory": "Category or null",
  "estimatedMonthlySavings": number,
  "healthScore": number
}

Rules:
- healthScore must be 0-100 integer
- Provide exactly 3 recommendations
- Use real numbers from the data
`;

  try {
    const result = await askAI(prompt);
    return JSON.parse(result);
  } catch (error) {
    console.error("Groq API error (monthly insight):", error);

    throw new Error("Failed to generate monthly insight. Please try again.");
  }
};

export const generateBudgetAlert = async ({
  categoryName,
  budgetAmount,
  spentAmount,
  daysIntoPeriod,
  totalPeriodDays,
  currency = "USD",
}) => {
  const percentUsed = ((spentAmount / budgetAmount) * 100).toFixed(1);

  const daysLeft = totalPeriodDays - daysIntoPeriod;

  const prompt = `
A user is tracking a budget.

Category:
${categoryName}

Budget:
${currency} ${budgetAmount.toFixed(2)}

Spent:
${currency} ${spentAmount.toFixed(2)}

Used:
${percentUsed}%

Days remaining:
${daysLeft}

Return ONLY JSON:

{
 "severity":"info|warning|critical",
 "title":"Short title",
 "message":"Helpful message",
 "suggestions":[
   "Suggestion 1",
   "Suggestion 2",
   "Suggestion 3"
 ]
}
`;

  try {
    const result = await askAI(prompt);
    return JSON.parse(result);
  } catch (error) {
    console.error("Groq API error (budget alert):", error);

    throw new Error("Failed to generate budget alert.");
  }
};
export const generateSavingsTips = async ({
  topCategories,
  monthlyIncome,
  currency = "USD",
}) => {
  const categoryText =
    topCategories.length > 0
      ? topCategories
          .map(
            (c) =>
              `- ${c.category}: ${currency} ${c.amount.toFixed(
                2,
              )} across ${c.transactionCount} transactions`,
          )
          .join("\n")
      : "- No spending data available";

  const prompt = `
Generate personalized savings tips.

Monthly Income:
${currency} ${monthlyIncome.toFixed(2)}

Top spending categories:

${categoryText}


Return ONLY valid JSON:

{
 "overallTip":"One sentence advice",
 "tips":[
   {
    "category":"Category",
    "title":"Short title",
    "detail":"Actionable advice",
    "estimatedSavings":number
   }
 ]
}

Rules:
- Provide exactly 4 tips
- Use real categories from the data
- Include realistic savings estimates
`;

  try {
    const result = await askAI(prompt);

    return JSON.parse(result);
  } catch (error) {
    console.error("Groq API error (savings tips):", error);

    throw new Error("Failed to generate savings tips.");
  }
};

export const analyzeTransactionList = async ({
  transactions,
  currency = "USD",
}) => {
  const formatDate = (d) => {
    if (!d) return "";

    if (d instanceof Date) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");

      const day = String(d.getDate()).padStart(2, "0");

      return `${y}-${m}-${day}`;
    }

    return String(d).split("T")[0];
  };

  const lines = transactions
    .slice(0, 50)
    .map((t) => {
      const date = formatDate(t.transaction_date);

      const amount = parseFloat(t.amount).toFixed(2);

      const category = t.category_name || "uncategorized";

      const description = t.description ? ` | ${t.description}` : "";

      return `- ${date}: ${t.type} ${currency} ${amount} | ${category}${description}`;
    })
    .join("\n");

  const prompt = `
Analyze these transactions.

${lines}


Return ONLY JSON:

{
 "insight":"2-4 sentence analysis",
 "highlight":"Short key takeaway"
}
`;

  try {
    const result = await askAI(prompt);

    return JSON.parse(result);
  } catch (error) {
    console.error("Groq API error (transactions):", error);

    throw new Error("Failed to analyze transactions.");
  }
};

export const analyzeBudgetList = async ({ budgets, currency = "USD" }) => {
  const lines = budgets
    .map((b) => {
      const spent = parseFloat(b.spent);

      const total = parseFloat(b.amount);

      const percent = total > 0 ? ((spent / total) * 100).toFixed(1) : "0";

      return `
Budget ID: ${b.id}
Category: ${b.category_name}
Limit: ${currency} ${total.toFixed(2)}
Spent: ${currency} ${spent.toFixed(2)}
Used: ${percent}%
`;
    })
    .join("\n");

  const prompt = `
Analyze these budgets.

${lines}


Return ONLY JSON:

{
 "analyses":[
  {
   "budgetId":number,
   "status":"good|caution|concerning",
   "message":"Short helpful message"
  }
 ]
}
`;

  try {
    const result = await askAI(prompt);

    return JSON.parse(result);
  } catch (error) {
    console.error("Groq API error (budgets):", error);

    throw new Error("Failed to analyze budgets.");
  }
};

export default {
  generateMonthlyInsight,
  generateBudgetAlert,
  generateSavingsTips,
  analyzeTransactionList,
  analyzeBudgetList,
};
