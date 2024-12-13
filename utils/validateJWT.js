const jwt = require("jsonwebtoken");

const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../", ".env") });


module.exports.validateJWT = async (req, res, next) => {
  const headers = req.headers["authorization"];

  if (headers) {
    const token = headers.split(" ")[1]; // Extract the Bearer token

    if (!token) {
      return res.status(401).json({
        status: false,
        code: 401,
        error: "Token is missing",
      });
    }

    try {
      // Decrypt and verify the token
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN);

      // Extract the id from the decoded token
      const userId = decoded.id; // Assuming the user object has an 'id' field

      if (!userId) {
        return res.status(400).json({
          status: false,
          code: 400,
          error: "Invalid token structure: missing user ID",
        });
      }

      // Attach the userId and optionally other user data to the req object
      req.user = {
        id: userId,
        ...decoded, // Add other user details if necessary
      };

      next(); // Proceed to the next middleware or route handler
    } catch (error) {
      return res.status(403).json({
        status: false,
        code: 403,
        error: "Invalid or expired token",
      });
    }
  } else {
    return res.status(403).json({
      status: false,
      code: 403,
      error: "Authorization header is missing",
    });
  }
};
