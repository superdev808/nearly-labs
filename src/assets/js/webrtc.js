'use strict';

const io = require('socket.io-client');
const { VideoResizer } = require('mediastream-video-resizer');

class WebRTCClass {
    constructor() {
        const self = this;
        self.version = '0.3.29';
        // Output communication messages
        self.debug = true;
        // Reduce FPS in the call or public space for the users who's not speaking
        self.reduceFpsForSilentUsers = true;
        // Signaling server url
        self.socketUrl = 'https://devsignal.nearlylabs.com:8890/';
        self.statusUrl = 'https://status.nearlylabs.com:443/';
        self.sendStatusInterval = 200;
        self.sendStatusIntervalOriginal = null;
        self.micLevels = [0, 180, 220, 235, 254];
        self.videoSettings = {
            workspace: {
                width: 22,
                height: 15,
                fps: 5,
            },
            call: {
                width: 369,
                height: 369,
                fps: 20,
            },
            space: {
                width: 369,
                height: 369,
                fps: 20,
            },
            screen: {
                width: 1000,
                fps: 2,
            },
        };
        // Socket object
        self.socket = null;
        self.socketStatus = null;
        self.socketConnected = false;
        self.userId = null;
        self.securitySeed = null;
        self.workspaceId = null;
        self.callId = null;
        self.spaceId = null;
        self.media = {};
        self.iceServers = null;
        self.localStreams = {};
        self.micStatusStream = null;
        self.screenStream = null;
        self.incomingStreams = {};
        self.connections = {};
        self.devices = { audio: [], video: [] };
        self.audioDevice = null;
        self.videoDevice = null;
        self.localMicLevel = null;
        self.imSpeaking = null;
        self.lastSpeakingTime = null;
        self.publishers = {};
        self.ownPublishers = [];
        self.allowIncomingAudio = true;
        self.allowIncomingVideo = true;
        self.workspaceConstraints = {
            audio: false,
            video: true,
            /*{
                width: 800,
                height: 600,
            }*/
        };
        self.callConstraints = {
            audio: {
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
            },
            video: true /*{
                height: { min: 600, ideal: 600, max: 1080 },
                width: { min: 800, ideal: 800, max: 1920 },
                frameRate: { max: 20 },
                resizeMode: 'crop-and-scale',
            },*/,
            fake: false,
        };
        self.spaceConstraints = self.callConstraints;
        self.screenConstraints = {
            audio: false,
            video: {
                frameRate: { max: 3 },
            },
            fake: false,
        };
        self.lastConstrains = {};
        self.offers = {};
        self.customStatus = {};

        self.streams = { workspace: {} };

        self.callbacks = {
            onConnected: () => {},
            onDisconnected: () => {},
            onLogin: () => {},
            // Workspace
            onJoinWorkspace: () => {},
            onLeaveWorkspace: () => {},
            onWorkspaceUserAdded: () => {},
            onWorkspaceUserRemoved: () => {},
            onUserListUpdated: () => {},
            onUserDataUpdated: () => {},
            onUserStatusUpdated: () => {},
            // Call
            onStartCall: () => {},
            onJoinCall: () => {},
            onHangupCall: () => {},
            onCallIncoming: () => {},
            onCallJoined: () => {},
            onCallReject: () => {},
            onCallRejected: () => {},
            onCallUserAdded: () => {},
            onCallUserRemoved: () => {},
            onCallUsersUpdated: () => {},
            onJoiningUserAccepted: () => {},
            onScreenAdded: () => {},
            onScreenRemoved: () => {},
            onDeviceListChanged: () => {},
            onMediaToggled: () => {},
            // Spaces
            onSpaceIncoming: () => {},
            onSpaceJoined: () => {},
            onSpaceLeft: () => {},
            onSpaceUserAdded: () => {},
            onSpaceUserRemoved: () => {},
            onSpaceUsers: () => {},
            // On own media
            onSelfie: () => {},
            onSelfieStop: () => {},
            onSelfieFull: () => {},
            onSelfieFullStop: () => {},
            onScreen: () => {},
            onScreenStop: () => {},
            // Service events
            onSocketReonnected: () => {},
            onMicLevelUpdate: () => {},
            onSwitchServer: () => {},
            onMediaReconnect: () => {},
            onMediaReconnectFails: () => {},
        };
        self.microphone = {
            analyser: null,
            audioCtx: null,
            microphone: null,
        };
        self.loadInterval = null;
        self.statusInterval = null;
        self.activeConnections = {};
        self.startingConnections = {};
        self.cameraEnabled = false;
        self.callAccepted = null;
        self.reconnectIfNotConnected = 4000;
        self.reconnectIfNotConnectedOriginal = 4000;
        self.reconnectIfNotConnectedMax = 10000;
        self.reconnectLastConnectionSuccessful = true;
        self.fakeVideo = {
            canvas: null,
            context: null,
            stream: null,
            track: null,
        };
        self.usersInCall = {};
        self.usersInSpace = {};
        self.usersInCallIncoming = {};
        self.usersInSpaceIncoming = {};

        self.callAuthor = false;

        self.videoResizer = new VideoResizer();

        self.callStreams = {};
    }

    load() {
        const self = this;
        // Initialize socket connection
        console.log('Connecting...');
        // self.privateConnectSocket();
        // self.privateConnectStatus();
    }

    ////////////////////////////////////////////////
    // FUNCTIONS
    ////////////////////////////////////////////////

    /**
     * Switch between servers
     *
     * @param {string} socketUrl
     */
    switchServer(socketUrl, callback) {
        const self = this;
        if (callback) {
            self.callbacks.onSwitchServer = callback ? callback : () => {};
        }
        self.disconnect();
        self.socketUrl = socketUrl;
        self.connect();
    }

    /**
     * Login
     *
     * @param userId - used identifier in the call
     * @param securitySeed - should be the same as call room id
     * @paran workspaceId
     * @param callback - callback function
     */
    login(email, securitySeed, workspaceId, callback) {
        const self = this;
        self.callbacks.onLogin = callback ? callback : () => {};
        self.email = email;
        self.securitySeed = securitySeed;
        self.workspaceId = workspaceId;
        self.emit('/v1/user/login', { email, securitySeed, workspaceId });
    }

    /**
     * Join the workspace
     *
     * @param workspaceId - workspace ID to call to
     * @param video - boolean value whether or not to send owner's video
     * @param callback - callback function
     */
    joinWorkspace(workspaceId, video, callback) {
        const self = this;
        if (video && video !== true) {
            self.videoDevice = video;
            video = true;
        }
        self.media.workspace = { audio: false, video };
        self.workspaceConnected = true;
        callback = callback ? callback : () => {};
        self.callbacks.onJoinWorkspace = callback ? callback : () => {};
        self.privateJoinRoom(workspaceId);
        self.privateStartSendingStatus();
    }

    /**
     * Leave the workspace
     *
     * @param workspaceId - workspace ID to call to
     * @param callback - callback function
     */
    leaveWorkspace(workspaceId, callback) {
        const self = this;
        self.workspaceConnected = false;
        self.callbacks.onLeaveWorkspace = callback ? callback : () => {};
        self.privateLeaveRoom(workspaceId);
    }

    /**
     * Start private call
     *
     * @param users - user ID or list of the users IDs as array
     * @param audio - boolean value whether or not to send owner's audio
     * @param video - boolean value whether or not to send owner's video
     * @param callback - callback function
     */
    startCall(users, audio, video, callback) {
        const self = this;
        if (!audio && !video) {
            return callback('You can`t start the call without audio & video');
        }
        if (!users) {
            return callback('User(s) are required');
        }
        if (self.callId) {
            return callback(`Already is in the call, call id: ${self.callId}`);
        }
        self.callAuthor = true;
        if (!Array.isArray(users)) {
            users = [users];
        }
        self.usersInCall = {};
        self.usersInCall[self.userId] = { id: self.userId, started: Date.now(), status: 'in' };
        users.forEach((userId) => {
            self.usersInCall[userId] = { id: userId, started: Date.now(), status: 'pending' };
        });
        self.callbacks.onStartCall = callback ? callback : () => {};
        const data = { users, audio, video };
        self.emit('/v1/call/start', data);
    }

    /**
     * Join the incoming call
     *
     * @param callId - Call ID
     * @param audio - boolean value whether or not to send owner's audio
     * @param video - boolean value whether or not to send owner's video
     * @param callback - callback function
     */
    joinCall(callId, audio, video, callback) {
        const self = this;
        const key = `call:${callId}`;
        self.callId = callId;
        self.callAuthor = false;
        self.media[key] = { audio, video };
        self.callbacks.onJoinCall = callback ? callback : () => {};
        const data = { callId, audio, video, userId: self.userId };
        self.emit('/v1/call/join', data);
        self.usersInCall[self.userId] = { id: self.userId, started: Date.now(), status: 'in' };
        self.callToggleMedia('call', callId, audio, video);
        // self.privateJoinRoom(self.workspaceId, callId);
    }

    /**
     * Accept joining of another user to the call
     *
     * @param callId - Call ID
     * @param userId - Joining user ID
     * @param audio - force joining user to enable audio
     * @param video - force joining user to enable video
     */
    acceptJoiningUser(callId, userId, audio, video, callback) {
        const self = this;
        const data = { callId, userId, audio, video, joiningOther: true };
        self.callbacks.onJoiningUserAccepted = callback ? callback : () => {};
        self.emit('/v1/call/join', data);
    }

    /**
     * Invite another user to the call
     *
     * @param callId
     * @param userId
     */
    inviteUserToCall(callId, userId) {
        const self = this;
        self.emit('/v1/call/invite', { type: 'call', callId, userId, audio: self.audio, video: self.video });
    }

    /**
     * Invite another user to the space
     *
     * @param spaceId
     * @param userId
     */
    inviteUserToSpace(spaceId, userId) {
        const self = this;
        self.emit('/v1/space/invite', { type: 'space', spaceId, userId });
    }

    /**
     * Hangup the call
     *
     * @param callId - Call ID
     */
    hangupCall(callId) {
        const self = this;
        delete self.usersInCallIncoming[callId];
        delete self.usersInSpaceIncoming[callId];
        self.callAccepted = false;
        self.emit('/v1/call/hangup', { workspaceId: self.workspaceId, callId });
        if (self.callId === callId) {
            self.callId = null;
            self.callAuthor = null;
            self.usersInCall = {};
        }
    }

    /**
     * Reject the incloming call
     *
     * @param callId - Call ID
     */
    rejectCall(type, callId, callerId, callback) {
        const self = this;
        delete self.usersInCallIncoming[callId];
        delete self.usersInSpaceIncoming[callId];
        self.callbacks.onCallReject = callback ? callback : () => {};
        if (type === 'call') {
            self.emit('/v1/call/reject', { workspaceId: self.workspaceId, callId, callerId });
        } else {
            self.emit('/v1/space/reject', { workspaceId: self.workspaceId, callId, callerId });
        }
    }

    /**
     * Get call users
     *
     * @param callback
     */
    getCallUsers(callback) {
        const self = this;
        return callback(null, self.usersInCall);
    }

