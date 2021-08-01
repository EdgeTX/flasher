var tmpLog = [];

function addLog(userData) {
    userData.date = new Date().toISOString();
    console.log(`[${userData.type}][${userData.date}] ${userData.msg}`);
    
    tmpLog.push(userData);
}

function setLog(userData) {
    tmpLog = userData;
}

function getLog() {
    return tmpLog;
}

function getFormattedLog() {
    var formatted = "";
    tmpLog.forEach(function(item) {
        formatted += `[${item.type}][${item.date}] ${item.msg}\n`
    });

    return formatted;
}

exports.addLog = addLog;
exports.setLog = setLog;
exports.getLog = getLog;
exports.getFormattedLog = getFormattedLog;