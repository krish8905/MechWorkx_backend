const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

const isValidEmail = (email) => {
  if (email === undefined || email === null || email === "") return true; // optional
  if (typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const normalizePhone = (phone) => {
  // keep digits only
  const digits = String(phone ?? "").replace(/\D/g, "");
  return digits;
};

const isValidPhone = (phoneDigits) => {
  // You can change range if your project needs it
  // India mobile numbers are often 10 digits; generic range 10-15
  return /^\d{10,15}$/.test(phoneDigits);
};

const isValidUserType = (t) => {
  const val = String(t || "").toLowerCase();
  return ["customer", "vendor", "both"].includes(val);
};

module.exports = {
  isNonEmptyString,
  isValidEmail,
  normalizePhone,
  isValidPhone,
  isValidUserType,
};
