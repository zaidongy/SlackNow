// const path = require('path');
require("dotenv").config();
const http = require("http");
const port = process.env.PORT || 3000;
console.log(port);

// Initialize an Express application
const express = require("express");
const app = express();

// Default welcome page
app.get("/", (req, res) => {
  // return res.send("ServiceNow Slack Integration Endpoint: https://crispychris.herokuapp.com/slack/events");
  return res.status(200).sendFile(path.resolve(__dirname, "example.html"));
});

// Create router instances
const incidentApiRouter = require("./routes/incidentApi");
const slackEventRouter = require("./routes/slackEvents");

// Mount router instances
app.use("/api", incidentApiRouter);
app.use("/slack/events", slackEventRouter.Router);

// Start the express application
http.createServer(app).listen(port, () => {
  console.log(`server listening on port ${port}`);
});

module.exports = app;
