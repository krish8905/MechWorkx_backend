require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./config/db");


const app = express();
app.use(cors());
app.use(express.json());

const isValidEmail = (email) =>
  typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const signToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

// Health check
app.get("/", (req, res) => res.json({ ok: true, service: "auth-backend-test" }));

// SIGNUP
app.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 chars" });
    }

    // Check if user exists
    const existing = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at",
      [name || null, email, password_hash]
    );

    const user = result.rows[0];
    const token = signToken(user);

    return res.status(201).json({
      message: "Signup successful",
      token,
      user
    });
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// LOGIN
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }
    if (typeof password !== "string" || password.length === 0) {
      return res.status(400).json({ message: "Password is required" });
    }

    const result = await pool.query(
      "SELECT id, name, email, password_hash, created_at FROM users WHERE email=$1",
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(user);

    // Don’t return password_hash
    delete user.password_hash;

    return res.json({
      message: "Login successful",
      token,
      user
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Simple JWT middleware (for protected routes later)
const auth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Example protected route
app.get("/me", auth, async (req, res) => {
  const { id } = req.user;
  const result = await pool.query(
    "SELECT id, name, email, created_at FROM users WHERE id=$1",
    [id]
  );
  if (result.rowCount === 0) return res.status(404).json({ message: "User not found" });
  return res.json({ user: result.rows[0] });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