    /**
     * Get space users
     *
     * @param callback
     */
    getSpaceUsers(spaceId, callback) {
        const self = this;
        return callback(null, self.usersInSpace[spaceId]);
    }

    /**
     * Move to the public space
     *
     * @param spaceId - Space ID
     * @param audio - boolean value whether or not to send owner's audio
     * @param video - boolean value whether or not to send owner's video
     * @param callback - callback function
     */
    joinSpace(spaceId, audio, video, callback) {
        const self = this;
        const key = `space:${spaceId}`;
        self.media[key] = { audio, video };
        self.callbacks.onSpaceJoined = callback ? callback : () => {};
        if (!self.usersInSpace[spaceId]) {
            self.usersInSpace[spaceId] = {};
        }
        self.usersInSpace[spaceId][self.userId] = { id: self.userId, started: Date.now(), status: 'in' };
        self.callbacks.onSpaceUsers(null, spaceId, self.usersInSpace[spaceId], self.streams);
        self.emit('/v1/space/join', { workspaceId: self.workspaceId, spaceId, audio, video });
    }

    /**
     * Live the space
     *
     * @param spaceId - Space ID
     */
    leaveSpace(spaceId) {
        const self = this;
        if (!self.workspaceId) {
            return;
        }
        self.privateLeaveRoom(self.workspaceId, null, spaceId);
        self.emit('/v1/space/leave', { workspaceId: self.workspaceId, spaceId });
        if (self.spaceId === spaceId) {
            self.spaceId = null;
            delete self.usersInSpace[spaceId][self.userId];
        }
    }

    /**
     * Start the screen sharing
     *
     * @param workspaceId - workspace ID to call to
     * @param mediaStream - force to use this media stream
     * @param callback - callback function
     */
    screenShare(callId, mediaStream, callback) {
        const self = this;
        self.callbacks.screenShare = callback ? callback : () => {};
        self.screenStream = mediaStream;
        self.privateScreenShare(callId);
    }

    /**
     * Stop the screen sharing
     *
     * @param callId - call ID to share the screen
     */
    stopScreenShare(callId) {
        const self = this;
        self.privateStopScreenShare(callId);
    }

    /**
     * Toggle user's media in private call
     *
     * @param callId
     * @param audio
     * @param video
     * @param callback
     */
    callToggleMedia(type, callId, audio, video, callback) {
        const self = this;
        // const key = `${type}:${callId}`;
        const key = type === 'workspace' ? 'workspace' : `${type}:${callId}`;
        if (!self.media[key]) {
            return callback ? callback('Incorrect type/callId') : null;
        }
        if (audio === -1) {
            audio = !self.media[key].audio;
        }
        if (video === -1) {
            video = !self.media[key].video;
        }
        audio = audio === null ? self.media[key].audio : audio;
        video = video === null ? self.media[key].video : video;
        if (callback) {
            self.emit('/v1/sfu/toggle-media', { type, callId, audio, video });
        }
        callback = callback ? callback : () => {};
        const oldMedia = { ...self.media[key] };
        if (!self.media[key]) {
            self.media[key] = { audio, video };
        } else {
            self.media[key].audio = audio; // === null ? self.media[key].audio : audio;
            self.media[key].video = video; // === null ? self.media[key].video : video;
            //  Enable video
            if (!oldMedia.video && self.media[key].video) {
                self.lastConstrains[key].fake = false;
                self.lastConstrains[key].video = true;
                if (type !== 'workspace') {
                    self.videoResizer.stop(type);
                    self.privateGetUserMedia(key, self.lastConstrains[key], type, (error, stream) => {
                        if (error || !stream) {
                            console.warn(error);
                            // self.restartCamera(type, callId);
                            return;
                        }
                        self.localStreams[key] = stream;
                        self.privateReplaceTrack(stream, key, false, (error) => {
                            if (error) {
                                console.warn(error);
                                // self.restartCamera(type, callId);
                            }
                        });
                    });
                }
                self.videoResizer.stop('workspace');
                self.privateGetUserMedia('workspace', self.lastConstrains[key], 'workspace', (error, stream) => {
                    if (error || !stream) {
                        console.warn(error);
                        // self.restartCamera('workspace');
                        return;
                    }
                    self.localStreams['workspace'] = stream;
                    self.privateReplaceTrack(stream, 'workspace', true);
                    self.privateStopFakeVideo();
                });
                /*
                self.privateStopVideoResizer(type);
                self.privateStopVideoResizer('workspace');
                self.privateGetUserMedia(key, self.lastConstrains[key], type, (error, stream) => {
                    if (error || !stream) {
                        self.restartCamera(type, callId);
                        return;
                    }
                    self.localStreams[key] = stream;
                    self.privateReplaceTrack(stream, key, false, (err) => {
                        if (err) {
                            self.restartCamera(type, callId);
                        } else {
                            self.privateGetUserMedia('workspace', self.lastConstrains[key], 'workspace', (error, stream) => {
                                self.localStreams['workspace'] = stream;
                                self.privateReplaceTrack(stream, 'workspace', true);
                                self.privateStopFakeVideo();
                            });
                        }
                    });
                });
                */
                // self.restartCamera(callId);
            }
        }

        const media = self.media[key];
        // const videoRequired = Object.values(self.media).find((media) => media.video);
        const disableVideo = oldMedia.video && !media.video;
        if (disableVideo) {
            // self.privateStopVideoResizer('call');
            // self.privateStopVideoResizer('workspace');
            if (callId) {
                self.callbacks.onSelfieStop();
                self.callbacks.onSelfieFullStop();
            }
            self.lastConstrains[key].video = true;
            self.cameraEnabled = false;
            self.privateGetUserMedia('fake', self.lastConstrains[key], 'call', (error, stream) => {
                if (error || !stream) {
                    return;
                }
                // self.localStreams[key] = stream;
                self.lastConstrains[key].fake = true;
                self.privateReplaceTrack(stream, key, true);
                self.privateReplaceTrack(stream, 'workspace', true);
                self.videoResizer.stop('call');
                self.videoResizer.stop('workspace');
            });
        }
        if (!self.localStreams[key]) {
            return callback('No MediaStream found for this call');
        }
        if (self.localStreams[key]) {
            self.localStreams[key].getTracks().forEach((track) => {
                if (!self.callAccepted && type === 'call') {
                    track.enabled = false;
                    return;
                }
                if (track.kind === 'video') {
                    return;
                }
                if (track.kind === 'audio' && !self.media[key].audio) {
                    track.enabled = false;
                } else {
                    track.enabled = true;
                }
            });
        }
        callback(null, self.media[key].audio, self.media[key].video);
    }

    /**
     * Get local mic level
     *
     */
    getLocalMicLevel() {
        const self = this;
        return self.privateGetLocalMicLevel();
    }

    /**
     * Force user list update
     *
     * @param workspaceId
     */
    forceUserListUpdate(workspaceId) {
        const self = this;
        self.emit('/v1/user/updateUserList', { workspaceId });
    }

    /**
     * Get media devices
     *
     * @param callback - callback function
     */
    getDevices(callback) {
        const self = this;
        this.callbacks.onDeviceListChanged = callback ? callback : () => {};
        self.privateGetDevices();
    }

    /**
     * Change media device
     *
     * @param type
     * @param deviceId
     */
    changeDevice(type, deviceId) {
        const self = this;
        if ([self.audioDevice, self.videoDevice].includes(deviceId)) {
            return;
        }
        if (type === 'audio') {
            self.audioDevice = deviceId;
            self.privateStopSendingStatus();
            self.privateStartSendingStatus();
        }
        if (type === 'video') {
            self.videoDevice = deviceId;
            if (self.cameraEnabled) {
                self.videoResizer.stop('workspace');
                self.videoResizer.stop('call');
            }
        }
        Object.keys(self.localStreams).forEach((key) => {
            const resized = key === 'workspace' ? 'workspace' : 'call';
            self.privateGetUserMedia(key, null, resized, (error, stream) => {
                if (error || !stream) {
                    return;
                }
                self.localStreams[key] = stream;
                self.privateReplaceTrack(stream, key);
                /*
                stream.getTracks().forEach((track) => {
                    self.connections[key].getSenders().map((sender) => {
                        if (!sender || !sender.track || sender.track.kind !== track.kind) {
                            return;
                        }
                        sender.replaceTrack(track);
                    });
                });
                */
            });
        });
    }

    /**
     * Add custom status data
     *
     * @param data - data to merge with our status
     */
    setCustomStatus(data) {
        const self = this;
        self.customStatus = data;
    }

    /**
     * Set connection state
     *
     * @param workspaceId
     * @param state     online | away
     */
    changeConnectionState(workspaceId, state) {
        const self = this;
        if (!self.socket) {
            return console.warn('Socket is not connected, can`t send the state');
        }
        self.emit('/v1/sfu/connection-state', { workspaceId, state });
    }

    /**
     * Establish the socket connection
     *
     * @param callback - callback function
     */
    connect(callback) {
        const self = this;
        self.privateConnectSocket();
        self.privateConnectStatus();
        if (callback) {
            self.callbacks.onSocketReonnected = callback ? callback : () => {};
        }
        if (self.email && self.securitySeed) {
            const data = { email: self.email, securitySeed: self.securitySeed, workspaceId: self.workspaceId };
            self.emit('/v1/user/login', data);
        }
    }

    /**
     * Close the socket connection
     *
     */
    disconnect() {
        const self = this;
        if (self.socket) {
            try {
                self.socket.close();
                self.socketStatus.close();
            } catch (e) {
                console.warn(e);
            }
            self.socket = null;
        }
    }

    /**
     * Is connection to the signaling server is online
     *
     */
    isConnected() {
        const self = this;
        return self.socket.connected;
    }

    /**
     * Allow incoming video
     *
     */
    allowIncomingVideoStream() {
        const self = this;
        if (!self.allowIncomingVideo) {
            self.allowIncomingVideo = true;
            self.privateRestartAllPublishers();
        }
    }

    /**
     * Block incoming video
     *
     */
    blockIncomingVideoStream() {
        const self = this;
        if (self.allowIncomingVideo) {
            self.allowIncomingVideo = false;
            self.privateRestartAllPublishers();
        }
    }

    /**
     * Allow incoming audio
     *
     */
    allowIncomingAudioStream() {
        const self = this;
        if (!self.allowIncomingAudio) {
            self.allowIncomingAudio = true;
            self.privateRestartAllPublishers();
        }
    }

    /**
     * Block incoming audio
     *
     */
    blockIncomingAudioStream() {
        const self = this;
        if (self.allowIncomingAudio) {
            self.allowIncomingAudio = false;
            self.privateRestartAllPublishers();
        }
    }

    startSendingStatus() {
        const self = this;
        self.privateStopSendingStatus();
    }

    stopSendingStatus() {
        const self = this;
        self.privateStopSendingStatus();
    }

    ////////////////////////////////////////////////
    // CALLBACKS
    // Call these functions from your code and I'll insert the relevant data in them (you can leave them blank inside)
    ////////////////////////////////////////////////

    onUserListUpdated(callback) {
        this.callbacks.onUserListUpdated = callback ? callback : () => {};
    }

    onUserDataUpdated(callback) {
        this.callbacks.onUserDataUpdated = callback ? callback : () => {};
    }

