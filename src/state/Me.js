import { action, observable, computed, makeObservable } from 'mobx';
import { core as WebRTC } from "../assets/js/webrtc";
import WorkspaceStore from './Workspace';
import OfficeHoursPlist from "./OfficeHoursPlist";
import CallStore from './Call';
import Axios from "axios";
import config from "../config/default";
import { SIGNAL_SERVER } from '../config/default';

const schedule = require('node-schedule');
const electron = window.require("electron");
const remote = window.require("electron").remote;
const trackEvent = remote.getGlobal("trackEvent");

const LOCAL_userId = "me.id";
const LOCAL_cameraStatus = "myCameraStatus";
const LOCAL_defaultCamera = "DefaultCamera";
const LOCAL_defaultMic = "DefaultMicrophone";
const LOCAL_email = "me.email";
const LOCAL_securitySeed = "me.securitySeed";
const LOCAL_token = "token";
const LOCAL_micStatus = "myMicrophoneStatus";
const LOCAL_inTime = "me.inTime";
const LOCAL_outTime = "me.outTime";
const LOCAL_dayType = "me.dayType";
const LOCAL_env = 'ENV';
const LOCAL_previousStatus = "previousStatus";
const LOCAL_lastActiveStatus = "lastActiveStatus";

export const videoStatus = {
    in: 'In',
    out: 'Out',
    noVideo: 'No Video'
};

class Me {
    isConnected = false;
    streamCounter = 0;

    userId = null;
    cameraStatus = null;
    callId = null;
    currentPublicWorkspaceId = null;
    micIsMuted = false;
    micAudioLevel = 0;
    defaultCamera = 'default';
    defaultMicrophone = 'default';
    profile_pic = null;
    connectionState = 'online';
    previousStatus = null;
    lastActiveStatus = null;

    email = null;
    securitySeed = null;
    token = null;
    userData = null;

    myClearVideo = null;
    myPixelatedVideo = null;

    inTime = "";
    outTime = "";
    dayType = null;
    environment = false;

    intervalId = null;

    constructor() {
        makeObservable(this, {
            isConnected: observable,
            streamCounter: observable,

            userId: observable,
            cameraStatus: observable,
            callId: observable,
            currentPublicWorkspaceId: observable,
            micIsMuted: observable,
            micAudioLevel: observable,
            defaultCamera: observable,
            defaultMicrophone: observable,
            token: observable,
            securitySeed: observable,
            email: observable,
            profile_pic: observable,

            myClearVideo: observable,
            myPixelatedVideo: observable,
            previousStatus: observable,

            inTime: observable,
            outTime: observable,
            dayType: observable,

            loadMyData: action,
            setMyData: action,
            scheduleClose: action,
          
            environment: observable,

            loadMyData: action,
            setMyData: action,
            logout: action,

            setVideoIn: action,
            setVideoOut: action,
            setVideoNone: action,
            setOfficeHours: action,
            setInTime: action,
            setOutTime: action,
            setDayType: action,

            isCameraStatusIn: computed,
            isCameraStatusOut: computed,
            isCameraStatusNone: computed,

            afterConnect: action,
            onMicLevelUpdate: action,
            setMicrophoneMuted: action,
            changeCamera: action,
            changeMicrophone: action,
            onSelfieFull: action,
            onSelfieFullStop: action,
            onSelfie: action,
            onSelfieStop: action,
            setProfilePicture: action,
        });


        WebRTC.onSelfie(this.onSelfie);
        WebRTC.onSelfieStop(this.onSelfieStop);
        WebRTC.onSelfieFull(this.onSelfieFull);
        WebRTC.onSelfieFullStop(this.onSelfieFullStop);
    }

