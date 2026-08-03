import { chatRaw } from "../utils/gemini.js";
import pool from "../db.js";

export const chat = async (req, res) => {
  const { prompt, includeContext = false } = req.body;
  if (!prompt) return res.status(400).json({ message: "prompt is required" });

  if (!process.env.GROQ_API_KEY) {
    console.error("AI chat attempted but GROQ_API_KEY is not set");
    return res.status(503).json({
      message: "AI service unavailable",
      details: "Server is missing GROQ_API_KEY environment variable",
    });
  }

  try {
    let finalPrompt = prompt;

    if (includeContext) {
      // fetch account balances and recent transactions for this user
      const acctRes = await pool.query(
        `SELECT COALESCE(SUM(balance),0) AS account_balance FROM bank_accounts WHERE user_id = $1`,
        [req.userId],
      );
      const accountBalance = parseFloat(acctRes.rows[0].account_balance || 0);

      const txRes = await pool.query(
        `SELECT t.id, t.transaction_date, t.amount, t.type, t.description, c.name AS category_name
         FROM transactions t
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE t.user_id = $1
           AND t.transaction_date >= CURRENT_DATE - INTERVAL '7 days'
         ORDER BY t.transaction_date DESC
         LIMIT 100`,
        [req.userId],
      );

      const txLines = txRes.rows
        .map((t) => {
          const date = t.transaction_date
            ? t.transaction_date instanceof Date
              ? t.transaction_date.toISOString().split("T")[0]
              : String(t.transaction_date)
            : "";
          const amt = parseFloat(t.amount).toFixed(2);
          const cat = t.category_name || "uncategorized";
          const desc = t.description ? ` - ${t.description}` : "";
          return `- ${date}: ${t.type} $${amt} | ${cat}${desc}`;
        })
        .join("\n");

      const context = `User financial snapshot:\nAccount balance (linked accounts): $${accountBalance.toFixed(2)}\nRecent transactions (last 7 days):\n${txLines || "- No recent transactions"}`;

      finalPrompt = `${context}\n\nUser question:\n${prompt}`;
    }

    const reply = await chatRaw(finalPrompt);
    res.json({ reply });
  } catch (error) {
    console.error("AI chat error", error);
    res.status(500).json({ message: "AI chat failed", details: error.message });
  }
};

export default { chat };

export const getContext = async (req, res) => {
  try {
    const acctRes = await pool.query(
      `SELECT COALESCE(SUM(balance),0) AS account_balance FROM bank_accounts WHERE user_id = $1`,
      [req.userId],
    );
    const accountBalance = parseFloat(acctRes.rows[0].account_balance || 0);

    const txRes = await pool.query(
      `SELECT t.id, t.transaction_date, t.amount, t.type, t.description, c.name AS category_name
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1
         AND t.transaction_date >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY t.transaction_date DESC
       LIMIT 200`,
      [req.userId],
    );

    const transactions = txRes.rows.map((t) => ({
      id: t.id,
      date: t.transaction_date
        ? t.transaction_date instanceof Date
          ? t.transaction_date.toISOString().split("T")[0]
          : String(t.transaction_date)
        : null,
      amount: parseFloat(t.amount),
      type: t.type,
      description: t.description || null,
      category: t.category_name || null,
    }));

    res.json({ accountBalance, transactions });
  } catch (error) {
    console.error("getContext error", error);
    res.status(500).json({ message: "Failed to fetch context" });
  }
};
