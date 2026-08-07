import pool from "../db.js";

export const getCards = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, name, type, bank, brand, last_four, color, is_default,
              provider, provider_card_id, connection_id, created_at
       FROM cards
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [req.userId],
    );
    res.json(result.rows);
  } catch (error) {
    console.error("GetCards error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createCard = async (req, res) => {
  const { name, type, bank, brand, lastFour, color, isDefault } = req.body;

  if (!name || !type) {
    return res.status(400).json({ message: "Name and type are required" });
  }
  if (!["credit", "debit"].includes(type)) {
    return res.status(400).json({ message: "Type must be credit or debit" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // If this card is set as default, unset any existing default
    if (isDefault) {
      await client.query(
        "UPDATE cards SET is_default = FALSE WHERE user_id = $1 AND is_default = TRUE",
        [req.userId],
      );
    }

    const result = await client.query(
      `INSERT INTO cards (user_id, name, type, bank, brand, last_four, color, is_default,
                          provider, provider_card_id, connection_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, user_id, name, type, bank, brand, last_four, color, is_default,
                 provider, provider_card_id, connection_id, created_at`,
      [
        req.userId,
        name,
        type,
        bank || null,
        brand || null,
        lastFour || null,
        color || "#6366F1",
        isDefault || false,
        req.body.provider || null,
        req.body.providerCardId || null,
        req.body.connectionId || null,
      ],
    );

    await client.query("COMMIT");
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("CreateCard error:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

export const getCardById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, user_id, name, type, bank, brand, last_four, color, is_default,
              provider, provider_card_id, connection_id, created_at
       FROM cards
       WHERE id = $1 AND user_id = $2`,
      [id, req.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Card not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("GetCardById error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateCard = async (req, res) => {
  const { id } = req.params;
  const { name, type, bank, brand, lastFour, color, isDefault } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // If this card is being set as default, unset any existing default
    if (isDefault) {
      await client.query(
        "UPDATE cards SET is_default = FALSE WHERE user_id = $1 AND id != $2 AND is_default = TRUE",
        [req.userId, id],
      );
    }

    const result = await client.query(
      `UPDATE cards
       SET name = COALESCE($1, name),
           type = COALESCE($2, type),
           bank = COALESCE($3, bank),
           brand = COALESCE($4, brand),
           last_four = COALESCE($5, last_four),
           color = COALESCE($6, color),
           is_default = COALESCE($7, is_default)
       WHERE id = $8 AND user_id = $9
       RETURNING id, user_id, name, type, bank, brand, last_four, color, is_default,
                 provider, provider_card_id, connection_id, created_at`,
      [name, type, bank, brand, lastFour, color, isDefault, id, req.userId],
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Card not found" });
    }

    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("UpdateCard error:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

export const deleteCard = async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check if card is default
    const cardRes = await client.query(
      "SELECT is_default FROM cards WHERE id = $1 AND user_id = $2",
      [id, req.userId],
    );

    if (cardRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Card not found" });
    }

    // If deleting the default card, set the most recent card as default
    if (cardRes.rows[0].is_default) {
      await client.query(
        `UPDATE cards SET is_default = TRUE
         WHERE id = (
           SELECT id FROM cards
           WHERE user_id = $1 AND id != $2
           ORDER BY created_at DESC
           LIMIT 1
         )`,
        [req.userId, id],
      );
    }

    // Null out card_id on transactions referencing this card
    await client.query(
      "UPDATE transactions SET card_id = NULL WHERE card_id = $1 AND user_id = $2",
      [id, req.userId],
    );

    const result = await client.query(
      "DELETE FROM cards WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.userId],
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Card not found" });
    }

    await client.query("COMMIT");
    res.json({ message: "Card deleted" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("DeleteCard error:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};
