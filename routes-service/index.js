require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routeRoutes = require("./routes/routeRoutes");

const app = express();
const PORT = process.env.ROUTES_SERVICE_PORT || 3005;

app.use(cors());
app.use(express.json());
app.use("/api/routes", routeRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ service: "routes-service", status: "healthy" });
});

app.listen(PORT, () => {
  console.log(`🚴‍♂️ Routes service running on port ${PORT}`);
});

module.exports = app;
