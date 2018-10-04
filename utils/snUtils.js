require('dotenv').config();
const axios = require('axios');
require('Buffer');

const { SNUSERID: userid, SNPASSWORD: password } = process.env;
const serviceNowHttpHeaders = {

    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Basic ${_getEncodedAuthorizationToken()}`

};
const slackHttpHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    "Authorization": "Bearer " + process.env.SLACK_OAUTH_ACCESS_TOKEN
};

module.exports = {
    getTicketInfo: function (ticketNumber) {

        var table = _getTable(ticketNumber);
        // console.log(table);
        // console.log(ticketNumber);
        if (!table) reject("Incorrect Table specified");

        const url = `https://csmcdev.service-now.com/api/now/table/${table}?sysparm_query=number%3D${ticketNumber}&sysparm_limit=1&sysparm_display_value=true&sysparm_exclude_reference_link=true`;
        const options = {
            'method': 'GET',
            // 'hostname': 'csmcdev.service-now.com',
            // 'port': null,
            // 'path': `/api/now/table/${table}?sysparm_query=number%3D${ticketNumber}&sysparm_limit=1`,
            'headers': serviceNowHttpHeaders
        };
        axios.get(url, options)
            .then(res => {
                // console.log(res.data.result);
                if (res.data.result.length > 0) {
                    var ticketInfo = res.data.result[0];
                    ticketInfo.table = table;
                    ticketInfo.link = "https://csmc.service-now.com";
                    resolve(ticketInfo);
                }
                else
                    return callback(null);

            })
            .catch(err => {
                console.log(err);
                return callback(null);
            });
    },

    getTicketNumber: function (text) {
        var matchArr = ["RITM", "TASK", "CHG", "INC"];
        var textArr = text.split(' ');
        for (word of textArr) {
            for (m of matchArr) {
                if (word.startsWith(m)) {
                    return word;
                }
            }
        }
        return null;
    },

    // Create Channel
    createIncidentChannel: function (channelName) {
        return new Promise((resolve, reject) => {
            const config = {
                'method': 'post',
                'url': 'https://slack.com/api/groups.create',
                'data': {
                    'name': channelName
                },
                'headers': slackHttpHeaders
            }
            axios(config)
                .then(res => resolve(res))
                .catch(err => { reject(err) });
        });
    },

    inviteToChannel: function (slackChannelId, slackUserId) {
        return new Promise((resolve, reject) => {
            const config = {
                'method': 'post',
                'url': 'https://slack.com/api/groups.invite',
                'data': {
                    'channel': slackChannelId,
                    'user': slackUserId
                },
                'headers': slackHttpHeaders
            };
            axios(config)
                .then(res => resolve(res))
                .catch(err => reject(err));
        });
    },

    ///table = 'incident', 'sc_req_item', 'sc_task', 'change_request'
    buildMessage: function (slackGroupID, ticketJSON, table) {

        // Prepare attachmentJSON
        var attachmentJSON = {};
        attachmentJSON.fallback = `${ticketJSON.number}: ${ticketJSON.short_description}`;
        attachmentJSON.fields = [];
        attachmentJSON.title = ticketJSON.number;
        attachmentJSON.title_link = ticketJSON.link;
        attachmentJSON.footer = "SlackNow";
        attachmentJSON.footer_icon = "https://c74213ddaf67eb02dabb-04de5163e3f90393a9f7bb6f7f0967f1.ssl.cf1.rackcdn.com/V1~905b01b2326062159eeac981174af77e~kO62_TftSkSEWjj5xF-0Ig==";
        attachmentJSON.ts = Math.round(new Date().getTime() / 1000);

        var fieldLabels, fieldValues;
        switch (table) {
            case "incident":
                attachmentJSON.color = "danger";
                fieldLabels = ["Short Description", "Assignment Group", "Priority", "State", "Category", "Configuration Item"];
                fieldValues = [ticketJSON.short_description, ticketJSON.assignment_group, ticketJSON.priority, ticketJSON.state, ticketJSON.category, ticketJSON.cmdb_ci];
                break;
            case "sc_req_item":
                attachmentJSON.color = "good";
                fieldLabels = ["Short Description", "Assignment Group", "Priority", "Stage", "Requested For", "Requested Item"];
                fieldValues = [ticketJSON.short_description, ticketJSON.assignment_group, ticketJSON.priority, ticketJSON.stage, ticketJSON.u_req_for, ticketJSON.cat_item];
                break;
            case "sc_task":
                attachmentJSON.color = "good";
                fieldLabels = ["Short Description", "Assignment Group", "Priority", "State", "Parent", "Opened By"];
                fieldValues = [ticketJSON.short_description, ticketJSON.assignment_group, ticketJSON.priority, ticketJSON.state, ticketJSON.parent, ticketJSON.opened_by];
                break;
            case "change_request":
                attachmentJSON.color = "warning";
                if (ticketJSON.u_change_format == "EIS Change") {
                    fieldLabels = ["Short Description", "Assignment Group", "Risk", "State", "Category", "Configuration Item"];
                    fieldValues = [ticketJSON.short_description, ticketJSON.assignment_group, ticketJSON.risk, ticketJSON.state, ticketJSON.category, ticketJSON.cmdb_ci];
                }
                else { //CS-Link Change or CS-Link Release Authorization
                    fieldLabels = ["Short Description", "Configuration Item", "Assignment Group", "Assigned To", "Priority", "State", "Project", "Requested PRD Date"];
                    fieldValues = [ticketJSON.short_description, ticketJSON.cmdb_ci, ticketJSON.assignment_group, ticketJSON.assigned_to, ticketJSON.priority, ticketJSON.state, ticketJSON.u_project, ticketJSON.requested_by_date];
                }
                break;
            default:
                console.log("Table not recognized, please check your table parameter")
                return null;
        }

        // Attach fields to the JSON object
        for (var i = 0; i < fieldLabels.length; ++i) {
            attachmentJSON.fields.push(_field(fieldLabels[i], fieldValues[i]));
        }


        // Prepare message
        var msg = {};
        msg.channel = slackGroupID;
        msg.attachments = [attachmentJSON];

        return msg;
    }
};

// Private
function _getTable(n) {
    if (n.startsWith('RITM')) return 'sc_req_item';
    else if (n.startsWith('TASK')) return 'sc_task';
    else if (n.startsWith('INC')) return 'incident';
    else if (n.startsWith('CHG')) return 'change_request';
    else return null;
}

// returns the encoded authentication header information 
function _getEncodedAuthorizationToken() {
    const credentialStr = `${userid}:${password}`;
    return new Buffer(credentialStr, 'binary').toString('base64');
}

// returns a formated JSON object for each field
function _field(title, value) {
    var field = {};

    field.title = title;
    field.value = value;
    field.short = true;

    return field;
}