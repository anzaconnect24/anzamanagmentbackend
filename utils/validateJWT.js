const jwt = require("jsonwebtoken");

const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../", ".env") });

module.exports.validateJWT = async (req, res, next) => {
  const headers = req.headers["authorization"];
  if (headers) {
    const tokens = headers.split(" ")[1];

    if (tokens == null) return res.status(401);
    jwt.verify(tokens, process.env.ACCESS_TOKEN, (error, user) => {
      if (error)
        return res
          .status(403)
          .json({ status: false,code:403, error: "Oops! You don't have access" });
      req.user = user;
      next();
    });
  } else {
    return res
      .status(403)
      .json({ status: false,code:403, error: "Oops! You don't have access" });
  }
};