    onUserStatusUpdated(callback) {
        this.callbacks.onUserStatusUpdated = callback ? callback : () => {};
    }

    onCallIncoming(callback) {
        this.callbacks.onCallIncoming = callback ? callback : () => {};
    }

    onSpaceIncoming(callback) {
        this.callbacks.onSpaceIncoming = callback ? callback : () => {};
    }

    onHangup(callback) {
        this.callbacks.onHangupCall = callback ? callback : () => {};
    }

    onWorkspaceUserAdded(callback) {
        this.callbacks.onWorkspaceUserAdded = callback ? callback : () => {};
    }

    onWorkspaceUserRemoved(callback) {
        this.callbacks.onWorkspaceUserRemoved = callback ? callback : () => {};
    }

    onCallJoined(callback) {
        this.callbacks.onCallJoined = callback ? callback : () => {};
    }

    onCallRejected(callback) {
        this.callbacks.onCallRejected = callback ? callback : () => {};
    }

    onCallUserAdded(callback) {
        this.callbacks.onCallUserAdded = callback ? callback : () => {};
    }

    onCallUserRemoved(callback) {
        this.callbacks.onCallUserRemoved = callback ? callback : () => {};
    }

    onScreenAdded(callback) {
        this.callbacks.onScreenAdded = callback ? callback : () => {};
    }

    onScreenRemoved(callback) {
        this.callbacks.onScreenRemoved = callback ? callback : () => {};
    }

    onCallUsersUpdated(callback) {
        console.warn('Event onCallUsersUpdated is deprecated and will be removed');
        this.callbacks.onCallUsersUpdated = callback ? callback : () => {};
    }

    onMediaToggled(callback) {
        this.callbacks.onMediaToggled = callback ? callback : () => {};
    }

    onConnected(callback) {
        this.callbacks.onConnected = callback ? callback : () => {};
    }

    onDisconnected(callback) {
        this.callbacks.onDisconnected = callback ? callback : () => {};
    }

    onSelfie(callback) {
        this.callbacks.onSelfie = callback ? callback : () => {};
    }

    onSelfieStop(callback) {
        this.callbacks.onSelfieStop = callback ? callback : () => {};
    }

    onSelfieFull(callback) {
        this.callbacks.onSelfieFull = callback ? callback : () => {};
    }

    onSelfieFullStop(callback) {
        this.callbacks.onSelfieFullStop = callback ? callback : () => {};
    }

    onScreen(callback) {
        this.callbacks.onScreen = callback ? callback : () => {};
    }

    onScreenStop(callback) {
        this.callbacks.onScreenStop = callback ? callback : () => {};
    }

    onMicLevelUpdate(callback) {
        this.callbacks.onMicLevelUpdate = callback ? callback : () => {};
    }

    onSpaceLeft(callback) {
        this.callbacks.onSpaceLeft = callback ? callback : () => {};
    }

    onSpaceUserAdded(callback) {
        this.callbacks.onSpaceUserAdded = callback ? callback : () => {};
    }

    onSpaceUserRemoved(callback) {
        this.callbacks.onSpaceUserRemoved = callback ? callback : () => {};
    }

    onSpaceUsers(callback) {
        this.callbacks.onSpaceUsers = callback ? callback : () => {};
    }

    onMediaReconnect(callback) {
        this.callbacks.onMediaReconnect = callback ? callback : () => {};
    }

    onMediaReconnectFails(callback) {
        this.callbacks.onMediaReconnectFails = callback ? callback : () => {};
    }
    ////////////////////////////////////////////////
    // SYSTEM FUNCTIONS
    ////////////////////////////////////////////////
    /**
     *  Wrapper for getUserMedia
     *
     * @param key
     * @param constrains
     * @param resizeMode
     * @param callback
     */
    privateGetUserMedia(key, constrains, resizeMode, callback) {
        const self = this;
        // key === 'fake' - fake mode, use the fake video stream instead of getting
        // it from the camera. Used in toggle media for the call - we replace the
        // real video track with the fake one. So, camera is released (led is off),
        // but the connection isn't interrupted
        // Get the last constrains
        if (!constrains) {
            constrains = self.lastConstrains[key];
        }
        if (constrains.fake) {
            key = 'fake';
        }
        if (!constrains) {
            return callback('No media constrains found');
        }
        // Prepare audio constrains
        if (constrains.audio && self.audioDevice) {
            if (constrains.audio === true) {
                constrains.audio = {};
            }
            constrains.audio.deviceId = self.audioDevice;
        }
        // Prepare video constrains
        if (constrains.video && self.videoDevice) {
            if (constrains.video === true) {
                constrains.video = {};
            }
            constrains.video.deviceId = self.videoDevice;
        }
        // Store "last" constrains
        if (key !== 'fake') {
            self.lastConstrains[key] = constrains;
        } else {
            // For the fake mode - disable the video request
            constrains.video = false;
        }
        if (!constrains.audio && !constrains.video) {
            const stream = new MediaStream([self.privateStartFakeVideo()]);
            return callback(null, stream);
        }
        if (self.localStreams[key]) {
            self.privateStopMediaStream(self.localStreams[key]);
        }
        navigator.mediaDevices
            .getUserMedia(constrains)
            .then((stream) => {
                // Fake mode? Add the fake video track
                if (key === 'fake') {
                    const fakeVideoTrack = self.privateStartFakeVideo();
                    stream.addTrack(fakeVideoTrack);
                }
                const media = self.media[key];
                // Need to resize and the video is enabled?
                if (resizeMode && constrains.video) {
                    // Resize the video
                    // const updatedStream = self.privateResizeMediaStream(resizeMode, stream);
                    const settings = self.videoSettings[resizeMode];
                    const updatedStream = settings
                        ? self.videoResizer.start(stream, resizeMode, settings.width, settings.height, settings.fps)
                        : stream;

                    // Enable/disable tracks
                    if (media) {
                        updatedStream.getTracks().forEach((track) => {
                            if (key.startsWith('call') && !self.callAccepted) {
                                track.enabled = false;
                            } else if ((track.kind === 'video' && !media.video) || (track.kind === 'audio' && !media.audio)) {
                                track.enabled = false;
                            } else {
                                if (track.kind === 'video') {
                                    self.cameraEnabled = true;
                                }
                                track.enabled = true;
                            }
                        });
                    }
                    // Selfie callbacks
                    if (resizeMode === 'workspace') {
                        self.callbacks.onSelfie(null, updatedStream);
                    } else if (resizeMode === 'call' || resizeMode === 'space') {
                        self.callbacks.onSelfieFull(null, stream);
                    }
                    callback(null, updatedStream);
                } else {
                    if (media) {
                        // Enable/disable tracks
                        stream.getTracks().forEach((track) => {
                            if (key.startsWith('call') && !self.callAccepted) {
                                track.enabled = false;
                            } else if (key === 'fake' && track.kind === 'video') {
                                track.enabled = true;
                            } else if ((track.kind === 'video' && !media.video) || (track.kind === 'audio' && !media.audio)) {
                                track.enabled = false;
                            } else {
                                if (track.kind === 'video') {
                                    self.cameraEnabled = true;
                                }
                                track.enabled = true;
                            }
                        });
                    }
                    // Selfie callback
                    if (key.startsWith('call') && constrains.video) {
                        self.callbacks.onSelfieFull(null, stream);
                    }
                    callback(null, stream);
                }
            })
            .catch((error) => {
                return callback(error);
            });
    }

    /**
     * Wrapper for getDisplayMedia
     *
     * @param callbacks
     */
    privateGetDisplayMedia(callback) {
        const self = this;
        if (self.screenStream) {
            return callback(null, self.screenStream);
        }
        navigator.mediaDevices
            .getDisplayMedia(self.callConstraints.screen)
            .then((stream) => {
                const settings = self.videoSettings['screen'];
                const updatedStream = settings
                    ? self.videoResizer.start(stream, 'screen', settings.width, settings.height, settings.fps)
                    : stream;
                return callback(null, updatedStream);
            })
            .catch((error) => {
                console.warn(error);
                return callback(error);
            });
    }

    /**
     * Join the room
     *
     * @param workspaceId
     * @param callId
     * @param spaceId
     */
    privateJoinRoom(workspaceId, callId, spaceId) {
        const self = this;
        const key = callId ? `call:${callId}` : spaceId ? `space:${spaceId}` : 'workspace';
        const media = self.media[key];
        if (callId) {
            console.log(`Join the call: ${callId}`);
        } else if (spaceId) {
            console.log(`Join the space: ${spaceId}`);
        } else {
            console.log(`Join the workspace: ${workspaceId}`);
        }
        // No media - no connection
        if (!callId && !spaceId && !media.audio && !media.video) {
            self.emit('/v1/sfu/spectate', { workspaceId, callId });
            return;
        }
        if (self.activeConnections[key]) {
            return;
        }
        self.activeConnections[key] = Date.now();
        // Create RTCPeerConnection
        console.log('Create local peer connection');
        if (self.connections[key]) {
            self.connections[key].close();
            delete self.connections[key];
        }
        self.connections[key] = new RTCPeerConnection({ iceServers: self.iceServers });
        const constrains = self.lastConstrains[key]
            ? { ...self.lastConstrains[key] }
            : callId
            ? { ...self.callConstraints }
            : spaceId
            ? { ...self.spaceConstraints }
            : { ...self.workspaceConstraints };
        if ((callId || spaceId) && !self.cameraEnabled) {
            constrains.video = false;
        }
        const shouldResize = callId ? 'call' : spaceId ? 'space' : 'workspace';
        console.log('Requesting local stream', constrains);
        self.privateGetUserMedia(key, constrains, shouldResize, (error, stream) => {
            if (error) {
                // self.callbacks.onJoinWorkspace('Please provide Camera and Microphone permissions to continue.');
                self.callbacks.onJoinWorkspace(error);
                console.warn(error);
                return;
            }
            // Autorestarting
            self.startingConnections[key] = setTimeout(() => {
                console.log('RRRRRRRRRRRRRRRRRRRRRRRRR 1');
                self.privateReconnectStreaming(callId, spaceId);
            }, self.reconnectIfNotConnected);
            console.log('Received local stream');
            self.localStreams[key] = stream;
            self.localStreams[key].getTracks().forEach((track) => {
                try {
                    self.connections[key] && self.connections[key].addTrack(track, self.localStreams[key]);
                } catch (error) {
                    console.warn(error);
                    console.log('RRRRRRRRRRRRRRRRRRRRRRRRR 2');
                    self.privateReconnectStreaming(callId, spaceId);
                }
            });
            self.connections[key].onconnectionstatechange = (event) => {
                if (['closed', 'failed', 'disconnected'].includes(event.target.iceConnectionState) && self.activeConnections[key]) {
                    console.log(
                        `Connection for ${callId ? `call ${callId}` : spaceId ? `space: ${spaceId}` : 'workspace'} lost with the status ${
                            event.target.connectionState
                        }, reconnecting...`
                    );
                    console.log('RRRRRRRRRRRRRRRRRRRRRRRRR 3');
                    self.privateReconnectStreaming(callId, spaceId);
                } else if (event.target.iceConnectionState === 'connected') {
                    console.log('TTTTTTTTTTTTTTTTTTTTT');
                    clearTimeout(self.startingConnections[key]);
                    self.reconnectLastConnectionSuccessful = true;
                    self.reconnectIfNotConnected = self.reconnectIfNotConnectedOriginal;
                    console.log('Outgoing connection is established');
                } else {
                    console.log(
                        `Connection state for ${callId ? `call ${callId}` : spaceId ? `space: ${spaceId}` : 'workspace'}`,
                        event.target.iceConnectionState
                    );
                }
            };
            // Force sendonly for RTCPeerConnection
            const transivers = self.connections[key].getTransceivers();
            /*
            const codecs = [];
            const videoCodecsSend = RTCRtpSender.getCapabilities('video').codecs.filter((item) => item.mimeType === 'video/VP9');
            / *
            const videoCodecsSend = RTCRtpSender.getCapabilities('video').codecs.sort((a, b) => {
                console.log(`=== ${a.mimeType} ? ${b.mimeType}`);
                return a.mimeType === 'video/VP9' && b.mimeType !== 'video/VP9' ? -1 : 1;
            });
            * /
            // const videoCodecsRecv = RTCRtpReceiver.getCapabilities('video').codecs.filter((item) => item.mimeType === 'video/VP9');
            // const videoCodecsRecv = RTCRtpReceiver.getCapabilities('video').codecs.filter((item) => item.mimeType === 'video/VP9');
            const audioCodecsSend = RTCRtpSender.getCapabilities('audio').codecs; // .filter((item) => item.mimeType === 'audio/opus');
            // const audioCodecsRecv = RTCRtpReceiver.getCapabilities('audio').codecs.filter((item) => item.mimeType === 'audio/opus');
            videoCodecsSend.forEach((item) => codecs.push(item));
            // videoCodecsRecv.forEach((item) => codecs.push(item));
            audioCodecsSend.forEach((item) => codecs.push(item));
            //audioCodecsRecv.forEach((item) => codecs.push(item));
            console.log('CCCCC', codecs);
            */
            transivers.forEach((transiver) => {
                transiver.direction = 'sendonly';
                // transiver.setCodecPreferences(videoCodecsSend);
                // transiver.setCodecPreferences(codecs);
            });
            // const senders = self.connections[key].getSenders();
            self.connections[key].createOffer().then(
                (sdpOffer) => {
                    console.log('sdpOffer is generated');
                    self.sdpOffer = sdpOffer;
                    // Send request to signaling server
                    const data = {
                        workspaceId: workspaceId,
                        sdpOffer: sdpOffer,
                        callId,
                        spaceId,
                        audio: !!(callId || spaceId),
                        video: true,
                    };
                    self.emit('/v1/sfu/start', data);
                },
                (error) => {
                    console.warn('Error in create offer: ' + error);
                }
            );
        });
    }

