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
    _handleMessageOrMentionEvent(event);
});

slackEvents.on("message", event => {
    _handleMessageOrMentionEvent(event);
});

function _handleMessageOrMentionEvent(event) {
    console.log(event);
    if (!event.subtype) {
        // event.subtype != 'bot_message' && event.subtype != 'channel_join'
        // Chain Promises to execute sequence of events
        var number = snUtils.getTicketNumber(event.text.toUpperCase());
        var hasApproval = snUtils.hasApprovalIntent(event.text.toLowerCase());
        // console.log(number);

        if (hasApproval) {
            console.log("User intent: Approval");
            snUtils
                .getMyApprovals()
                .then(approvalList => {
                    for (approval of approvalList) {
                        web.chat.postMessage(
                            snUtils.buildApprovalMessage(
                                event.channel,
                                approval
                            )
                        );
                    }
                })
                .catch(msg => {
                    web.chat.postMessage({
                        channel: event.channel,
                        text: msg
                    });
                });
        } else {
            console.log("User intent: TIcket Info");
            snUtils
                .getTicketInfoPromise(number)
                .then(info =>
                    web.chat.postMessage(
                        snUtils.buildMessage(event.channel, info, info.table)
                    )
                )
                .catch(() => {
                    web.chat.postMessage({
                        channel: event.channel,
                        text: "Hey there, try giving me a ticket number."
                    });
                    console.error;
                });
        }
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
