// This file is used throughout the application to send analytics events to Google Analytics.
const {app} = require('electron');
const { v4: uuid } = require('uuid');
const ua = require('universal-analytics');
// Use electron-util to determine operating system
const {is} = require('electron-util');
const { JSONStorage } = require('node-localstorage');
const nodeStorage = new JSONStorage(app.getPath('userData'));

let userOS = "";

const guuid = nodeStorage.getItem('guuid') || uuid();

// (re)save the userid, so it persists for the next app session.
nodeStorage.setItem('guuid', guuid);

let analyticsUser = ua("UA-168513384-1", guuid);

if (is.macos) {
    userOS = "macOS";
}
else {
    userOS = "Windows";
}

function trackEvent(action, label, value) {
    analyticsUser.event({
      ec: userOS,
      ea: action,
      el: label,
      ev: value,
    })
    .send();
    console.log(`trackEvent ${action} ${label} ${value}`);
// function trackEvent(category, action, label, value) {
//     analyticsUser.event({
//       ec: category,
//       ea: action,
//       el: label,
//       ev: value,
//     })
//     .send();
}

module.exports = { trackEvent };