    /**
     * Stop streaming and leave the board
     *
     * @param workspaceId
     * @param callId
     * @param spaceId
     * @param justReconnect
     */
    privateLeaveRoom(workspaceId, callId, spaceId, reconnect) {
        const self = this;
        const key = callId ? `call:${callId}` : spaceId ? `space:${spaceId}` : 'workspace';
        delete self.activeConnections[key];
        clearTimeout(self.startingConnections[key]);
        if (callId && callId === self.callId) {
            self.videoResizer.stop('call');
            self.callbacks.onSelfieFullStop();
        } else if (spaceId && spaceId === self.spaceId) {
            self.videoResizer.stop('space');
            self.callbacks.onSelfieFullStop();
        } else if (!callId && !spaceId) {
            self.cameraEnabled = false;
            self.privateStopSendingStatus();
            self.videoResizer.stop('workspace');
            self.callbacks.onSelfieStop();
        }
        self.privateStopMediaStream(self.localStreams[key]);
        delete self.localStreams[key];
        // Send request to signaling server
        if (self.socket && workspaceId) {
            self.emit('/v1/sfu/leave', { workspaceId, callId, spaceId, reconnect });
        }
        if (!reconnect) {
            Object.values(self.publishers).map((publisher) => {
                if (callId && publisher.callId === callId) {
                    self.privateStopWatchingPublisher(publisher.publisherId);
                    delete self.publishers[publisher.publisherId];
                }
                if (spaceId && publisher.spaceId === spaceId) {
                    self.privateStopWatchingPublisher(publisher.publisherId);
                    delete self.publishers[publisher.publisherId];
                }
            });
            if (self.connections[key]) {
                self.connections[key].close();
            }
            delete self.connections[key];
            if (self.callbacks.onLeaveWorkspace) {
                self.callbacks.onLeaveWorkspace(null, workspaceId);
            }
        }
    }

    /**
     * Restart the session
     *
     * @param callId
     * @param spaceId
     */
    privateReconnectStreaming(callId, spaceId) {
        const self = this;
        if (self.reconnectLastConnectionSuccessful) {
            self.reconnectLastConnectionSuccessful = false;
        } else if (self.reconnectIfNotConnected < self.reconnectIfNotConnectedMax) {
            self.reconnectIfNotConnected += 1000;
        } else {
            if (self.callbacks.onMediaReconnectFails) {
                const what = callId ? `call: ${callId}` : spaceId ? `space: ${spaceId}` : 'workspace';
                self.callbacks.onMediaReconnectFails(what);
            }
        }
        if (self.callbacks.onMediaReconnect) {
            const what = callId ? `call: ${callId}` : spaceId ? `space: ${spaceId}` : 'workspace';
            self.callbacks.onMediaReconnect(what);
        }
        self.privateLeaveRoom(self.workspaceId, callId, spaceId, true);
        setTimeout(() => {
            self.privateJoinRoom(self.workspaceId, callId, spaceId);
        }, 1000);
    }

    /**
     * Start screen sharing
     *
     * @param calleeId
     * @param audio
     * @param video
     */
    privateScreenShare(callId) {
        const self = this;
        if (!callId) {
            self.callbacks.screenShare('Can`t share the screen without callId');
            return;
        }
        console.log(`Start screen sharing in channel ${self.workspaceId} call ${callId}`);
        self.activeConnections['screen'] = Date.now();

        // Create RTCPeerConnection
        self.connections['screen'] = new RTCPeerConnection({ iceServers: self.iceServers });
        // Request local stream
        self.privateGetDisplayMedia((error, stream) => {
            if (error || !stream) {
                self.callbacks.screenShare('Please provide screen share permissions to continue', error);
                console.warn(error);
                return;
            }
            // Autorestarting
            self.startingConnections['screen'] = setTimeout(() => {
                self.privateReconnectStreaming(callId);
            }, self.reconnectIfNotConnected);

            console.log('Received local screen stream');
            self.screenStream = stream;
            self.screenStream.getVideoTracks()[0].onended = () => {
                self.privateStopScreenShare(callId);
            };
            self.callbacks.onScreen(null, self.workspaceId, self.screenStream);
            self.callbacks.onScreenAdded(null, callId, self.userId, self.screenStream);
            self.screenStream.getTracks().forEach((track) => {
                self.connections['screen'].addTrack(track, self.screenStream);
            });
            self.connections['screen'].onconnectionstatechange = (event) => {
                if (['closed', 'failed', 'screen stop'].includes(event.target.iceConnectionState) && self.activeConnections['screen']) {
                    console.log(`Screen connection lost with the status ${event.target.connectionState}, reconnecting...`);
                    self.privateReconnectScreenShare(callId);
                } else if (event.target.iceConnectionState === 'connected') {
                    clearTimeout(self.startingConnections['screen']);
                }
                console.log(`Connection state for screen sharing`, event.target.iceConnectionState);
            };
            // Force sendonly for RTCPeerConnection
            const transivers = self.connections['screen'].getTransceivers();
            transivers.forEach((transiver) => (transivers.direction = 'sendonly'));
            self.connections['screen'].createOffer().then(
                (sdpOffer) => {
                    self.sdpOfferScreen = sdpOffer;
                    // Send request to signaling server
                    const data = {
                        workspaceId: self.workspaceId,
                        callId,
                        sdpOffer,
                    };
                    self.emit('/v1/sfu/screen-start', data);
                },
                (error) => {
                    console.error('Error in create offer: ' + error);
                }
            );
        });
    }

    /**
     * Stop streaming and leave the board
     *
     * @param workspaceId
     * @param justReconnect
     */
    privateStopScreenShare(callId, reconnect) {
        const self = this;
        if (!self.activeConnections['screen']) {
            return;
        }
        clearTimeout(self.startingConnections['screen']);
        delete self.activeConnections['screen'];
        // Send request to signaling server
        self.emit('/v1/sfu/screen-stop', { workspaceId: self.workspaceId, callId, reconnect });
        if (!reconnect) {
            self.screenStream.getVideoTracks().forEach((track) => {
                track.stop();
                self.screenStream.removeTrack(track);
            });
            self.screenStream = null;
            if (self.connections['screen']) {
                self.connections['screen'].close();
            }
            delete self.connections['screen'];
            self.callbacks.onScreenStop(null, self.workspaceId, callId);
            self.callbacks.onScreenRemoved(null, callId, self.userId);
        }
    }

    /**
     * Restart the screen sharing session
     *
     * @param callId
     * @param spaceId !!!! TODO
     */
    privateReconnectScreenShare(callId, spaceId) {
        const self = this;
        self.privateStopScreenShare(callId, true);
        self.callbacks.onMediaReconnect('sceen');
        setTimeout(() => {
            self.privateScreenShare(callId);
        }, 1000);
    }

