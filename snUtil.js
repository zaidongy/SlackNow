const axios = require('axios');
require('Buffer');

const { SNUSERID: userid, SNPASSWORD: password } = process.env;

module.exports = {
    getTicketInfo : function(ticketNumber, callback) {
        const credentialStr = `${userid}:${password}`;
        const encodedCredentials = new Buffer(credentialStr, 'binary').toString('base64');

        var table = _getTable(ticketNumber);
        // console.log(table);
        console.log(ticketNumber);
        if (!table) return callback(null);

        const url = `https://csmcstage.service-now.com/api/now/table/${table}?sysparm_query=number%3D${ticketNumber}&sysparm_limit=1`;
        const options = {
            'method': 'GET',
            // 'hostname': 'csmcstage.service-now.com',
            // 'port': null,
            // 'path': `/api/now/table/${table}?sysparm_query=number%3D${ticketNumber}&sysparm_limit=1`,
            'headers': {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Basic ${encodedCredentials}`
            }
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
    
    hasTicketNumber: function(text) {
        var matchArr = ["RITM", "TASK", "CHG", "INC"];
        for (a of matchArr) {
            if (text.includes(a)) {
                return true;
            }
        }
        return false;
    }
}

// Private
function _getTable(n) {
    if (n.startsWith('RITM')) return 'sc_req_item';
    else if (n.startsWith('TASK')) return 'sc_task';
    else if (n.startsWith('INC')) return 'incident';
    else if (n.startsWith('CHG')) return 'change_request';
    else return null;
}