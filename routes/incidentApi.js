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
  var message;
  var incidentChannelResponse = snUtils.createIncidentChannel(inc.number);
  var inviteChannelResponse = incidentChannelResponse.then(res => {
      console.log(res.data);
      message = snUtils.buildMessage(res.data.group.id, inc, 'incident');
      return snUtils.inviteToChannel(res.data.group.id, process.env.SLACK_BOT_USER_ID);
    });
  var postMessageResponse = inviteChannelResponse.then(() => {
    web.chat.postMessage(message);
    return response.status(200).send("Message Posted");
  })

  return postMessageResponse
  .then(() => console.log("Message successfully posted"))
  .catch(err => console.log("Error creating incident group! " + err));
});

module.exports = router;


