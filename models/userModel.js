const pool = require("../config/db");

async function findByEmail(email) {
  return pool.query("SELECT id FROM users WHERE email = $1", [email]);
}

async function findByPhone(phone) {
  return pool.query("SELECT id FROM users WHERE phone = $1", [phone]);
}

async function createUser({ name, tradeName, email, userType, phone }) {
  const result = await pool.query(
    `INSERT INTO users (name, trade_name, email, user_type, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, trade_name, email, user_type, phone, created_at`,
    [name, tradeName, email || null, userType, phone]
  );
  return result.rows[0];
}

module.exports = { findByEmail, findByPhone, createUser };
