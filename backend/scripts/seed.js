import pool from "../db.js";
import bcrypt from "bcryptjs";
import { defaultCategories } from "../utils/defaultCategories.js";

const DEMO_USER = {
  name: "Nikoloz Julakidze",
  email: "nikolozijulakidze@gmail.com",
  password: "Test@1234",
  currency: "USD",
};

const BUDGETS = [
  { name: "Food & Dining", amount: 600 },
  { name: "Transportation", amount: 200 },
  { name: "Groceries", amount: 400 },
  { name: "Entertainment", amount: 100 },
  { name: "Shopping", amount: 150 },
];

const CARDS = [
  {
    name: "Personal Visa",
    type: "debit",
    bank: "Bank of Georgia",
    brand: "Visa",
    lastFour: "4242",
    color: "#6366F1",
    isDefault: true,
  },
  {
    name: "Work Card",
    type: "credit",
    bank: "TBC Bank",
    brand: "Mastercard",
    lastFour: "8765",
    color: "#10B981",
    isDefault: false,
  },
  {
    name: "Travel Card",
    type: "credit",
    bank: "Liberty Bank",
    brand: "Visa",
    lastFour: "1234",
    color: "#F59E0B",
    isDefault: false,
  },
];

const generateTransactions = (catMap, cardMap) => {
  const txns = [];
  const today = new Date();

  let seed = 1;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const rangeFloat = (min, max) => min + rng() * (max - min);
  const rangeInt = (min, max) => Math.floor(rangeFloat(min, max + 1));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  // Card IDs for linking transactions
  const cardIds = Object.values(cardMap);
  const expenseCardIds = cardIds; // all cards can be used for expenses

  for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
    const monthStart = new Date(
      today.getFullYear(),
      today.getMonth() - monthsAgo,
      1,
    );
    const daysInMonth = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      0,
    ).getDate();
    const monthLastDay = monthsAgo === 0 ? today.getDate() : daysInMonth;

    const dateOn = (day) => {
      const year = monthStart.getFullYear();
      const month = monthStart.getMonth() + 1;
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    };

    const add = (
      day,
      categoryName,
      amount,
      type,
      description,
      cardId = null,
    ) => {
      if (day < 1 || day > monthLastDay) return;
      const catId = catMap[categoryName];
      if (!catId) return;
      txns.push({
        categoryId: catId,
        amount: parseFloat(amount.toFixed(2)),
        type,
        description,
        date: dateOn(day),
        cardId,
      });
    };

    // Bi-weekly salary
    add(1, "Salary", 2750, "income", "Salary deposit");
    add(15, "Salary", 2750, "income", "Salary deposit");

    if (monthsAgo % 3 === 1) {
      add(
        rangeInt(10, 22),
        "Freelance",
        rangeFloat(400, 1100),
        "income",
        "Client project",
      );
    }

    if (rng() < 0.5) {
      add(
        rangeInt(8, 25),
        "Other Income",
        rangeFloat(15, 120),
        "income",
        pick(["Cashback", "Refund"]),
      );
    }

    // Fixed recurring expenses
    add(2, "Rent", 1800, "expense", "Monthly rent");
    add(
      rangeInt(5, 9),
      "Utilities",
      rangeFloat(75, 110),
      "expense",
      "Electricity",
      pick(expenseCardIds),
    );
    add(
      rangeInt(10, 14),
      "Utilities",
      rangeFloat(45, 70),
      "expense",
      "Internet",
      pick(expenseCardIds),
    );

    // Subscriptions
    add(3, "Entertainment", 15.99, "expense", "Netflix", pick(expenseCardIds));
    add(5, "Entertainment", 10.99, "expense", "Spotify", pick(expenseCardIds));
    add(
      7,
      "Entertainment",
      9.99,
      "expense",
      "YouTube Premium",
      pick(expenseCardIds),
    );

    // Daily granular transactions
    for (let day = 1; day <= monthLastDay; day++) {
      const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      const dow = d.getDay();
      const isWeekend = dow === 0 || dow === 6;

      if (!isWeekend && rng() < 0.8) {
        add(
          day,
          "Food & Dining",
          rangeFloat(4, 8),
          "expense",
          pick(["Morning coffee", "Coffee", "Latte"]),
          pick(expenseCardIds),
        );
      }

      if (!isWeekend && rng() < 0.55) {
        add(
          day,
          "Food & Dining",
          rangeFloat(10, 18),
          "expense",
          pick(["Lunch", "Salad bowl", "Sandwich"]),
          pick(expenseCardIds),
        );
      }

      if (isWeekend && rng() < 0.5) {
        add(
          day,
          "Food & Dining",
          rangeFloat(28, 75),
          "expense",
          pick(["Dinner out", "Restaurant", "Brunch"]),
          pick(expenseCardIds),
        );
      }

      if (!isWeekend && rng() < 0.4) {
        add(
          day,
          "Transportation",
          rangeFloat(2.5, 6),
          "expense",
          pick(["Subway", "Parking"]),
          pick(expenseCardIds),
        );
      }

      if (rng() < 0.15) {
        add(
          day,
          "Shopping",
          rangeFloat(12, 48),
          "expense",
          "Amazon order",
          pick(expenseCardIds),
        );
      }
    }

    // Weekly groceries
    for (let day = 1; day <= monthLastDay; day++) {
      const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      if (d.getDay() === 0) {
        add(
          day,
          "Groceries",
          rangeFloat(55, 120),
          "expense",
          pick(["Whole Foods", "Trader Joe's", "Weekly groceries"]),
          pick(expenseCardIds),
        );
      }
    }

    // Weekly gas
    for (let day = 4; day <= monthLastDay; day += 7) {
      add(
        day,
        "Transportation",
        rangeFloat(35, 60),
        "expense",
        "Gas",
        pick(expenseCardIds),
      );
    }

    // Occasional larger expenses
    if (monthsAgo % 2 === 0) {
      add(
        rangeInt(8, 25),
        "Shopping",
        rangeFloat(55, 180),
        "expense",
        pick(["Clothes", "New shoes"]),
        pick(expenseCardIds),
      );
    }

    if ([10, 6, 2].includes(monthsAgo)) {
      add(
        rangeInt(10, 20),
        "Healthcare",
        rangeFloat(40, 130),
        "expense",
        "Doctor visit",
        pick(expenseCardIds),
      );
    }

    if (monthsAgo % 2 === 0) {
      add(
        rangeInt(8, 14),
        "Personal Care",
        rangeFloat(35, 55),
        "expense",
        "Haircut",
        pick(expenseCardIds),
      );
    }

    if ([11, 7, 3].includes(monthsAgo)) {
      add(
        rangeInt(15, 22),
        "Travel",
        rangeFloat(180, 380),
        "expense",
        "Weekend trip",
        pick(expenseCardIds),
      );
    }
  }

  return txns;
};