    /**
     * Watch the publisher`s stream Ð²Ð‚â€ ask for his video/audio
     *
     * @param publisherId publisher ID to watch. Note, that it's Janus ID, not our user ID
     */
    privateWatchPublisher(publisherId) {
        const self = this;
        const publisher = { ...self.publishers[publisherId] };
        if (!publisher) {
            console.warn('Can`t watch unexisting publisher');
            return;
        }
        self.activeConnections[publisherId] = Date.now();
        if (!self.allowIncomingAudio && publisher.audio) {
            // TODO: pass team ID here
            publisher.audio = false;
        }
        if (self.startingConnections[publisherId]) {
            return;
        }
        const audio = publisher.audio && self.allowIncomingAudio;
        const video = (publisher.video || publisher.screen) && self.allowIncomingVideo;
        if (!audio && !video) {
            self.privateStopWatchingPublisher(publisherId);
            return;
        }
        // Start autorestarting
        self.startingConnections[publisherId] = true;
        self.startingConnections[publisherId] = setTimeout(() => {
            console.log('Publisher watch timeout', publisherId);
            self.privateRestartWatchingPublisher(publisherId);
        }, self.reconnectIfNotConnected);
        console.log(`Viewing channel ${self.workspaceId}, publisher: ${publisherId}`);
        self.connections[publisherId] = new RTCPeerConnection({ iceServers: self.iceServers });
        self.connections[publisherId].ontrack = (event) => {
            clearTimeout(self.startingConnections[publisherId]);
            self.incomingStreams[publisherId] = event.streams[0];
            if (publisher.screen) {
                self.callbacks.onScreenAdded(null, publisher.callId, publisher.userId, event.streams[0]);
            } else if (publisher.callId) {
                const key = `call:${publisher.callId}`;
                if (!self.streams[key]) {
                    self.streams[key] = {};
                }
                self.streams[key][publisher.userId] = event.streams[0];
            } else if (publisher.spaceId) {
                const key = `space:${publisher.spaceId}`;
                if (!self.streams[key]) {
                    self.streams[key] = {};
                }
                if (!self.usersInSpace[publisher.spaceId]) {
                    self.usersInSpace[publisher.spaceId] = {};
                }
                self.usersInSpace[publisher.spaceId][publisher.userId] = { id: publisher.userId, started: Date.now(), status: 'in' };

                // Display full size video for the public space
                if (!self.streams[key][publisher.userId]) {
                    self.streams[key][publisher.userId] = event.streams[0];
                    self.onUserAdded(
                        null,
                        publisher.spaceId,
                        publisher.userId,
                        audio,
                        video,
                        self.streams[key][publisher.userId],
                        self.usersInSpace[publisher.spaceId],
                        'full'
                    );
                }
                self.callbacks.onSpaceUserAdded(null, publisher.spaceId, publisher.userId, audio, video);
                self.callbacks.onSpaceUsers(null, publisher.spaceId, self.usersInSpace[publisher.spaceId], self.streams);
                self.callbacks.onCallJoined(null, publisher.spaceId, publisher.userId, audio, video, self.usersInSpace[publisher.spaceId]);
            } else {
                if (!self.streams['workspace']) {
                    self.streams['workspace'] = {};
                }
                self.streams['workspace'][publisher.userId] = event.streams[0];
                // Display preview for the workspace
                self.callbacks.onWorkspaceUserAdded(null, publisher.userId, audio, video, event.streams[0]);
            }
        };
        if (publisher.callId && !publisher.screen) {
            // Display preview for the call / no screen
            self.onUserAdded(
                null,
                publisher.callId,
                publisher.userId,
                audio,
                video,
                self.streams['workspace'][publisher.userId],
                self.usersInCall,
                'preview'
            );
        } else if (publisher.spaceId) {
            /*
            self.onUserAdded(
                null,
                publisher.spaceId,
                publisher.userId,
                audio,
                video,
                self.streams['workspace'][publisher.userId],
                self.usersInSpace[publisher.spaceId]
            );
            */
            self.callbacks.onCallJoined(null, publisher.spaceId, publisher.userId, audio, video, self.usersInSpace[publisher.spaceId]);
        }
        self.connections[publisherId].onconnectionstatechange = (event) => {
            if (['closed', 'failed'].includes(event.target.iceConnectionState) && self.activeConnections[publisherId]) {
                self.privateRestartWatchingPublisher(publisherId);
            }
            console.log(`Connection state for publisher ${publisherId}`, event.target.iceConnectionState);
        };
        // Force sendonly for RTCPeerConnection
        const transivers = self.connections[publisherId].getTransceivers();
        transivers.forEach((transiver) => (transivers.direction = 'recvonly'));

        const data = {
            publisherId,
            workspaceId: self.workspaceId,
            callId: publisher.callId,
            spaceId: publisher.spaceId,
            userId: publisher.userId,
            audio,
            video,
        };
        self.emit('/v1/sfu/publisher-watch', data);
        return true;
    }

    /**
     * Stop watching publisher
     *
     * @param publisherId    publisher ID to watch. Note, that it's Janus ID, not our user ID
     * @param workspaceId
     */
    privateStopWatchingPublisher(publisherId, reconnect) {
        const self = this;
        console.log('Stop watching publisher', publisherId);
        const publisher = { ...self.publishers[publisherId] };
        clearTimeout(self.startingConnections[publisherId]);
        delete self.activeConnections[publisherId];
        if (self.incomingStreams[publisherId]) {
            self.privateStopMediaStream(self.incomingStreams[publisherId]);
            delete self.incomingStreams[publisherId];
        }
        if (!reconnect) {
            if (publisher.callId && publisher.screen) {
                self.callbacks.onScreenRemoved(null, publisher.callId, publisher.userId);
            } else if (publisher.spaceId && publisher.screen) {
                self.callbacks.onScreenRemoved(null, publisher.spaceId, publisher.userId);
            } else if (publisher.callId) {
                //  && publisher.callId === self.callId
                // const callUsers = Object.values(self.publishers).filter((p) => p.callId === publisher.callId);
                self.callbacks.onCallUserRemoved(null, publisher.callId, publisher.userId, self.usersInCall);
            } else if (publisher.spaceId) {
                //  && publisher.spaceId === self.spaceId
                const key = `space:${publisher.spaceId}`;
                if (!self.streams[key]) {
                    self.streams[key] = {};
                }
                delete self.streams[key][publisher.userId];
                delete self.usersInSpace[publisher.spaceId][publisher.userId];
                self.callbacks.onSpaceUsers(null, publisher.spaceId, self.usersInSpace[publisher.spaceId], self.streams);
                self.callbacks.onCallUserRemoved(null, publisher.spaceId, publisher.userId, self.usersInSpace[publisher.spaceId]);
                //const previewStream = self.streams['workspace'][publisher.userId];
                //self.callbacks.onSpaceUserRemoved(null, publisher.spaceId, publisher.userId, self.usersInSpace, previewStream);
            } else {
                self.callbacks.onWorkspaceUserRemoved(null, publisher.userId);
            }
            self.emit('/v1/sfu/publisher-unwatch', publisher);
        }
        if (self.connections[publisherId]) {
            self.connections[publisherId].close();
            delete self.connections[publisherId];
        }
    }

    /**
     * Restart watching the publisher
     *
     * @param publisherId
     */
    privateRestartWatchingPublisher(publisherId) {
        const self = this;
        self.privateStopWatchingPublisher(publisherId, true);
        console.log('Restart publisher', publisherId);
        self.callbacks.onMediaReconnect(`publisher: ${publisherId}`);
        setTimeout(() => {
            self.privateWatchPublisher(publisherId);
        }, 1000);
    }

    /**
     * Restart watching all publishers
     *
     */
    privateRestartAllPublishers() {
        const self = this;
        self.callbacks.onMediaReconnect(`All publishers`);
        Object.values(self.publishers).forEach((publisher, i) => {
            self.privateStopWatchingPublisher(publisher.publisherId, true);
            setTimeout(() => {
                self.privateWatchPublisher(publisher.publisherId);
            }, 1000 + i * 250);
        });
    }

    /**
     * New publisher added to the call
     *
     * @param {string}      error
     * @param {string}      callId
     * @param {string}      userId
     * @param {string}      audio
     * @param {string}      video
     * @param {MediaStream} mediaStream
     * @param {array}       usersInCall
     * @param {string}      mediaType
     *
     */
    onUserAdded(error, callId, userId, audio, video, mediaStream, usersInCall, mediaType) {
        const self = this;
        if (!mediaStream) {
            return;
        }
        if (!self.callStreams[callId]) {
            self.callStreams[callId] = {};
        }
        if (!self.callStreams[callId][userId]) {
            self.callStreams[callId][userId] = { preview: false, full: false, actiual: false };
        }
        if (self.callStreams[callId][userId].preview && !self.callStreams[callId][userId].preview.id) {
            self.callStreams[callId][userId].preview = false;
        }
        if (self.callStreams[callId][userId].full && !self.callStreams[callId][userId].full.id) {
            self.callStreams[callId][userId].full = false;
        }
        let changed = false;
        if (mediaType === 'preview' && !self.callStreams[callId][userId].preview) {
            self.callStreams[callId][userId].preview = mediaStream;
            if (!usersInCall[userId] || usersInCall[userId].status === 'pending') {
                changed = true;
            }
        }
        if (mediaType === 'full' && !self.callStreams[callId][userId].full) {
            self.callStreams[callId][userId].full = mediaStream;
            if (usersInCall[userId].status === 'in') {
                changed = true;
            }
        }
        if (changed) {
            const streamToSend =
                usersInCall[userId] && usersInCall[userId].status === 'in'
                    ? self.callStreams[callId][userId].full
                    : self.callStreams[callId][userId].preview;
            self.callbacks.onCallUserAdded(null, callId, userId, audio, video, streamToSend, usersInCall, mediaType);
        }
    }

    ////////////////////////////////////////////////
    // Events for signaling server
    ////////////////////////////////////////////////
    /**
     * On login
     *
     * @param response
     */
    socketOnLogin(response) {
        const self = this;
        if (response.code !== 200) {
            return self.callbacks.onLogin(response.error);
        }
        self.userId = response.user.id;
        self.userData = response.user;
        self.iceServers = response.iceServers;
        self.workspaceId = response.workspaceId;
        const versions = { frontend: self.version, signaling: response.version };
        console.log(versions);
        self.callbacks.onLogin(null, self.userId, self.userData, response.token, versions);
        self.callbacks.onSocketReonnected(null);
        if (self.socketStatus) {
            self.socketStatus.emit('/v1/status/join', { workspaceId: self.workspaceId });
        }
    }

    /**
     * Callee joined the call - for the joined user
     *
     * @param response
     */
    socketOnCallJoin(response) {
        const self = this;
        if (response.code !== 200) {
            console.warn(`Can't joing the call: ${response.error}`);
            if (response.joiningOther) {
                self.callbacks.onJoiningUserAccepted(response.error);
            }
            return self.callbacks.onJoinCall(response.error);
        }
        self.callbacks.onJoinCall(null, response.callId, response.userId, response.audio, response.video);
        // if ()
        if (response.joiningOther) {
            self.callbacks.onJoiningUserAccepted(null, response.callId, response.userId, response.audio, response.video);
        }

        const key = `call:${response.callId}`;
        if (self.usersInCall[response.userId]) {
            self.usersInCall[response.userId].status = 'in';
        }
        Object.values(self.usersInCall).forEach((user) => {
            if (user.status !== 'in' || user.id === self.userId) {
                return;
            }
            const interval = setInterval(() => {
                if (self.streams[key]) {
                    clearInterval(interval);
                    if (user.id === self.userId) {
                        return;
                    }
                    // Display call full size
                    if (self.streams[key][user.id]) {
                        self.onUserAdded(
                            null,
                            response.callId,
                            user.id,
                            user.audio,
                            user.video,
                            self.streams[key][user.id],
                            self.usersInCall,
                            'full'
                        );
                    }
                    self.callbacks.onCallJoined(
                        null,
                        response.callId,
                        user.id,
                        user.audio,
                        user.video,
                        // self.streams[key][user.id],
                        self.usersInCall
                    );
                }
            }, 500);
        });
    }

