require("dotenv").config();
const axios = require("axios");
require("Buffer");

const { SNUSERID: userid, SNPASSWORD: password } = process.env;
const serviceNowHttpHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Basic ${_getEncodedAuthorizationToken()}`
};
const slackHttpHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: "Bearer " + process.env.SLACK_OAUTH_ACCESS_TOKEN
};

module.exports = {
    getTicketInfoPromise: function(ticketNumber) {
        return new Promise((resolve, reject) => {
            let table = _getTable(ticketNumber);
            let instance = process.env.SNENV;

            // console.log(table);
            // console.log(ticketNumber);
            if (!table) return reject("Incorrect Table specified");

            const url = `https://${instance}.service-now.com/api/now/table/${table}?sysparm_query=number%3D${ticketNumber}&sysparm_limit=1&sysparm_display_value=true&sysparm_exclude_reference_link=true`;
            const options = {
                method: "GET",
                headers: serviceNowHttpHeaders
            };
            axios
                .get(url, options)
                .then(res => {
                    console.log(res.data.result);
                    if (res.data.result.length > 0) {
                        var ticketInfo = res.data.result[0];
                        var sysId = ticketInfo.sys_id;
                        ticketInfo.table = table;
                        ticketInfo.link = `https://${instance}.service-now.com/cssp?id=ticket&table=${table}&sys_id=${sysId}`;
                        return resolve(ticketInfo);
                    } else return reject("No Data returned from ServiceNow");
                })
                .catch(err => {
                    console.error;
                    return reject("Not able to make REST Call");
                });
        });
    },

    getTicketNumber: function(text) {
        var matchArr = ["RITM", "TASK", "CHG", "INC"];
        var textArr = text.split(" ");
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
    createIncidentChannel: function(channelName) {
        return new Promise((resolve, reject) => {
            const config = {
                method: "post",
                url: "https://slack.com/api/groups.create",
                data: {
                    name: channelName
                },
                headers: slackHttpHeaders
            };
            axios(config)
                .then(res => resolve(res))
                .catch(err => {
                    reject(err);
                });
        });
    },

    inviteToChannel: function(slackChannelId, slackUserId) {
        return new Promise((resolve, reject) => {
            const config = {
                method: "post",
                url: "https://slack.com/api/groups.invite",
                data: {
                    channel: slackChannelId,
                    user: slackUserId
                },
                headers: slackHttpHeaders
            };
            axios(config)
                .then(res => resolve(res))
                .catch(err => reject(err));
        });
    },

    ///table = 'incident', 'sc_req_item', 'sc_task', 'change_request'
    buildMessage: function(slackGroupID, ticketJSON, table) {
        // Prepare attachmentJSON
        var attachmentJSON = {};
        attachmentJSON.fallback = `${ticketJSON.number}: ${
            ticketJSON.short_description
        }`;
        attachmentJSON.fields = [];
        attachmentJSON.title = ticketJSON.number;
        attachmentJSON.title_link = ticketJSON.link;
        attachmentJSON.footer = "SlackNow";
        attachmentJSON.footer_icon =
            "https://c74213ddaf67eb02dabb-04de5163e3f90393a9f7bb6f7f0967f1.ssl.cf1.rackcdn.com/V1~905b01b2326062159eeac981174af77e~kO62_TftSkSEWjj5xF-0Ig==";
        attachmentJSON.ts = Math.round(new Date().getTime() / 1000);

        var fieldLabels, fieldValues;
        switch (table) {
            case "incident":
                attachmentJSON.color = "danger";
                fieldLabels = [
                    "Short Description",
                    "Assignment Group",
                    "Priority",
                    "State",
                    "Category",
                    "Configuration Item"
                ];
                fieldValues = [
                    ticketJSON.short_description,
                    ticketJSON.assignment_group,
                    ticketJSON.priority,
                    ticketJSON.state,
                    ticketJSON.category,
                    ticketJSON.cmdb_ci
                ];
                break;
            case "sc_req_item":
                attachmentJSON.color = "good";
                fieldLabels = [
                    "Short Description",
                    "Assignment Group",
                    "Priority",
                    "Stage",
                    "Requested For",
                    "Requested Item"
                ];
                fieldValues = [
                    ticketJSON.short_description,
                    ticketJSON.assignment_group,
                    ticketJSON.priority,
                    ticketJSON.stage,
                    ticketJSON.u_req_for,
                    ticketJSON.cat_item
                ];
                break;
            case "sc_task":
                attachmentJSON.color = "good";
                fieldLabels = [
                    "Short Description",
                    "Assignment Group",
                    "Priority",
                    "State",
                    "Parent",
                    "Opened By"
                ];
                fieldValues = [
                    ticketJSON.short_description,
                    ticketJSON.assignment_group,
                    ticketJSON.priority,
                    ticketJSON.state,
                    ticketJSON.parent,
                    ticketJSON.opened_by
                ];
                break;
            case "change_request":
                attachmentJSON.color = "warning";
                if (ticketJSON.u_change_format == "EIS Change") {
                    fieldLabels = [
                        "Short Description",
                        "Assignment Group",
                        "Risk",
                        "State",
                        "Category",
                        "Configuration Item"
                    ];
                    fieldValues = [
                        ticketJSON.short_description,
                        ticketJSON.assignment_group,
                        ticketJSON.risk,
                        ticketJSON.state,
                        ticketJSON.category,
                        ticketJSON.cmdb_ci
                    ];
                } else {
                    //CS-Link Change or CS-Link Release Authorization
                    fieldLabels = [
                        "Short Description",
                        "Configuration Item",
                        "Assignment Group",
                        "Assigned To",
                        "Priority",
                        "State",
                        "Project",
                        "Requested PRD Date"
                    ];
                    fieldValues = [
                        ticketJSON.short_description,
                        ticketJSON.cmdb_ci,
                        ticketJSON.assignment_group,
                        ticketJSON.assigned_to,
                        ticketJSON.priority,
                        ticketJSON.state,
                        ticketJSON.u_project,
                        ticketJSON.requested_by_date
                    ];
                }
                break;
            default:
                console.log(
                    "Table not recognized, please check your table parameter"
                );
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
    },

    getMyApprovals: function() {
        return new Promise((resolve, reject) => {
            let instance = process.env.SNENV;
            let table = "sysapproval_approver";
            const url = `https://${instance}.service-now.com/api/now/table/${table}?sysparm_query=state%3Drequested%5Eapprover%3D2f5cce24db033300c2b22946489619e3&sysparm_display_value=true&sysparm_limit=10`;
            const options = {
                method: "GET",
                headers: serviceNowHttpHeaders
            };
            axios
                .get(url, options)
                .then(res => {
                    console.log(res.data.result);
                    if (res.data.result.length > 0)
                        return resolve(res.data.result);
                    else return reject("There are no pending approvals");
                })
                .catch(err => {
                    console.log(err);
                    reject(err);
                });
        });
    },

    buildApprovalMessage: function(eventChannel, ticketJSON) {
        return {
            text: `<${ticketJSON.sysapproval.link}|${
                ticketJSON.sysapproval.display_value
            }>`,
            channel: eventChannel,
            attachments: [
                {
                    text: "Please approve or reject",
                    fallback: ticketJSON.sysapproval.display_value,
                    color: "#0000ff",
                    attachment_type: "default",
                    fields: [
                        {
                            title: "Approver",
                            value: ticketJSON.approver.display_value
                        },
                        {
                            title: "Number",
                            value: ticketJSON.sysapproval.display_value
                        }
                    ],
                    actions: [
                        {
                            name: "approve",
                            text: "Approve",
                            type: "button",
                            value: "approve",
                            style: "success"
                        },
                        {
                            name: "reject",
                            text: "Reject",
                            type: "button",
                            value: "reject",
                            style: "danger"
                        }
                    ]
                }
            ]
        };
    },

    hasApprovalIntent: function(text) {
        if (text.includes("approval") || text.includes("approvals")) {
            return true;
        } else {
            return false;
        }
    }
};

// Private
function _getTable(n) {
    if (n.startsWith("RITM")) return "sc_req_item";
    else if (n.startsWith("TASK")) return "sc_task";
    else if (n.startsWith("INC")) return "incident";
    else if (n.startsWith("CHG")) return "change_request";
    else return null;
}

// returns the encoded authentication header information
function _getEncodedAuthorizationToken() {
    const credentialStr = `${userid}:${password}`;
    return new Buffer(credentialStr, "binary").toString("base64");
}

// returns a formated JSON object for each field
function _field(title, value) {
    var field = {};

    field.title = title;
    field.value = value;
    field.short = true;

    return field;
}