const seed = async () => {
  const client = await pool.connect();

  try {
    const existing = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [DEMO_USER.email],
    );
    if (existing.rows.length > 0) {
      console.log(`Removing existing demo user (${DEMO_USER.email})...`);
      await client.query("DELETE FROM users WHERE email = $1", [
        DEMO_USER.email,
      ]);
    }

    await client.query("BEGIN");

    console.log(`Creating user ${DEMO_USER.email}...`);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(DEMO_USER.password, salt);
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, currency)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
      [DEMO_USER.name, DEMO_USER.email, passwordHash, DEMO_USER.currency],
    );
    const userId = userResult.rows[0].id;

    console.log(`Seeding ${defaultCategories.length} default categories...`);
    for (const cat of defaultCategories) {
      await client.query(
        `INSERT INTO categories (user_id, name, type, icon, color, is_default)
                 VALUES ($1, $2, $3, $4, $5, true)`,
        [userId, cat.name, cat.type, cat.icon, cat.color],
      );
    }

    const catRes = await client.query(
      "SELECT id, name FROM categories WHERE user_id = $1",
      [userId],
    );

    const catMap = {};
    catRes.rows.forEach((c) => {
      catMap[c.name] = c.id;
    });

    console.log(`Seeding ${CARDS.length} cards...`);
    const cardMap = {};
    for (const card of CARDS) {
      const cardRes = await client.query(
        `INSERT INTO cards (user_id, name, type, bank, brand, last_four, color, is_default)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING id`,
        [
          userId,
          card.name,
          card.type,
          card.bank,
          card.brand,
          card.lastFour,
          card.color,
          card.isDefault,
        ],
      );
      cardMap[card.name] = cardRes.rows[0].id;
    }

    const transactions = generateTransactions(catMap, cardMap);
    console.log(
      `Inserting ${transactions.length} transactions across 12 months...`,
    );

    const placeholders = [];
    const params = [];
    transactions.forEach((t, i) => {
      const base = i * 7;
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`,
      );
      params.push(
        userId,
        t.categoryId,
        t.cardId,
        t.amount,
        t.type,
        t.description,
        t.date,
      );
    });

    if (placeholders.length > 0) {
      await client.query(
        `INSERT INTO transactions (user_id, category_id, card_id, amount, type, description, transaction_date)
                 VALUES ${placeholders.join(", ")}`,
        params,
      );
    }

    const today = new Date();
    const monthStartStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

    console.log(`Inserting ${BUDGETS.length} budgets...`);
    for (const b of BUDGETS) {
      await client.query(
        `INSERT INTO budgets (user_id, category_id, amount, period, start_date)
                 VALUES ($1, $2, $3, 'monthly', $4)`,
        [userId, catMap[b.name], b.amount, monthStartStr],
      );
    }

    await client.query("COMMIT");

    console.log("");
    console.log("Demo data seeded successfully!");
    console.log("");
    console.log(" Email: nikolozijulakidze@gmail.com");
    console.log(" Password: Test@1234");
    console.log("");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
