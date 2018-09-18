// const path = require('path');
const http = require('http');

// Initialize WebClient API
const { WebClient } = require('@slack/client');
const token = process.env.SLACK_TOKEN;
const web = new WebClient(token);

// Initialize using signing secret from environment variables
const { createEventAdapter } = require('@slack/events-api');
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);
// const slackEvents = createEventAdapter(secret);
const port = process.env.PORT || 3000;

// Initialize an Express application
const express = require('express');
const app = express();

// Initialize a SN Utility Object
const snUtils = require("./snUtil");

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

    // web.chat.postMessage({
    //   channel: event.channel,
    //   text: "You said: " + event.text
    // })
    //   .then((res) => {
    //     console.log("Message sent: ", res.ts);
    //   })
    //   .catch(console.error);
    console.log(event.text.toUpperCase());
    
    var ticket = snUtils.getTicketNumber(event.text);
    if (ticket) {
      snUtils.getTicketInfo(ticket, (res) => {
        if(res) web.chat.postMessage({
          channel: event.channel,
          text: `${res.number}: ${res.description}`
        })
      .then((res) => {
        console.log("Message sent: ", res.ts);
      })
      .catch(console.error);
      });
    }
    else {
      web.chat.postMessage({
        channel: event.channel,
        text: "Hey there, I'm able to lookup infromation from ServiceNow such as ticket description and show approvals."
      })
      .then(res => {
        console.log("Query not understood: ", event.text);
      })
      .catch(console.error);
    }
  }
  // console.log(`Received a message event: user ${event.user} in channel ${event.channel} says ${event.text}`);
});

slackEvents.on('reaction_added', (event) => {
  console.log(`User ${event.user} reacted with ${event.reaction}`);
});

// Handle errors (see `errorCodes` export)
slackEvents.on('error', console.error);

// Start the express application
http.createServer(app).listen(port, () => {
  console.log(`server listening on port ${port}`);
});