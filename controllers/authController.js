const {
  isNonEmptyString,
  isValidEmail,
  normalizePhone,
  isValidPhone,
  isValidUserType,
} = require("../utils/validators");

const { findByEmail, findByPhone, createUser } = require("../models/userModel");
const { generateOTP, saveOTP, verifyOTP } = require("../utils/otpStore");

// ✅ REGISTER (no password, Phone+OTP flow)
async function register(req, res) {
  try {
    const { name, tradeName, email, userType, phone } = req.body;

    // Mandatory field validations
    if (!isNonEmptyString(name)) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (!isNonEmptyString(tradeName)) {
      return res.status(400).json({ message: "Trade Name is required" });
    }
    if (!isValidUserType(userType)) {
      return res
        .status(400)
        .json({ message: "User Type must be Customer, Vendor, or Both" });
    }

    // Email optional but must be valid if present
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Email format is invalid" });
    }

    // Phone numeric + valid length
    const phoneDigits = normalizePhone(phone);
    if (!isValidPhone(phoneDigits)) {
      return res
        .status(400)
        .json({ message: "Phone number must be numeric and 10–15 digits" });
    }

    // Uniqueness checks
    if (email) {
      const e = await findByEmail(email.trim().toLowerCase());
      if (e.rowCount > 0) {
        return res.status(409).json({ message: "Email already registered" });
      }
    }

    const p = await findByPhone(phoneDigits);
    if (p.rowCount > 0) {
      return res.status(409).json({ message: "Phone already registered" });
    }

    const user = await createUser({
      name: name.trim(),
      tradeName: tradeName.trim(),
      email: email ? email.trim().toLowerCase() : null,
      userType: String(userType).toLowerCase(),
      phone: phoneDigits,
    });

    return res.status(201).json({
      message: "Registration successful",
      user,
    });
  } catch (err) {
    console.log("---- REGISTER FAILED ----");
    console.log(err);
    console.log(err?.message);
    console.log(err?.stack);
    console.log("-------------------------");

    return res.status(500).json({
      message: "Server error",
      debug: err?.message || "unknown error",
    });
  }
}

// ✅ SEND OTP (TEMPORARY: returns OTP in response)
async function sendOTP(req, res) {
  try {
    const { phone } = req.body;

    const phoneDigits = normalizePhone(phone);
    if (!isValidPhone(phoneDigits)) {
      return res
        .status(400)
        .json({ message: "Phone number must be numeric and 10–15 digits" });
    }

    const otp = generateOTP();
    saveOTP(phoneDigits, otp);

    return res.json({
      message: "OTP generated (temporary)",
      otp, // ⚠️ remove later when SMS is added
    });
  } catch (err) {
    console.log("---- SEND OTP FAILED ----");
    console.log(err?.message);
    return res.status(500).json({ message: "Server error" });
  }
}

// ✅ VERIFY OTP
async function verifyOTPController(req, res) {
  try {
    const { phone, otp } = req.body;

    const phoneDigits = normalizePhone(phone);
    if (!isValidPhone(phoneDigits)) {
      return res
        .status(400)
        .json({ message: "Phone number must be numeric and 10–15 digits" });
    }

    if (!otp || String(otp).length !== 4) {
      return res.status(400).json({ message: "OTP must be 4 digits" });
    }

    const ok = verifyOTP(phoneDigits, String(otp));
    if (!ok) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    return res.json({ message: "OTP verified successfully" });
  } catch (err) {
    console.log("---- VERIFY OTP FAILED ----");
    console.log(err?.message);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = { register, sendOTP, verifyOTPController };
