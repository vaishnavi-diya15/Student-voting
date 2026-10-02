require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  app.listen(PORT, () => {
    console.log(`[server] API running on http://localhost:${PORT}`);
  });
  await connectDB();
};

if (require.main === module) {
  startServer();
}

module.exports = app;