    loadMyData() {
        console.log('Me.loadMyData()')
        this.userId = parseInt(localStorage.getItem(LOCAL_userId));
        this.cameraStatus = localStorage.getItem(LOCAL_cameraStatus);

        this.lastActiveStatus = localStorage.getItem(LOCAL_lastActiveStatus);
        switch (this.lastActiveStatus) {
            case videoStatus.in:
                this.setVideoIn();
                break;
            case videoStatus.noVideo:
                this.setVideoNone();
                break;
            default:
                this.setVideoIn();
                break;
        }

        const defaultCamera = localStorage.getItem(LOCAL_defaultCamera);
        if (defaultCamera) {
            this.defaultCamera = defaultCamera;
        }

        const defaultMicrophone = localStorage.getItem(LOCAL_defaultMic);
        if (defaultMicrophone) {
            this.defaultMicrophone = defaultMicrophone;
        }

        this.email = localStorage.getItem(LOCAL_email);
        this.securitySeed = localStorage.getItem(LOCAL_securitySeed);
        this.token = localStorage.getItem(LOCAL_token);
        this.inTime = localStorage.getItem(LOCAL_inTime);
        this.outTime = localStorage.getItem(LOCAL_outTime);
        this.dayType = localStorage.getItem(LOCAL_dayType);
        Axios.post(config.backendURL + "api/signal/getUserInfo", { userID: this.userId }).then((response) => {
            this.inTime = response.data.me.inTime;
            this.outTime = response.data.me.outTime;
            this.dayType = response.data.me.dayType;
            this.setOfficeHours(response.data.me.inTime, response.data.me.outTime, response.data.me.dayType);
          })
          .catch((Error) => {
            console.log(Error);
          });
          this.scheduleClose();
        this.environment = localStorage.getItem(LOCAL_env);

        // set the correct ENV
        if (!this.environment) {
            this.environment = 'PRODUCTION';
            localStorage.setItem(LOCAL_env, this.environment);
        }

        

        this.switchServer();

        this.previousStatus = localStorage.getItem(LOCAL_previousStatus);
        if (this.previousStatus === null) {
            this.previousStatus = videoStatus.in;
            localStorage.setItem(LOCAL_previousStatus, videoStatus.in);
        }
        
        if (this.cameraStatus === null) {
            this.setVideoIn();
        } else if (this.cameraStatus !== videoStatus.noVideo) {
            this.startMyMicLevel();
        }
        if (this.cameraStatus === videoStatus.out) {
            this.cameraStatus = this.previousStatus;
        }

        this.resetInterval();
    }

    reportStatus = () => {
        WebRTC.setCustomStatus({
            cameraStatus: this.cameraStatus,
            micMuted: this.micIsMuted,
        });

        WebRTC.changeConnectionState(this.workspaceId, this.connectionState);
    }

    resetInterval = () => {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        // report our status once per minute to keep other clients aware of us
        this.intervalId = setInterval(this.reportStatus, 60000);

        this.reportStatus();
    }

    setProfilePicture = (profile_pic) => {
        this.profile_pic = profile_pic;
    }

    switchServer = (includeCallback = false) => {
        WebRTC.switchServer(SIGNAL_SERVER[this.environment.toUpperCase()], includeCallback ? this.afterConnect : null);
    }

    afterConnect = () => {
        this.isConnected = true;
        //WorkspaceStore.joinWorkspace();
        this.startMyMicLevel();
        this.resetInterval();
    }

    logout = (callback) => {
        for (let key in localStorage) {
            if (!(key === LOCAL_defaultMic || key === LOCAL_defaultCamera || key === "ENV")) {
              localStorage.removeItem(key);
            }
        }

        try {
            WebRTC.leaveWorkspace(WorkspaceStore.workspaceId);
            this.isConnected = false;
            WebRTC.disconnect();
        } catch (e) {
            console.warn('Me.logout() :: error caught', e);
        }
        trackEvent("Logout", "Successful");
        if (callback) {
            callback();
        }
        electron.ipcRenderer.send("RELAUNCH");
    }

    setMyData({ userId }) {
        this.userId = parseInt(userId, 10);
        localStorage.setItem(LOCAL_userId, this.userId);
    }

    officeHoursDBUpdate = () => {
        // Update on database
        Axios.post(config.backendURL + "api/user/updateOfficeHours", { email: this.email, inTime: this.inTime, outTime: this.outTime, dayType: this.dayType }).then((response) => {
            console.log("office hours post");
        }).catch((error) => {
            console.log(error);
        });
    }

    officeHoursPlistUpdate = () => {
        if (this.inTime != null && this.outTime != null && this.dayType != null) {
            let plist = new OfficeHoursPlist(this.inTime, this.dayType);
            plist.updatePlist();
        }
    }
    // Setters for each office hours variable
    setInTime = (inTime) => {
        this.inTime = inTime;
    }
    setOutTime = (outTime) => {
        this.outTime = outTime;
    }
    setDayType = (dayType) => {
        this.dayType = dayType;
    }

    setOfficeHours = (inTime, outTime, dayType) => {
        this.inTime = inTime;
        this.outTime = outTime;
        this.dayType = dayType;
        localStorage.setItem(LOCAL_inTime, inTime);
        localStorage.setItem(LOCAL_outTime, outTime);
        localStorage.setItem(LOCAL_dayType, dayType);
        this.officeHoursPlistUpdate();
        this.officeHoursDBUpdate();
        // For closing at outTime
        this.scheduleClose();
    }

