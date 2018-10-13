<img src="asset/images/SlackNow.png" alt="SlackNow Logo" width="300" height="100">

# SlackNow
Slacknow is backend webserver to enable communication between Slack and ServiceNow to create a better user experience for the organization.

## Intended Features (more to come):
* Display information for a specific ticket
* Automatically create group channels for p1 incidents
* Display user pending approvals with interactive messages (approve or reject)

## Environment Variables need to be defined
 * SLACK_BOT_USER_ID : *Bot user ID in Slack*  
 * SLACK_OAUTH_ACCESS_TOKEN : *Slack's Custom application's OATH token*
 * SLACK_SIGNING_SECRET : *Slack custom application's signing secret*
 * SLACK_TOKEN : *Slack Bot User's unique access token*
 * SNENV : *ServiceNow instance name*
 * SNUSERID : *User ID of your ServiceNow Intergration account*
 * SNPASSWORD : *Pasword of your ServiceNow integration account*

## ServiceNow Code for Incident Management
In order to SlackNow to process managed incidents into Slack, the trigger must come from ServiceNow. There are a couple ways to achieve this such as processing a business rule or raising an event. I've chosen the business rule option since it's simpler.

```javascript
/* Business Rule to Send P1 Incident
When = after
Order = 10000
Insert = True
Update = True
Conditions =  [Priority = 1] or [Priority changes to 1]
*/

(function executeRule(current, previous /*null when async*/) {
    var sm = new sn_ws.RESTMessageV2();
    sm.setEndpoint('https://crispychris.herokuapp.com/api/incident'); //End point to receive the incident JSON payload
    sm.setHttpMethod('POST');
    sm.setRequestHeader("Content-Type", "application/json");
    sm.setRequestHeader('Accept', 'application/json');
    var msg = grToObj(current);
    msg.link = 'https://' + gs.getProperty('instance_name') + '.service-now.com/incident.do?sys_id=' + current.sys_id;
    sm.setRequestBody(new JSON().encode(msg));
    var response = sm.execute();
    gs.info("CY: " + response);

    function grToObj(recordToPackage) {
        var packageToSend = {};
        for (var property in recordToPackage) {
            try {
                packageToSend[property] = recordToPackage[property].getDisplayValue();
            }
            catch(err) {}
        }
        return packageToSend;
    }
})(current, previous);
```

## Author
  [Chris Yang](https://twitter.com/zaidongy) (EIS Systems Analyst, Cedars-Sinai EIS)