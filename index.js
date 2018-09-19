// const path = require('path');
// require('dotenv').config();
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

app.post('/api/incident', (inc) => {
  console.log(inc);
  snUtils.createIncidentChannel(inc.name, res => {
    var message = {
      "channel": res.group.id,
      "text": inc.number,
      "attachments": [
        {
          "fallback": `${inc.number}: ${inc.short_description}`,
          "color": "danger",
          "pretext": `Priority 1 ${inc.number} has been created.`,
          "title": inc.number,
          "title_link": inc.sn_link,
          "fields": [
            {
              "title": "State",
              "value": inc.state
            },
            {
              "title": "Assigned to",
              "value": inc.assigned_to
            },
            {
              "title": "Priority",
              "value": inc.priority
            },
            {
              "title": "Assignment Group",
              "value": inc.assignment_group
            },
            {
              "title": "Category",
              "value": inc.category
            },
            {
              "title": "Short Description",
              "value": inc.short_description
            }
          ],
          "footer": "SlackNow",
          "footer_icon": "https://c74213ddaf67eb02dabb-04de5163e3f90393a9f7bb6f7f0967f1.ssl.cf1.rackcdn.com/V1~905b01b2326062159eeac981174af77e~kO62_TftSkSEWjj5xF-0Ig==",
          "ts": Date.now()
        }
      ]
    }
    //post the message
    web.chat.postMessage(message)
    .then(res => console.log("Message sent: ", res.ts))
    .catch(console.error);
  });
});

// Attach listeners to events by Slack Event "type". See: https://api.slack.com/events/message.im
slackEvents.on('message', (event) => {
  console.log(event);
  if (event.subtype != 'bot_message') {
    
    //get the ticketNumber and lookup information on it
    var ticket = snUtils.getTicketNumber(event.text);
    if (ticket) {
      snUtils.getTicketInfo(ticket, (res) => {
        if(res) web.chat.postMessage({
          channel: event.channel,
          text: `${res.number}: ${res.short_description}`
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