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
    getTicketInfo : function(ticketNumber, callback) {

        var table = _getTable(ticketNumber);
        // console.log(table);
        // console.log(ticketNumber);
        if (!table) return callback(null);

        const url = `https://csmcstage.service-now.com/api/now/table/${table}?sysparm_query=number%3D${ticketNumber}&sysparm_limit=1`;
        const options = {
            'method': 'GET',
            // 'hostname': 'csmcstage.service-now.com',
            // 'port': null,
            // 'path': `/api/now/table/${table}?sysparm_query=number%3D${ticketNumber}&sysparm_limit=1`,
            'headers': serviceNowHttpHeaders
        };
        axios.get(url, options)
        .then(res => {
            // console.log(res.data.result);
            if(res.data.result.length > 0) 
                return callback(res.data.result[0]);
            else
                return callback(null);

        })
        .catch(err => {
            console.log(err);
            return callback(null);
        });
    },
    
    getTicketNumber: function(text) {
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
            .then(res => resolve(res) )
            .catch(err => { reject(err) } );
        });
    },

    inviteToChannel : function(slackChannelId, slackUserId) {
        return new Promise((resolve, reject) => {
            const config = {
                'method' : 'post',
                'url' : 'https://slack.com/api/groups.invite',
                'data' : {
                    'channel': slackChannelId,
                    'user': slackUserId
                },
                'headers': slackHttpHeaders
            };
            axios(config)
            .then(res => resolve(res))
            .catch(err => reject(err));
        });
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

function _getEncodedAuthorizationToken() {
    const credentialStr = `${userid}:${password}`;
    return new Buffer(credentialStr, 'binary').toString('base64');
}