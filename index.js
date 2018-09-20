// const path = require('path');
require('dotenv').config();
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
app.use(express.json());

// Initialize a SN Utility Object
const snUtils = require("./snUtil");

// Mount the event handler on a route
// NOTE: you must mount to a path that matches the Request URL that was configured earlier
app.use('/slack/events', slackEvents.expressMiddleware());

app.get('/', (req, res) => {
  res.send("ServiceNow Slack Integration Endpoint: https://crispychris.herokuapp.com/slack/events");
  // return res.status(200).sendFile(path.resolve(__dirname, "example.html"));
});

app.use('/api', express.json());
app.post('/api', (req,res) => {
  console.log(req.body);
  res.status(200).send(req.body);
});

app.use('/api/incident', express.json());

app.post('/api/incident', (req, response) => {
  var inc = req.body;
  // var message = snUtils.getIncidentMessageJson(inc);
  // console.log(inc.number);
  snUtils.createIncidentChannel(inc.number)
    .then(res => {
      console.log("here");
      console.log(res.data);

      if (res.data.ok) {

        var message = {
          "channel": res.data.group.id,
          "text": inc.number,
          "attachments": [
            {
              "fallback": `${inc.number}: ${inc.short_description}`,
              "color": "danger",
              "pretext": `Priority 1 ${inc.number} has been created.`,
              "title": inc.number,
              "title_link": inc.link,
              "fields": [
                {
                  "title": "State",
                  "value": inc.state,
                  "short": true
                },
                {
                  "title": "Configuration Item",
                  "value": inc.cmdb_ci,
                  "short": true
                },
                {
                  "title": "Priority",
                  "value": inc.priority,
                  "short": true
                },
                {
                  "title": "Assignment Group",
                  "value": inc.assignment_group,
                  "short": true
                },
                {
                  "title": "Category",
                  "value": inc.category,
                  "short": true
                },
                {
                  "title": "Short Description",
                  "value": inc.short_description,
                  "short": true
                }
              ],
              "footer": "SlackNow",
              "footer_icon": "https://c74213ddaf67eb02dabb-04de5163e3f90393a9f7bb6f7f0967f1.ssl.cf1.rackcdn.com/V1~905b01b2326062159eeac981174af77e~kO62_TftSkSEWjj5xF-0Ig==",
              "ts": Math.round((new Date()).getTime() / 1000)
            }
          ]
        }

        // join the channel
        console.log(res.data.group.id);
        snUtils.inviteToChannel(res.data.group.id, process.env.SLACK_BOT_USER_ID)
          .then(channelResponse => {
            // post the message
            web.chat.postMessage(message)
              .then(msgResponse => console.log("Message sent: ", msgResponse.ts))
              .catch(console.error);
            return response.status(200).send("Slack incident group channel created: " + inc.number);

          })
          .catch(err => console.error);


      } else {
        console.log("Incident Channel Response code NOT ok: " + JSON.stringify(res.data));
        return response.status(400).send("Error creating incident group: " + res.data.error);
      }

    })
    .catch(err => {
      console.log("Error creating incident group: " + err);
      response.status(400).send(err);
    });
});

// Attach listeners to events by Slack Event "type". See: https://api.slack.com/events/message.im
slackEvents.on('message', (event) => {
  console.log(event);
  if (event.subtype != 'bot_message' && event.subtype != 'channel_join') {

    //get the ticketNumber and lookup information on it
    var ticket = snUtils.getTicketNumber(event.text);
    if (ticket) {
      snUtils.getTicketInfo(ticket, (res) => {
        if (res) web.chat.postMessage({
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
        text: "Hey there, try giving me a ticket number."
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

// export default app;