    /**
     * Callee joined the call - for the collutors
     *
     * @param response
     */
    socketOnCallJoined(response) {
        const self = this;
        if (response.code !== 200) {
            return self.callbacks.onCallJoined(response.error);
        }
        const key = `call:${response.callId}`;
        self.usersInCall = {};
        response.users.forEach((user) => {
            self.usersInCall[user.id] = user;
        });
        if (!self.callAccepted && (response.userId === self.userId || self.callAuthor)) {
            self.callAccepted = response.callId;
            const media = self.media[key];
            if (self.localStreams[key] && media) {
                self.localStreams[key].getTracks().forEach((track) => {
                    if ((track.kind === 'video' && !media.video) || (track.kind === 'audio' && !media.audio)) {
                        track.enabled = false;
                    } else {
                        track.enabled = true;
                    }
                });
            }
        }
        if (self.callAccepted && response.userId !== self.userId) {
            const interval = setInterval(() => {
                if (self.streams[key]) {
                    const stream = self.streams[key][response.userId];
                    if (!stream || stream.getTracks().length < 2) {
                        return;
                    }
                    clearInterval(interval);
                    if (self.usersInCall[response.userId]) {
                        self.usersInCall[response.userId].status = 'in';
                    }
                    // Display call full size
                    self.onUserAdded(
                        null,
                        response.callId,
                        response.userId,
                        response.audio,
                        response.video,
                        self.streams[key][response.userId],
                        self.usersInCall,
                        'full'
                    );
                    self.callbacks.onCallJoined(
                        null,
                        response.callId,
                        response.userId,
                        response.audio,
                        response.video,
                        // self.streams[key][user.id],
                        self.usersInCall
                    );
                }
            }, 1000);
        }
    }

    /**
     * User joined the space
     *
     * @param response
     */
    socketOnSpaceJoin(response) {
        const self = this;
        if (response.code !== 200) {
            self.spaceId = null;
            return self.callbacks.onSpaceJoined(response.error);
        }
        /*
        const key = `space:${response.spaceId}`;
        const media = self.media[key];
        if (self.localStreams[key] && media) {
            self.localStreams[key].getTracks().forEach((track) => {
                if ((track.kind === 'video' && !media.video) || (track.kind === 'audio' && !media.audio)) {
                    track.enabled = false;
                } else {
                    track.enabled = true;
                }
            });
        }
        */
        self.privateJoinRoom(self.workspaceId, null, response.spaceId);
        self.callbacks.onSpaceJoined(
            null,
            response.spaceId,
            response.userId,
            response.audio,
            response.video,
            self.usersInSpace[response.spaceId]
        );

        const key = `space:${response.spaceId}`;
        if (response.userId === self.userId) {
            return;
        }
        const interval = setInterval(() => {
            if (self.streams[key]) {
                const stream = self.streams[key][response.userId];
                if (!stream) {
                    return;
                }
                clearInterval(interval);

                self.spaceId = response.spaceId;
                // Display space full size
                self.onUserAdded(
                    null,
                    response.spaceId,
                    response.userId,
                    response.audio,
                    response.video,
                    stream, // self.streams[key][user.id],
                    self.usersInSpace[response.spaceId],
                    'full'
                );
            }
        }, 1000);
    }

    /**
     * User left the public space
     *
     * @param response
     */
    socketOnSpaceLeft(response) {
        const self = this;
        if (response.code !== 200) {
            return self.callbacks.onSpaceLeft(response.error);
        }
        self.callbacks.onSpaceLeft(null, response.spaceId, response.userId);
    }

    /**
     * User left the public space
     *
     * @param response
     */
    socketOnSpaceUsers(response) {
        const self = this;
        if (response.code !== 200) {
            return self.callbacks.onSpaceUsers(response.error);
        }
        if (!self.usersInSpace[response.spaceId]) {
            self.usersInSpace[response.spaceId] = {};
        }
        Object.values(self.usersInSpace[response.spaceId]).forEach((existingUser) => {
            if (Object.keys(response.users).indexOf() === -1) {
                delete self.usersInSpace[response.spaceId][existingUser.id];
            }
        });
        response.users.forEach((user) => {
            if (!self.usersInSpace[response.spaceId][user.id]) {
                self.usersInSpace[response.spaceId][user.id] = {
                    id: user.id,
                    started: user.started ? user.started : Date.now(),
                    status: user.status,
                };
            }
        });
        self.callbacks.onSpaceUsers(null, response.spaceId, self.usersInSpace[response.spaceId], self.streams);
        if (self.spaceId === response.spaceId) {
            response.users.forEach((user) => {
                // Display workspace preview
                self.onUserAdded(
                    null,
                    response.spaceId,
                    user.id,
                    user.audio,
                    user.video,
                    self.streams['workspace'][user.id],
                    self.usersInCall,
                    'preview'
                );
                self.callbacks.onCallJoined(null, response.spaceId, user.id, user.audio, user.video, self.usersInSpace[response.spaceId]);
            });
        }
    }

    /**
     * I rejected the incoming call
     *
     * @param response
     */
    socketOnCallReject(response) {
        const self = this;
        if (response.code !== 200) {
            return self.callbacks.onCallRejected(response.error);
        }
        delete self.usersInCall[response.userId];
        const isSomebodyInTheCall = Object.keys(self.usersInCall).some((userId) => userId.toString() !== self.userId.toString());
        if (!isSomebodyInTheCall) {
            self.callAccepted = false;
            self.privateLeaveRoom(self.workspaceId, response.callId);
        }
        // self.callbacks.onCallRejected(null, response.callId, response.userId, !isSomebodyInTheCall);
        self.callbacks.onCallReject(null, response.callId, response.userId, !isSomebodyInTheCall);
    }

    /**
     * Your incoming call was rejected by another user
     *
     * @param response
     */
    socketOnCallRejected(response) {
        const self = this;
        if (response.code !== 200) {
            return self.callbacks.onCallRejected(response.error);
        }
        delete self.usersInCall[response.userId];
        const isSomebodyInTheCall = Object.keys(self.usersInCall).some((userId) => userId.toString() !== self.userId.toString());
        if (!isSomebodyInTheCall) {
            self.callAccepted = false;
            self.privateLeaveRoom(self.workspaceId, response.callId);
        }
        self.callbacks.onCallRejected(null, response.callId, response.userId, !isSomebodyInTheCall);
        // Check if any other user is in the call
        // self.callbacks.onCallRejected(response.error, response.callId, response.userId, true);
        // self.hangupCall(response.callId);
        // return;
    }

    /**
     * Call was finished
     *
     * @param response
     */
    socketOnHangup(response) {
        const self = this;
        // if (response.userId !== self.userId) {
        //            self.privateLeaveRoom(self.workspaceId, callId);
        // }
        // if (self.callId !== response.callId) {
        //    return;
        // }
        self.callAccepted = false;
        if (response.code === 200) {
            self.privateLeaveRoom(self.workspaceId, response.callId, response.spaceId);
            self.privateStopScreenShare(response.callId, response.spaceId);
        }
        self.callbacks.onHangupCall(null, response.callId, response.userId, response.users);
    }

    /**
     * Call was started
     *
     * @param response
     */
    socketOnCallStart(response) {
        const self = this;
        const key = `call:${response.callId}`;
        self.callId = response.callId;

        response.users.forEach((user) => {
            if (user.id === self.userId) {
                return;
            }
            // Display call preview
            self.onUserAdded(
                null,
                response.callId,
                user.id,
                true, // audio,
                true, //video,
                self.streams['workspace'][user.id],
                self.usersInCall,
                'preview'
            );
        });
        /*
        if (response.code === 409) {
            // self.media[`call:${response.callId}`] = { audio: response.audio, video: response.video };
            self.media[key] = { audio: true, video: true };
            self.privateJoinRoom(self.workspaceId, response.callId);
            setTimeout(() => {
                const media = self.media[key];
                if (self.localStreams[key] && media) {
                    self.localStreams[key].getTracks().forEach((track) => {
                        if ((track.kind === 'video' && !media.video) || (track.kind === 'audio' && !media.audio)) {
                            track.enabled = false;
                        } else {
                            track.enabled = true;
                        }
                    });
                }
            }, 2000);
            return self.callbacks.onStartCall('Conflict', response.callId);
        }
        */

        if (response.code !== 200) {
            return self.callbacks.onStartCall(response.error);
        }
        self.callbacks.onStartCall(null, response.callId, response.users, response.audio, response.video);
        self.media[`call:${response.callId}`] = { audio: response.audio, video: response.video };
        self.privateJoinRoom(self.workspaceId, response.callId, response.spaceId);
    }

    /**
     * Incoming call
     *
     * @param response
     */
    socketOnCallIncoming(response) {
        const self = this;
        self.media[`call:${response.callId}`] = { audio: false, video: false };
        self.usersInCallIncoming[response.callId] = {};
        response.users.forEach((user) => {
            console.log(user);
            self.usersInCallIncoming[response.callId][user.id] = {
                id: user.id,
                started: Date.now(),
                status: 'pending', // user.status,
            };
            if (user.id === self.userId) {
                return;
            }
            // Preview for the incoming call
            self.onUserAdded(
                null,
                response.callId,
                user.id,
                true, // audio,
                true, //video,
                self.streams['workspace'][user.id],
                self.usersInCallIncoming,
                'preview'
            );
        });
        self.callbacks.onCallIncoming(
            null,
            response.callId,
            response.caller,
            self.usersInCallIncoming[response.callId],
            response.audio,
            response.video
        );
        self.privateJoinRoom(self.workspaceId, response.callId);
    }

    /**
     * Incoming call
     *
     * @param response
     */
    socketOnSpaceIncoming(response) {
        const self = this;
        self.media[`space:${response.spaceId}`] = { audio: false, video: false };
        self.usersInSpaceIncoming[response.spaceId] = {};
        response.users.forEach((user) => {
            self.usersInSpaceIncoming[response.spaceId][user.id] = {
                id: user.id,
                started: Date.now(),
                status: user.status,
            };
            if (user.id === self.userId) {
                return;
            }
            // Full size for the incoming space
            self.onUserAdded(
                null,
                response.spaceId,
                user.id,
                true, // audio,
                true, //video,
                self.streams['workspace'][user.id],
                self.usersInSpaceIncoming[response.spaceId],
                'preview'
            );
        });
        self.callbacks.onSpaceIncoming(
            null,
            response.spaceId,
            response.caller,
            self.usersInSpaceIncoming[response.spaceId],
            response.audio,
            response.video
        );
    }

    /**
     * SFU call was started
     *
     * @param response
     */
    socketOnJoinRoom(response) {
        const self = this;
        const error = response.code === 200 ? null : response.message;
        if (error) {
            console.log('RRRRRRRRRRRRRRRRRRRRRRRRR 4', response);
            self.privateReconnectStreaming(response.callId);
            return;
        }
        self.ownPublishers.push(response.publisherId);
        const key = response.callId ? `call:${response.callId}` : response.spaceId ? `space:${response.spaceId}` : 'workspace';
        try {
            if (!self.connections[key]) {
                console.log(`Session for the ${key} was closed`);
                return;
            }
            self.connections[key]
                .setLocalDescription(self.sdpOffer)
                .then(() => {
                    self.connections[key]
                        .setRemoteDescription(response.sdpAnswer)
                        .then(() => {
                            if (!response.callId && !response.spaceId) {
                                self.callbacks.onJoinWorkspace(null);
                            }
                        })
                        .catch((error) => {
                            console.warn(error);
                            console.log('RRRRRRRRRRRRRRRRRRRRRRRRR 5');
                            self.privateReconnectStreaming(response.callId, response.spaceId);
                        });
                })
                .catch((error) => {
                    console.warn(error);
                    console.log('RRRRRRRRRRRRRRRRRRRRRRRRR 6');
                    self.privateReconnectStreaming(response.callId, response.spaceId);
                });
        } catch (error) {
            console.warn('Failed to start the session, reconnecting...', error);
            console.log('RRRRRRRRRRRRRRRRRRRRRRRRR 7');
            self.privateReconnectStreaming(response.callId, response.spaceId);
        }
    }

