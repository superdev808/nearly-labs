const app = window.require('electron').remote.app;
const path = window.require("path");
const fs = window.require("fs");
const childProcess = window.require("child_process");
const {is} = window.require('electron-util');
// Get OS username
// const os = window.require("os");
// const username = os.userInfo().username;
// NOTE: To be used if a UserName key needs to be added to the plist.
// https://github.com/codebytere/node-mac-permissions - For handling permissions issues.

// Write plist file to folder: /Users/*username*/Library/LaunchAgents
const plistPath = path.join(app.getPath("home"), "Library", "LaunchAgents");
const plistLocation = path.join(app.getPath("home"), "Library", "LaunchAgents", "com.nearlylabs.nearly.officehours.plist");

class OfficeHoursPlist {
    _inTimeHours = null;
    _inTimeMinutes = null;
    _dayType = null;
    constructor(inTime, dayType) {
        let time = inTime.split(":");
        this._inTimeHours = time[0];
        this._inTimeMinutes = time[1];
        this._dayType = dayType;
    }
    writePlist(plistString) {
        // Check if Big Sur
        if (childProcess.execSync("sw_vers -productVersion").toString().trim().split(".")[0] === "11") {
            if (!fs.existsSync(plistPath)) {
                fs.mkdirSync(plistPath);
            }
            if (fs.existsSync(plistLocation)) {
                fs.unlinkSync(plistLocation);
            }
        }
        fs.writeFileSync(plistLocation, plistString);
        // childProcess.execSync("launchctl unload -w " + plistLocation);
        console.log("Command:");
        console.log("launchctl load " + plistLocation);
        childProcess.execSync("launchctl unload " + plistLocation);
        childProcess.execSync("launchctl load " + plistLocation);
        childProcess.execSync("launchctl start com.nearlylabs.nearly.officehours");
        // childProcess.exec("launchctl unload -w " + plistPath, (error, stdout, stderr) => {
        //     console.log("unload stdout: " + stdout);
        //     console.log("unload stderr: " + stderr);
        // });
        // childProcess.exec("launchctl load -w " + plistPath, (error, stdout, stderr) => {
        //     console.log("load stdout: " + stdout);
        //     console.log("load stderr: " + stderr);
        // });
        // childProcess.exec("launchctl start com.nearlylabs.nearly.officehours", (error, stdout, stderr) => {
        //       console.log("start stdout: " + stdout);
        //       console.log("start stderr: " + stderr);
        //   });
    }
    updatePlist() {
        if (is.macos) {
            if (this._dayType === "Weekday") {
                let outputString = 
    `<?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>
        <key>Label</key>
        <string>com.nearlylabs.nearly.officehours</string>
        <key>ProgramArguments</key>
        <array>
            <string>open</string>
            <string>/Applications/Nearly.App</string>
        </array>
        <key>RunAtLoad></key>
        <true/>
        <key>StartCalendarInterval</key>
        <array>
        <dict>
            <key>Weekday</key>
            <integer>1</integer>
            <key>Hour</key>
            <integer>${this._inTimeHours}</integer>
            <key>Minute</key>
            <integer>${this._inTimeMinutes}</integer>
        </dict>
        <dict>
            <key>Weekday</key>
            <integer>2</integer>
            <key>Hour</key>
            <integer>${this._inTimeHours}</integer>
            <key>Minute</key>
            <integer>${this._inTimeMinutes}</integer>
        </dict>
        <dict>
            <key>Weekday</key>
            <integer>3</integer>
            <key>Hour</key>
            <integer>${this._inTimeHours}</integer>
            <key>Minute</key>
            <integer>${this._inTimeMinutes}</integer>
        </dict>
        <dict>
            <key>Weekday</key>
            <integer>4</integer>
            <key>Hour</key>
            <integer>${this._inTimeHours}</integer>
            <key>Minute</key>
            <integer>${this._inTimeMinutes}</integer>
        </dict>
        <dict>
            <key>Weekday</key>
            <integer>5</integer>
            <key>Hour</key>
            <integer>${this._inTimeHours}</integer>
            <key>Minute</key>
            <integer>${this._inTimeMinutes}</integer>
        </dict>
        </array>
    </dict>
    </plist>
    `;
            // console.log(outputString);
            console.log("Plist updated.");
            this.writePlist(outputString);
            }
            else if (this._dayType === "Every Day") {
                let outputString = 
    `<?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>
        <key>Label</key>
        <string>com.nearlylabs.nearly.officehours</string>
        <key>ProgramArguments</key>
        <array>
            <string>open</string>
            <string>/Applications/Nearly.App</string>
        </array>
        <key>RunAtLoad></key>
        <true/>
        <key>StartCalendarInterval</key>
        <array>
        <dict>
            <key>Weekday</key>
            <integer>0</integer>
            <key>Hour</key>
            <integer>${this._inTimeHours}</integer>
            <key>Minute</key>
            <integer>${this._inTimeMinutes}</integer>
        </dict>
        <dict>
            <key>Weekday</key>
            <integer>1</integer>
            <key>Hour</key>
            <integer>${this._inTimeHours}</integer>
            <key>Minute</key>
            <integer>${this._inTimeMinutes}</integer>
        </dict>
        <dict>
            <key>Weekday</key>
            <integer>2</integer>
            <key>Hour</key>
            <integer>${this._inTimeHours}</integer>
            <key>Minute</key>
            <integer>${this._inTimeMinutes}</integer>
        </dict>
        <dict>
            <key>Weekday</key>
            <integer>3</integer>
            <key>Hour</key>
            <integer>${this._inTimeHours}</integer>
            <key>Minute</key>
            <integer>${this._inTimeMinutes}</integer>
        </dict>
        <dict>
            <key>Weekday</key>
            <integer>4</integer>
            <key>Hour</key>
            <integer>${this._inTimeHours}</integer>
            <key>Minute</key>
            <integer>${this._inTimeMinutes}</integer>
        </dict>
        <dict>
            <key>Weekday</key>
            <integer>5</integer>
            <key>Hour</key>
            <integer>${this._inTimeHours}</integer>
            <key>Minute</key>
            <integer>${this._inTimeMinutes}</integer>
        </dict>
        <dict>
            <key>Weekday</key>
            <integer>6</integer>
            <key>Hour</key>
            <integer>${this._inTimeHours}</integer>
            <key>Minute</key>
            <integer>${this._inTimeMinutes}</integer>
        </dict>
        </array>
    </dict>
    </plist>
    `;
            // console.log(outputString);
            console.log("Plist updated.");
            this.writePlist(outputString);
            }
            else {
                console.warn("_dayType is null");
            }
        }
    }
}
export default OfficeHoursPlist;