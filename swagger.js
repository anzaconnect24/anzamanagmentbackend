const swaggerAutogen = require("swagger-autogen")();

const doc = {
  info: {
    title: "Anza API Docs",
    description: "These are API's for Anza project ",
  },
  host: "api.anzaconnect.co.tz",
  schemes: ["https"],
};

const outputFile = "./swagger-output.json";
const routes = ["./index.js"]; // Entry point for all routes

// Generate the Swagger docs
swaggerAutogen(outputFile, routes, doc).then(() => {
  console.log("Swagger docs generated!");
});