    waitForCallEnd = () => {
        if (this.callId !== null || this.currentPublicWorkspaceId !== null) {
            setTimeout(this.waitForCallEnd, 10000);
        }
        else {
            this.setVideoOut();
            let closeTimer = setInterval(function() { electron.ipcRenderer.send("EXIT"); }, 300000); // 1000 * 60 * 5 = 5 minutes
        }
    }

    // Schedules close at outTime.
    scheduleClose = () => {
        console.log("close scheduled");
        if (this.outTime === null) this.outTime = "10:00"; // Use a default value if none availible
        const [outTimeHour, outTimeMinute] = this.outTime.split(':');
        const job = schedule.scheduleJob(`${outTimeMinute} ${outTimeHour} * * *`, () => {
          if (CallStore.callId !== null || this.currentPublicWorkspaceId !== null) {
              this.waitForCallEnd();
          }
          else {
            this.setVideoOut();
            electron.ipcRenderer.send("EXIT");
          }
        });
    }

    setVideoIn = () => {
        console.log('Me.setVideoIn()', this.previousStatus);
        // const previousStatus = this.cameraStatus;
        localStorage.setItem(LOCAL_previousStatus, videoStatus.in);
        localStorage.setItem(LOCAL_lastActiveStatus, videoStatus.in);

        this.cameraStatus = videoStatus.in;
        localStorage.setItem(LOCAL_cameraStatus, videoStatus.in);

        switch(this.previousStatus) {
            case videoStatus.in:
                break;

            case videoStatus.noVideo:
                WebRTC.callToggleMedia('workspace', null, false, true);
                WebRTC.setCustomStatus({
                    cameraStatus: 'In',
                    micMuted: true,
                });
                if (!WorkspaceStore.startedWithVideo) {
                    WorkspaceStore.joinWorkspace();
                }
                if (this.callId) {
                    WebRTC.callToggleMedia('call', this.callId, null, true, () => {});
                } else if (this.currentPublicWorkspaceId) {
                    WebRTC.callToggleMedia('space', this.currentPublicWorkspaceId, null, true, () => {});
                } else {
                    WebRTC.callToggleMedia('workspace', null, null, true, () => {});
                }
                break;

            case videoStatus.out:
                WebRTC.connect(this.afterConnect);
                WebRTC.callToggleMedia('workspace', null, false, true);
                WorkspaceStore.joinWorkspace();
                WebRTC.setCustomStatus({
                    cameraStatus: 'In',
                    micMuted: true,
                });
                if (!WorkspaceStore.startedWithVideo) {
                    WorkspaceStore.joinWorkspace();
                }
                // Not needed sicne you can't be on a call from OUT mode.
                // if (this.callId) {
                //     WebRTC.callToggleMedia('call', this.callId, null, true, () => {});
                // } else if (this.currentPublicWorkspaceId) {
                //     WebRTC.callToggleMedia('space', this.currentPublicWorkspaceId, null, true, () => {});
                // } else {
                //     WebRTC.callToggleMedia('workspace', null, null, true, () => {});
                // }
            default:
                WebRTC.connect(this.afterConnect);
                break;
        }
        this.previousStatus = localStorage.getItem(LOCAL_previousStatus);
        this.lastActiveStatus = localStorage.getItem(LOCAL_lastActiveStatus);
    }

    setVideoOut = () => {
        if (CallStore.currentPublicWorkspaceId !== null) {
            CallStore.leaveSpace();
        }
        if (CallStore.callId !== null) {
            CallStore.hangupCall();
        }
        WebRTC.callToggleMedia('workspace', null, false, false);
        console.log("Me.setVideoOut()", this.previousStatus);
        this.cameraStatus = videoStatus.out;
        this.previousStatus = videoStatus.out;
        localStorage.setItem(LOCAL_cameraStatus, videoStatus.out);
        localStorage.setItem(LOCAL_previousStatus, videoStatus.out);

        this.resetInterval();

        WorkspaceStore.leaveWorkspace();
        WebRTC.setCustomStatus({
            cameraStatus: 'Out',
            micMuted: true,
        });
        WebRTC.disconnect();
        this.isConnected = false;
    }

