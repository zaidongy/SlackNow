// const path = require('path');
const http = require('http');

// Initialize WebClient API
const { WebClient } = require('@slack/client');
const token = process.env.SLACK_TOKEN || 'xoxb-318891989605-422852088948-auin84ORLFHi1FdR5gEVmTGB';
const web = new WebClient(token);

// Initialize using signing secret from environment variables
const { createEventAdapter } = require('@slack/events-api');
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);
// const slackEvents = createEventAdapter(secret);
const port = process.env.PORT || 3000;

// Initialize an Express application
const express = require('express');
const app = express();

// Mount the event handler on a route
// NOTE: you must mount to a path that matches the Request URL that was configured earlier
app.use('/slack/events', slackEvents.expressMiddleware());

app.get('/', (req, res) => {
    res.send("ServiceNow Slack Integration Endpoint: https://crispychris.herokuapp.com/slack/events");
    // return res.status(200).sendFile(path.resolve(__dirname, "example.html"));
});

// Attach listeners to events by Slack Event "type". See: https://api.slack.com/events/message.im
slackEvents.on('message', (event) => {
  console.log(event);
  if (event.subtype != 'bot_message') {
    web.chat.postMessage({
      channel: event.channel,
      text: "You said: " + event.text
    })
      .then((res) => {
        console.log("Message sent: ", res.ts);
      })
      .catch(console.error);
  }
  // console.log(`Received a message event: user ${event.user} in channel ${event.channel} says ${event.text}`);
});

slackEvents.on('reaction_added', (event) => {
  console.log(event);
});

// Handle errors (see `errorCodes` export)
slackEvents.on('error', console.error);

// Start the express application
http.createServer(app).listen(port, () => {
  console.log(`server listening on port ${port}`);
});