    /**
     * SFU call was started
     *
     * @param response
     */
    socketOnScreenShare(response) {
        const self = this;
        const error = response.code === 200 ? null : response.message;
        if (error) {
            self.callbacks.screenShare(error);
            return;
        }
        self.ownPublishers.push(response.publisherId);
        try {
            self.connections['screen']
                .setLocalDescription(self.sdpOfferScreen)
                .then(() => {
                    self.connections['screen']
                        .setRemoteDescription(response.sdpAnswer)
                        .then(() => {
                            console.log('Answer added');
                            if (self.callbacks.screenShare) {
                                self.callbacks.screenShare(null, response.workspaceId);
                            }
                        })
                        .catch((error) => {
                            console.warn(error);
                            self.privateReconnectScreenShare(response.callId, response.spaceId);
                        });
                })
                .catch((error) => {
                    console.warn(error);
                    self.privateReconnectScreenShare(response.callId, response.spaceId);
                });
        } catch (error) {
            console.warn('Failed to start the session, reconnecting...', error);
            self.privateReconnectScreenShare(response.callId, response.spaceId);
        }
    }

    /**
     * Outgoing video is connected
     *
     * @param data
     */
    socketOnSfuConnected(response) {
        const self = this;
        // const self = this;
    }

    /**
     * User list updated - compare with own and add/remove publishers
     *
     * @param response
     */
    socketOnPublishers(response) {
        const self = this;
        const publishers = response.publishers;
        const oldPublishers = {};
        Object.values(self.publishers).map((publisher) => {
            if (publisher.userId === self.userId) {
                // Skip own...
            } else if (response.callId && publisher.callId === response.callId) {
                oldPublishers[publisher.publisherId] = publisher;
            } else if (response.spaceId && publisher.spaceId === response.spaceId) {
                oldPublishers[publisher.publisherId] = publisher;
            } else if (!response.callId && !response.spaceId && !publisher.callId && !publisher.spaceId) {
                oldPublishers[publisher.publisherId] = publisher;
            }
        });
        for (let i in publishers) {
            const publisher = publishers[i];
            if (self.ownPublishers.includes(publisher.publisherId)) {
                continue;
            }
            if (self.userId === publisher.userId) {
                continue;
            }
            delete oldPublishers[publisher.publisherId];
            if (self.publishers[publisher.publisherId]) {
                continue;
            }
            console.log('Add publisher', publisher);
            self.publishers[publisher.publisherId] = publisher;
            setTimeout(() => {
                const publisherAdded = self.privateWatchPublisher(publisher.publisherId);
                if (!publisherAdded) {
                    delete self.publishers[publisher.publisherId];
                }
            }, 1000);
        }
        for (let i in oldPublishers) {
            console.log('Remove publisher', oldPublishers[i]);
            if (self.userId === oldPublishers[i].userId) {
                continue;
            }
            self.privateStopWatchingPublisher(oldPublishers[i].publisherId);
            delete self.publishers[i];
        }
        /*
        !!! Deprecated
        if (response.callId) {
            const users = {};
            Object.values(self.publishers).forEach((publisher) => {
                users[publisher.userId] = {
                    userId: publisher.userId,
                    audio: publisher.audio,
                    video: publisher.video,
                    screen: publisher.screen,
                };
            });
            self.callbacks.onCallUsersUpdated(null, response.callId, users);
        }
        /*
        if (response.spaceId) {
            const users = {};
            Object.values(self.publishers).forEach((publisher) => {
                users[publisher.userId] = {
                    userId: publisher.userId,
                    audio: publisher.audio,
                    video: publisher.video,
                    screen: publisher.screen,
                };
            });
            self.callbacks.onSpaceUsers(null, response.spaceId, users);
        }
        */
    }

    /**
     * Watching the board started
     *
     * @param response
     */
    socketOnPublisherWatch(response) {
        const self = this;
        if (response.code !== 200) {
            console.log('Can`t watch the stream: ' + response.message);
            delete self.publishers[response.publisherId];
            return false;
        }
        console.log('Watching started');
        if (!self.connections[response.publisherId]) {
            return self.privateWatchPublisher(response.publisherId);
        }
        self.connections[response.publisherId]
            .setRemoteDescription(response.sdpOffer)
            .then(() => {
                self.connections[response.publisherId]
                    .createAnswer(self.workspaceAnswerOptions)
                    .then((sdpAnswer) => {
                        self.connections[response.publisherId]
                            .setLocalDescription(sdpAnswer)
                            .then(() => {
                                const data = {
                                    workspaceId: self.workspaceId,
                                    callId: response.callId,
                                    spaceId: response.spaceId,
                                    publisherId: response.publisherId,
                                    sdpAnswer: sdpAnswer,
                                };
                                self.emit('/v1/sfu/answer', data);
                            })
                            .catch((error) => {
                                console.warn(error);
                                self.privateRestartWatchingPublisher(response.publisherId);
                            });
                    })
                    .catch((error) => {
                        console.warn(error);
                        self.privateRestartWatchingPublisher(response.publisherId);
                    });
            })
            .catch((error) => {
                console.warn(error);
                self.privateRestartWatchingPublisher(response.publisherId);
            });
    }

    /**
     * Start sending the statuses
     *
     */
    privateStartSendingStatus() {
        const self = this;
        if (self.statusInterval) {
            return;
        }
        if (self.sendStatusIntervalOriginal) {
            self.sendStatusInterval = self.sendStatusIntervalOriginal;
        }
        self.privateStopMediaStream(self.micStatusStream);
        self.privateGetUserMedia('getMicrophoneLevel', { audio: true, video: false }, false, (error, stream) => {
            self.micStatusStream = stream;
            if (error) {
                console.warn(error);
                return;
            }
            self.microphone.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            self.microphone.analyser = self.microphone.audioCtx.createAnalyser();
            try {
                self.microphone.microphone = self.microphone.audioCtx.createMediaStreamSource(self.micStatusStream);
            } catch (error) {
                self.privateStopMicrophone();
                console.warn('Can`t get the microphone', error);
                return;
            }
            self.microphone.analyser.smoothingTimeConstant = 0;
            self.microphone.analyser.fftSize = 32; //1024;
            self.microphone.microphone.connect(self.microphone.analyser);

            let previousStatus, currentVolumeLevel;
            if (self.statusInterval) {
                clearInterval(self.statusInterval);
            }
            self.statusInterval = setInterval(() => {
                if (!self.microphone.analyser || self.isMute) {
                    currentVolumeLevel = 0;
                    clearInterval(self.statusInterval);
                    return;
                }
                const array = new Uint8Array(1);
                self.microphone.analyser.getByteFrequencyData(array);
                const volume = array[0];

                switch (true) {
                    case volume <= self.micLevels[1]:
                        currentVolumeLevel = 1;
                        break;
                    case volume > self.micLevels[1] && volume <= self.micLevels[2]:
                        currentVolumeLevel = 2;
                        break;
                    case volume > self.micLevels[2] && volume <= self.micLevels[3]:
                        currentVolumeLevel = 3;
                        break;
                    case volume > self.micLevels[3] && volume <= self.micLevels[4]:
                        currentVolumeLevel = 4;
                        break;
                    default:
                        currentVolumeLevel = 5;
                }
                self.localMicLevel = currentVolumeLevel;
                if (self.callbacks.onMicLevelUpdate) {
                    self.callbacks.onMicLevelUpdate(null, self.localMicLevel);
                }
                if (self.localMicLevel > 1) {
                    self.lastSpeakingTime = Date.now();
                    self.imSpeaking = true;
                } else {
                    if (Date.now() - self.lastSpeakingTime > 3000) {
                        self.imSpeaking = false;
                    }
                }
                // Check if the data was changed
                const status = {
                    ...self.customStatus,
                    mic: currentVolumeLevel,
                    audio: self.sfuAudio,
                    video: self.sfuVideo,
                    workspaceId: self.workspaceId,
                    userId: self.userId,
                };
                if (JSON.stringify(previousStatus) !== JSON.stringify(status)) {
                    previousStatus = status;
                    if (self.socketStatus) {
                        self.socketStatus.emit('/v1/status/mic', status);
                    }
                }
            }, self.sendStatusInterval);
        });
    }

    privateStopMicrophone() {
        const self = this;
        if (self.microphone.audioCtx) {
            self.microphone.audioCtx.close();
        }
        self.microphone = {
            analyser: null,
            audioCtx: null,
            microphone: null,
        };
    }

    /**
     * stop sending the statuses
     *
     */
    privateStopSendingStatus() {
        const self = this;
        clearInterval(self.statusInterval);
        self.statusInterval = null;
        if (self.sendStatusInterval < 1000) {
            self.sendStatusIntervalOriginal = self.sendStatusInterval;
        }
        self.sendStatusInterval = 365 * 86400 * 1000;
        self.privateStopMediaStream(self.micStatusStream);
        self.privateStopMicrophone();
        self.micStatusStream = null;
        const status = {
            ...self.customStatus,
            mic: 0,
            audio: self.sfuAudio,
            video: self.sfuVideo,
            workspaceId: self.workspaceId,
        };
        self.emit('/v1/user/status', status);
    }

    /**
     * Get local mic level
     *
     */
    privateGetLocalMicLevel() {
        const self = this;
        return self.localMicLevel;
    }

    /**
     * Get device list
     *
     */
    privateGetDevices() {
        const self = this;
        self.devices.audio = [];
        self.devices.video = [];
        navigator.mediaDevices
            .enumerateDevices()
            .then((devices) => {
                devices.forEach((device) => {
                    switch (device.kind) {
                        case 'audioinput':
                            self.devices.audio.push(device);
                            break;
                        case 'videoinput':
                            self.devices.video.push(device);
                            break;
                        default:
                            break;
                    }
                });
                if (self.callbacks.onDeviceListChanged) {
                    self.callbacks.onDeviceListChanged(null, self.devices);
                }
            })
            .catch((error) => {
                console.warn(error);
                console.error('Can`t get the device list');
            });
    }

    /**
     * Stop media stream
     *
     * @param stream
     */
    privateStopMediaStream(stream) {
        if (!stream) {
            return;
        }
        stream.getTracks().forEach((track) => {
            track.stop();
            stream.removeTrack(track);
        });
    }

    /**
     * Replace the track in the media stream
     *
     * @param stream
     * @param key
     */
    privateReplaceTrack(stream, key, videoOnly, callback) {
        const self = this;
        if (!self.connections[key] || !stream) {
            return callback('No connection or stream');
        }
        callback = callback ? callback : () => {};
        let deep = 0;
        stream.getTracks().forEach((track) => {
            if (videoOnly && track.kind !== 'video') {
                return;
            }
            deep++;
            self.connections[key].getSenders().map((sender) => {
                if (!sender || !sender.track || sender.track.kind !== track.kind) {
                    return callback('No video sender found');
                }
                const oldTrack = sender.track;
                sender.replaceTrack(track);
                oldTrack.stop();
                return callback();
            });
        });
    }