    setVideoNone = () => {
        console.log("Me.setVideoNone()", this.previousStatus);
        // const previousStatus = this.cameraStatus;
        localStorage.setItem(LOCAL_previousStatus, videoStatus.noVideo);
        localStorage.setItem(LOCAL_lastActiveStatus, videoStatus.noVideo);
        this.lastActiveStatus = videoStatus.noVideo;
        this.cameraStatus = videoStatus.noVideo;
        localStorage.setItem(LOCAL_cameraStatus, videoStatus.noVideo);

        this.resetInterval();

        switch(this.previousStatus) {
            case videoStatus.out:
                WebRTC.connect(this.afterConnect);
                WorkspaceStore.joinWorkspace();
                WebRTC.setCustomStatus({
                    cameraStatus: 'No Video',
                    micMuted: true,
                });
                WebRTC.callToggleMedia('workspace', null, false, false);
            break;

            case videoStatus.in:
                // WebRTC.releaseCamera();
                // this.toggleAudioAndVideoInsideCall(null, false);
                WebRTC.setCustomStatus({
                    cameraStatus: 'No Video',
                    micMuted: true,
                });
                if (this.callId) {
                    WebRTC.callToggleMedia('call', this.callId, null, false, () => {});
                } else if (this.currentPublicWorkspaceId) {
                    WebRTC.callToggleMedia('space', this.currentPublicWorkspaceId, null, false, () => {});
                } else {
                    WebRTC.callToggleMedia('workspace', null, null, false, () => {});
                }
                break;

            default:
                break;
        }
        this.previousStatus = localStorage.getItem(LOCAL_previousStatus);
    }

    get isCameraStatusIn() {
        return this.cameraStatus === videoStatus.in;
    }

    get isCameraStatusOut() {
        return this.cameraStatus === videoStatus.out;
    }

    get isCameraStatusNone() {
        return this.cameraStatus === videoStatus.noVideo;
    }

    startMyMicLevel = () => {
        WebRTC.onMicLevelUpdate(this.onMicLevelUpdate);
        this.toggleAudioAndVideoInsideCall(true, null);
    }

    stopMyMicLevel = () => {
        WebRTC.onMicLevelUpdate(() => {});
        this.toggleAudioAndVideoInsideCall(true, null);
    };

    setCallId = (newCallId = null) => {
        this.callId = newCallId
    }

    setCurrentPublicWorkspaceId = (newCurrentPublicWporkspaceId = null) => {
        this.currentPublicWorkspaceId = newCurrentPublicWporkspaceId;
    }

    setMicrophoneMuted = (muted = false) => {
        this.micIsMuted = muted;        
        this.toggleAudioAndVideoInsideCall(!muted, null);

        this.resetInterval();
    }

    toggleAudioAndVideoInsideCall = (audioOn = null, videoOn = null) => {
        if (CallStore.callId) {
            WebRTC.callToggleMedia(
                'call',
                CallStore.callId,
                audioOn, // boolean (or null to ignore)
                videoOn, // boolean (or null to ignore)
                () => {}
            );
        } else if (CallStore.currentPublicWorkspaceId) {
            WebRTC.callToggleMedia(
                'space',
                CallStore.currentPublicWorkspaceId,
                audioOn,
                videoOn,
                () => {}
            )
        }
    }

    changeCamera = (deviceId) => {
        this.defaultCamera = deviceId;
        localStorage.setItem(LOCAL_defaultCamera, deviceId);
        WebRTC.changeDevice("video", deviceId);
    }

    changeMicrophone = (deviceId) => {
        this.defaultMicrophone = deviceId;
        localStorage.setItem(LOCAL_defaultMic, deviceId);
        WebRTC.changeDevice("audio", deviceId);
    }

    // ========== WebRTC callbacks ==========

    onMicLevelUpdate = (err, micLevel) => {
        this.micAudioLevel = micLevel - 1;

        if (this.micAudioLevel === -1) {
            this.micAudioLevel = 0;
        }
    }

    onSelfie = (err, localStream) => {
        console.warn('Me :: onSelfie()', 'set myPixelatedVideo');
        this.myPixelatedVideo = localStream;
        this.streamCounter++;
    }

    onSelfieStop = () => {
        console.warn('Me :: onSelfieStop()');
        this.myPixelatedVideo = null;
        this.streamCounter++;
    }

    onSelfieFull = (err, localStream) => {
        console.warn('Me :: onSelfieFull()', 'set myClearVideo');
        this.myClearVideo = localStream;
        this.streamCounter++;
    }

    onSelfieFullStop = () => {
        console.warn('Me :: onSelfieFullStop()');
        this.myClearVideo = null;
        this.streamCounter++;
    }
}

const self = new Me();

export default self;