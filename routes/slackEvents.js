var express = require("express");
var router = express.Router();

// Initialize using signing secret from environment variables
const { createEventAdapter } = require("@slack/events-api");
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);
// Initialize WebClient API
const { WebClient } = require("@slack/client");
const token = process.env.SLACK_TOKEN;
const web = new WebClient(token);

// Initialize a SN Utility Object
const snUtils = require("../utils/snUtils");

// Mount the event handler on a route
// NOTE: you must mount to a path that matches the Request URL that was configured earlier
router.use("/", slackEvents.expressMiddleware());

// Attach listeners to events by Slack Event "type". See: https://api.slack.com/events/message.im
slackEvents.on("app_mention", event => {
  _handleMessageOrMentionEvent2(event);
});

slackEvents.on('message', event => {
  _handleMessageOrMentionEvent2(event);
});

function _handleMessageOrMentionEvent(event) {
  console.log(event);
  if (!event.subtype) {
    //event.subtype != 'bot_message' && event.subtype != 'channel_join'
    //get the ticketNumber and lookup information on it
    var ticket = snUtils.getTicketNumber(event.text);
    if (ticket) {
      snUtils.getTicketInfo(ticket, res => {
        // console.log(res);
        if (res)
          web.chat.postMessage(
            snUtils.buildMessage(event.channel, res, res.table))
            .then(res => { console.log("Message sent: ", res.ts); })
            .catch(console.error);
      });

    } else {
      web.chat.postMessage({
        channel: event.channel,
        text: "Hey there, try giving me a ticket number."
      })
        .then(console.log("Unhandled query: ", event.text))
        .catch(console.error);
    }
  }
}

function _handleMessageOrMentionEvent2(event) {
  console.log(event);
  if (!event.subtype) {
    // event.subtype != 'bot_message' && event.subtype != 'channel_join'
    // Chain Promises to execute sequence of events
    var number = snUtils.getTicketNumber(event.text);
    
    snUtils.getTicketInfoPromise(number)
      .then(info => web.chat.postMessage(snUtils.buildMessage(event.channel, info, info.table)))
      .catch(() => {
        web.chat.postMessage({ channel: event.channel, text: "Hey there, try giving me a ticket number." });
        console.error;
    });
  }
}

slackEvents.on("reaction_added", event => {
  console.log(`User ${event.user} reacted with ${event.reaction}`);
});

// Handle errors (see `errorCodes` export)
slackEvents.on("error", console.error);

module.exports = {
  Router: router,
  Web: web
};
