const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../", ".env") });

module.exports.generateJwtTokens = (user) => {
  console.log("generate token");
  console.log(user);
  console.log(process.env.ACCESS_TOKEN);
  const ACCESS_TOKEN = jwt.sign(user.dataValues, process.env.ACCESS_TOKEN);
  //   const REFRESH_TOKEN = jwt.sign(user.dataValues, process.env.REFRESH_TOKEN);
  const response = {
    ACCESS_TOKEN,
  };
  return response;
};
