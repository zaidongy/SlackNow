const snUtil = require('./snUtil.js');

var ticket = "RITM0226407";

snUtil.getTicketInfo(ticket, res => console.log(res.number));