const express = require("express");
const router = express.Router();

// Initialize a SN Utility Object
const snUtils = require("../utils/snUtils");

// Initialize Slack Object
const slackEventRouter = require("./slackEvents");
const web = slackEventRouter.Web;

router.use("/", express.json());
router.post("/", (req, res) => {
  console.log(req.body);
  res.status(200).send(req.body);
});

router.use("/incident", express.json());
router.post("/incident", (req, response) => {
  var inc = req.body;
  console.log(inc);

  snUtils.createIncidentChannel(inc.number)
    .then(res => {
      console.log("Incident Channel Created");
      console.log(res.data);

      if (res.data.ok) {
        var message = snUtils.buildMessage(res.data.group.id, inc, 'incident');
        console.log(message);

        // join the channel
        console.log("Channel ID: ", res.data.group.id);
        snUtils
          .inviteToChannel(res.data.group.id, process.env.SLACK_BOT_USER_ID)
          .then(channelResponse => {
            // post the message
            web.chat.postMessage(message)
              .then(msgResponse =>
                console.log("Message sent: ", msgResponse.ts)
              )
              .catch(console.error);
            return response
              .status(200)
              .send("Slack incident group channel created: " + inc.number);
          })
          .catch(console.error);
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

module.exports = router;