    /**
     * Create and return a fake video track for camera releasing
     *
     *
     */
    privateStartFakeVideo() {
        const self = this;
        if (self.fakeVideo.track) {
            return self.fakeVideo.track;
        }
        self.fakeVideo.canvas = document.createElement('canvas');
        self.fakeVideo.canvas.style.position = 'fixed';
        self.fakeVideo.canvas.style.top = 0;
        self.fakeVideo.canvas.style.left = 0;
        self.fakeVideo.canvas.style.width = '2px';
        self.fakeVideo.canvas.style.height = '2px';
        self.fakeVideo.canvas.width = 300;
        self.fakeVideo.canvas.height = 300;
        document.body.appendChild(self.fakeVideo.canvas);
        self.fakeVideo.context = self.fakeVideo.canvas.getContext('2d', {
            alpha: false,
            desynchronized: true,
            antialias: false,
            powerPreference: 'low-power',
            preserveDrawingBuffer: true,
        });
        self.fakeVideo.interval = setInterval(() => {
            if (!self.fakeVideo.context) {
                return clearInterval(self.fakeVideo.interval);
            }
            self.fakeVideo.context.beginPath();
            const color = Math.round(Math.random()) ? '#FBFBFB' : '#FFFFFF'; // '#0505005' : '#0000000';
            self.fakeVideo.context.rect(0, 0, 10, 10);
            self.fakeVideo.context.fillStyle = color;
            self.fakeVideo.context.fill();
        }, 1000);

        self.fakeVideo.context.rect(0, 0, 300, 300);
        self.fakeVideo.context.fillStyle = '#FFFFFF';
        self.fakeVideo.context.fill();

        self.fakeVideo.stream = self.fakeVideo.canvas.captureStream();
        self.fakeVideo.track = self.fakeVideo.stream.getVideoTracks()[0];
        self.fakeVideo.track.enabled = true;
        return self.fakeVideo.track;
    }

    /**
     * Create and return a fake video track for camera releasing
     *
     *
     */
    privateStopFakeVideo() {
        const self = this;
        if (!self.fakeVideo.track) {
            return;
        }
        self.fakeVideo.track.stop();
        self.fakeVideo.track = null;
        self.privateStopMediaStream(self.fakeVideo.stream);
        self.fakeVideo.stream = null;
        self.fakeVideo.canvas.remove();
        self.fakeVideo.canvas = null;
        self.fakeVideo.context = null;
    }

    /**
     * Wrapper for socket.emit()
     *
     * @param {string} command
     * @param {any}    data
     */
    emit(command, data) {
        const self = this;
        try {
            self.socket.emit(command, data);
        } catch (e) {
            console.warn(`Can't send message to the closed socket ${command}`, e);
        }
    }

    /**
     * Log socket output
     *
     * @param command
     * @param data
     */
    logItSocket(command, data) {
        const self = this;
        if (self.debug) {
            console.log(command, data);
        }
    }

    /**
     * Connect to signaling server and itinialize events
     *
     */
    privateConnectSocket() {
        const self = this;
        if (self.socket && self.socket.connected) {
            return false;
        }

        let aliveInterval = null;

        // Connection and Hello
        self.socket = new io(self.socketUrl, {
            secure: true,
            reconnection: true,
            // reconnectionDelay: 1000,
            // reconnectionDelayMax: 2000,
            // timeout: 6000,
            // transports: ['websocket', 'polling', 'htmlfile', 'jsonp-polling'],
        });

        self.socket.on('connect', (socket) => {
            self.logItSocket('Socket connected');
            aliveInterval = setInterval(() => {
                if (self.socket && self.socket.connected) {
                    self.emit('/v1/alive', {});
                }
            }, 2000);
        });
        self.socket.on('connect_error', (error) => {
            clearInterval(aliveInterval);
            if (self.isConnected()) {
                try {
                    self.callbacks.onDisconnected();
                } catch (e) {}
                self.logItSocket('Connection error', error);
            }
        });
        self.socket.on('disconnect', (error) => {
            clearInterval(aliveInterval);
            try {
                self.callbacks.onDisconnected();
            } catch (e) {}
            self.privateLeaveRoom(self.workspaceId);
            if (self.callId) {
                self.privateLeaveRoom(self.workspaceId, self.callId);
            }
            if (self.spaceId) {
                self.privateLeaveRoom(self.workspaceId, null, self.spaceId);
            }
            self.logItSocket('Disconnected', error);
        });
        self.socket.on('reconnect', () => {
            console.log('Reconnected');
            const data = { email: self.email, securitySeed: self.securitySeed, workspaceId: self.workspaceId };
            self.emit('/v1/user/login', data);
        });
        self.socket.on('reconnect_attempt', () => {
            console.log('Reconnecting...');
        });

        // Ready, steady, go...
        self.socket.on('/v1/ready', (response) => {
            self.callbacks.onConnected();
            if (self.callbacks.onSwitchServer) {
                self.callbacks.onSwitchServer();
            }
            console.log('Connection is ready to use');
        });

        // Login...
        self.socket.on('/v1/user/login', (response) => {
            self.socketOnLogin(response);
            self.logItSocket('/v1/user/login', response);
        });

        // User list updated...
        self.socket.on('/v1/user/listOnline', (response) => {
            self.callbacks.onUserListUpdated(response.error, response.users, response.spaces);
            self.logItSocket('/v1/user/listOnline', response);
        });

        // User data updated...
        self.socket.on('/v1/user/dataUpdated', (response) => {
            self.callbacks.onUserDataUpdated(response.error, response.userId, response.data);
            self.logItSocket('/v1/user/dataUpdated', response);
        });

        // User status updated...
        self.socket.on('/v1/user/statusUpdated', (response) => {
            self.callbacks.onUserStatusUpdated(response.error, response.userId, response.status);
            // self.logItSocket('/v1/user/statusUpdated', response);
        });

        // Start new call
        self.socket.on('/v1/call/start', (response) => {
            self.socketOnCallStart(response);
            self.logItSocket('/v1/call/start', response);
        });

        // Incoming call
        self.socket.on('/v1/call/incoming', (response) => {
            self.socketOnCallIncoming(response);
            self.logItSocket('/v1/call/incoming', response);
        });

        // Call was joined - for the accepted user
        self.socket.on('/v1/call/join', (response) => {
            self.socketOnCallJoin(response);
            self.logItSocket('/v1/call/join', response);
        });

        // Call was joined - for collutors
        self.socket.on('/v1/call/joined', (response) => {
            self.socketOnCallJoined(response);
            self.logItSocket('/v1/call/joined', response);
        });

        // Call was rejected
        self.socket.on('/v1/call/reject', (response) => {
            self.socketOnCallReject(response);
            self.logItSocket('/v1/call/reject', response);
        });

        // Call was rejected
        self.socket.on('/v1/call/rejected', (response) => {
            self.socketOnCallRejected(response);
            self.logItSocket('/v1/call/rejected', response);
        });

        // Call was leaved
        self.socket.on('/v1/call/leaved', (response) => {
            if (self.callId === response.callId) {
                delete self.usersInCall[response.userId];
            }
            self.logItSocket('/v1/call/leaved', response);
        });

        // Call was finished
        self.socket.on('/v1/call/hangup', (response) => {
            self.socketOnHangup(response);
            self.logItSocket('/v1/call/hangup', response);
        });

        // User joined to the space
        self.socket.on('/v1/space/join', (response) => {
            self.socketOnSpaceJoin(response);
            self.logItSocket('/v1/space/join', response);
        });

        // Incoming space request
        self.socket.on('/v1/space/incoming', (response) => {
            self.socketOnSpaceIncoming(response);
            self.logItSocket('/v1/space/incoming', response);
        });

        // User leaved the space
        self.socket.on('/v1/space/leave', (response) => {
            self.socketOnSpaceLeft(response);
            self.logItSocket('/v1/space/leave', response);
        });

        // User list
        self.socket.on('/v1/space/users', (response) => {
            self.socketOnSpaceUsers(response);
            self.logItSocket('/v1/space/users', response);
        });

        // General error
        self.socket.on('/v1/error', (response) => {
            self.logItSocket('/v1/call/error', response);
        });

        // New SFU call started
        self.socket.on('/v1/sfu/start', (response) => {
            self.socketOnJoinRoom(response);
            self.logItSocket('/v1/sfu/start', response);
        });

        // New SFU call started
        self.socket.on('/v1/sfu/connected', (response) => {
            self.socketOnSfuConnected(response);
            self.logItSocket('/v1/sfu/connected', response);
        });

        // New SFU call started
        self.socket.on('/v1/sfu/screen-start', (response) => {
            self.socketOnScreenShare(response);
            self.logItSocket('/v1/sfu/screen-start', response);
        });

        // Publisher list updated
        self.socket.on('/v1/sfu/publishers', (response) => {
            self.socketOnPublishers(response);
            self.logItSocket('/v1/sfu/publishers', response);
        });

        // Watch publisher
        self.socket.on('/v1/sfu/publisher-watch', (response) => {
            self.socketOnPublisherWatch(response);
            self.logItSocket('/v1/sfu/publisher-watch', response);
        });

        // Stop watching publisher
        self.socket.on('/v1/sfu/publisher-unwatch', (response) => {
            self.logItSocket('/v1/sfu/publisher-unwatch', response);
        });

        // Left the room
        self.socket.on('/v1/sfu/leave', (response) => {
            self.logItSocket('/v1/sfu/leave', response);
        });

        // Media of the user was toggled
        self.socket.on('/v1/sfu/toggle-media', (response) => {
            if (response.userId === self.userId) {
                // continue;
            }
            self.callbacks.onMediaToggled(response.type, response.callId, response.userId, response.audio, response.video);
            self.logItSocket('/v1/sfu/toggle-media', response);
        });
    }

    /**
     * Connect to signaling server and itinialize events
     *
     */
    privateConnectStatus() {
        const self = this;
        if (self.socketStatus && self.socketStatus.connected) {
            return false;
        }
        let aliveInterval = null;
        // Connection and Hello
        self.socketStatus = new io(self.statusUrl, {
            secure: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 2000,
            timeout: 6000,
        });

        self.socketStatus.on('connect', (socket) => {
            self.logItSocket('Status socket connected');
            if (self.workspaceId) {
                self.socketStatus.emit('/v1/status/join', { workspaceId: self.workspaceId });
            }
            aliveInterval = setInterval(() => {
                self.socketStatus.emit('/v1/alive', {});
            }, 2000);
        });
        self.socketStatus.on('connect_error', (error) => {
            clearInterval(aliveInterval);
        });
        self.socketStatus.on('disconnect', (error) => {
            clearInterval(aliveInterval);
            self.logItSocket('Status disconnected', error);
        });

        self.socketStatus.on('/v1/status', (response) => {
            self.callbacks.onUserStatusUpdated(response.error, response.userId, { status: response.cameraStatus, mic: response.mic });
        });
    }
}

export const core = new WebRTCClass();

core.load();