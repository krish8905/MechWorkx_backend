require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const pool = require("./config/db");

const app = express();
app.use(cors());
app.use(express.json());

// ─── In-memory OTP store: phone → { otp, expiresAt } ───
const otpStore = new Map();
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// ─── Helpers ───
const isValidPhone = (phone) =>
  typeof phone === "string" && /^\d{10,15}$/.test(phone);

const VALID_USER_TYPES = ["customer", "vendor", "both"];

const signToken = (user) => {
  return jwt.sign(
    { id: user.id, phone: user.phone, user_type: user.user_type },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

const generateOTP = () => {
  return String(Math.floor(1000 + Math.random() * 9000)); // 4-digit random
};

// ─── Health check ───
app.get("/", (req, res) => res.json({ ok: true, service: "MechWorkx-backend" }));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SIGNUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post("/auth/signup", async (req, res) => {
  try {
    const { name, username, email, user_type, phone } = req.body;

    // ── Validation ──
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (!username || typeof username !== "string" || username.trim().length === 0) {
      return res.status(400).json({ message: "Username is required" });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ message: "Valid phone number is required (10-15 digits)" });
    }
    if (!VALID_USER_TYPES.includes(user_type)) {
      return res.status(400).json({ message: "User type must be customer, vendor, or both" });
    }

    // ── Check duplicates ──
    const existingPhone = await pool.query("SELECT id FROM users WHERE phone=$1", [phone]);
    if (existingPhone.rowCount > 0) {
      return res.status(409).json({ message: "Phone number already registered" });
    }

    if (username) {
      const existingUsername = await pool.query("SELECT id FROM users WHERE username=$1", [username.trim()]);
      if (existingUsername.rowCount > 0) {
        return res.status(409).json({ message: "Username already taken" });
      }
    }

    // ── Insert user ──
    const result = await pool.query(
      `INSERT INTO users (name, username, email, user_type, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, username, email, user_type, phone, created_at`,
      [name.trim(), username.trim(), email || null, user_type, phone]
    );

    const user = result.rows[0];

    return res.status(201).json({
      message: "Signup successful",
      user
    });
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SEND OTP  (Login Step 1)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post("/auth/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!isValidPhone(phone)) {
      return res.status(400).json({ message: "Valid phone number is required" });
    }

    // Check if user exists
    const result = await pool.query("SELECT id FROM users WHERE phone=$1", [phone]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "No account found with this phone number" });
    }

    // Generate & store OTP
    const otp = generateOTP();
    otpStore.set(phone, {
      otp,
      expiresAt: Date.now() + OTP_EXPIRY_MS
    });

    console.log(`[OTP] Phone: ${phone} → OTP: ${otp}`);

    // Return OTP in response for testing (remove this in production!)
    return res.json({
      message: "OTP sent successfully",
      otp // ← for testing only
    });
  } catch (err) {
    console.error("SEND-OTP ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  VERIFY OTP  (Login Step 2)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post("/auth/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!isValidPhone(phone)) {
      return res.status(400).json({ message: "Valid phone number is required" });
    }
    if (!otp || typeof otp !== "string" || otp.length !== 4) {
      return res.status(400).json({ message: "A valid 4-digit OTP is required" });
    }

    // Check stored OTP
    const stored = otpStore.get(phone);
    if (!stored) {
      return res.status(400).json({ message: "No OTP requested for this phone number" });
    }
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(phone);
      return res.status(400).json({ message: "OTP has expired. Please request a new one" });
    }
    if (stored.otp !== otp) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    // OTP is valid — remove it
    otpStore.delete(phone);

    // Fetch user
    const result = await pool.query(
      "SELECT id, name, username, email, user_type, phone, created_at FROM users WHERE phone=$1",
      [phone]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];
    const token = signToken(user);

    return res.json({
      message: "Login successful",
      token,
      user
    });
  } catch (err) {
    console.error("VERIFY-OTP ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  JWT AUTH MIDDLEWARE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  GET PROFILE (Protected)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get("/me", auth, async (req, res) => {
  try {
    const { id } = req.user;
    const result = await pool.query(
      "SELECT id, name, username, email, user_type, phone, created_at FROM users WHERE id=$1",
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "User not found" });
    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("ME ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ─── Start server ───
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
