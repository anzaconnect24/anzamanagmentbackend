/**
 * Two-Factor Authentication Utility
 * Generates and validates 2FA codes for admin users
 */

// In-memory store for 2FA codes (consider using Redis in production)
const twoFactorCodes = new Map();

/**
 * Generate a 6-digit 2FA code
 * @returns {string} 6-digit code
 */
const generate2FACode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Store 2FA code for a user
 * @param {number} userId - User ID
 * @param {string} code - Generated code
 * @param {number} expiryMinutes - Code expiry time in minutes (default: 10)
 */
const store2FACode = (userId, code, expiryMinutes = 10) => {
  const expiryTime = Date.now() + expiryMinutes * 60 * 1000;
  twoFactorCodes.set(userId, {
    code,
    expiryTime,
    attempts: 0,
  });
};

/**
 * Verify 2FA code for a user
 * @param {number} userId - User ID
 * @param {string} code - Code to verify
 * @returns {object} Verification result
 */
const verify2FACode = (userId, code) => {
  const storedData = twoFactorCodes.get(userId);

  if (!storedData) {
    return {
      valid: false,
      message: "No 2FA code found. Please request a new code.",
    };
  }

  if (Date.now() > storedData.expiryTime) {
    twoFactorCodes.delete(userId);
    return {
      valid: false,
      message: "2FA code has expired. Please request a new code.",
    };
  }

  if (storedData.attempts >= 3) {
    twoFactorCodes.delete(userId);
    return {
      valid: false,
      message: "Too many failed attempts. Please request a new code.",
    };
  }

  if (storedData.code === code) {
    twoFactorCodes.delete(userId);
    return {
      valid: true,
      message: "2FA verification successful.",
    };
  }

  storedData.attempts += 1;
  twoFactorCodes.set(userId, storedData);

  return {
    valid: false,
    message: `Invalid 2FA code. ${3 - storedData.attempts} attempts remaining.`,
  };
};

/**
 * Remove 2FA code for a user
 * @param {number} userId - User ID
 */
const remove2FACode = (userId) => {
  twoFactorCodes.delete(userId);
};

module.exports = {
  generate2FACode,
  store2FACode,
  verify2FACode,
  remove2FACode,
};
