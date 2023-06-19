'use strict';
import { codeUserProfile } from './components.js';

class UI {
    constructor() {
        const self = this;
        // Authorization token - used for page reload
        self.token = localStorage.getItem('token');
        // User data
        self.userData = {
            id: null,
        };
        self.backend = null;
        // workspace ID
        self.workspaceId = 28; // '123e4567-e89b-12d3-a456-426655440000';
        // User ID
        self.userId = null;
        //List of users data
        self.users = {};
        // List of public spaces
        self.publicSpaces = {};
        // Call ID - internal identifier
        self.callId = null;
        // Space ID - internal identifier
        self.spaceId = null;
        // Test users
        self.testUsers = {
            user1: { login: 'user1@clouwood.com', token: 'f9b26b56-90a0-4698-bb91-bdd9c50c49ac' },
            user2: { login: 'user2@clouwood.com', token: '2020d155-357d-4741-a677-ce2f446e8f3d' },
        };
        for (let i = 3; i <= 20; i++) {
            self.testUsers[`user${i}`] = { login: `user${i}@clouwood.com`, token: '10411e1e-2ce7-4502-8fcd-6a947a8e850f' };
        }
        // If mic in the dashboard muted?
        self.dashboardMuted = true;
        // Actual mode
        self.mode = 'in';
        // Maximum number of user in the call
        self.maxUsersInCall = 6;
        // Example of the custom data in status message
        // WebRTC.core.setCustomStatus({ customField: 1 });
        self.incomingCall = {};
        self.outgoingCall = {};
        // List of users, existing in the call
        self.usersInCall = {};

        self.audio = true;
        self.video = true;

        switch (document.location.hostname) {
            case 'devsignal.nearlylabs.com':
                document.querySelector('.backend').selectedIndex = 0;
                break;
            case 'testsignal.nearlylabs.com':
                document.querySelector('.backend').selectedIndex = 1;
                break;
        }
        self.bindEvents();

        /**
         * Socket connection to the signaling server is ready
         *
         */
        WebRTC.core.onConnected(() => {
            // Auth button event
            document.querySelector('.btn.autentification').addEventListener('click', () => this.hideLoginFields());
            document.querySelector('.loader').classList.add('hide');
            document.querySelector('.wrapper').classList.remove('hide');
        });

        /**
         * Media of another user in the call / space was toggled
         *
         */
        WebRTC.core.onMediaToggled((type, callId, userId, audio, video) => {
            console.log(`Media in ${type} ${callId} of user ${userId} is changed to: audio: ${!!audio}, video: ${!!video}`);
        });

        /**
         *  Fake users for testing purposes
         *
         */
        document.getElementById('fake-login-users').addEventListener('change', (e) => {
            const selectedValue = e.srcElement.value;
            if (!selectedValue) {
                return;
            }
            document.querySelector('input[name="email"]').value = self.testUsers[selectedValue].login;
            document.querySelector('input[name="securitySeed"]').value = self.testUsers[selectedValue].token;
        });

        /**
         * Choose the signaling server to use
         *
         */
        document.querySelector('.backend').addEventListener('change', (el) => {
            if (el.currentTarget.value !== self.backend) {
                switch (el.currentTarget.value) {
                    case 'dev':
                        self.socketUrl = 'https://devsignal.nearlylabs.com:8890/';
                        break;
                    case 'test':
                        self.socketUrl = 'https://testsignal.nearlylabs.com:8890/';
                        break;
                    case 'prod':
                        self.socketUrl = 'https://signal.nearlylabs.com:443/';
                        break;
                }
                // Switch between signaling servers
                WebRTC.core.switchServer(self.socketUrl, () => {
                    console.log(`Server is switched to ${self.socketUrl}`);
                });
            }
        });
        // Automatically connect to the selected signaling server on page load
        document.querySelector('.backend').dispatchEvent(new Event('change'));

        /**
         * Change the connection mode - In | No video | Out
         *
         */
        document.querySelector('.mode').addEventListener('change', (el) => {
            if (!WebRTC.core.userId) {
                return;
            }
            if (el.currentTarget.value !== self.mode) {
                const newMode = el.currentTarget.value;
                const oldMode = self.mode;
                console.log(`Changing state from ${oldMode} to ${newMode}`);
                switch (oldMode) {
                    case 'novideo':
                        switch (newMode) {
                            case 'out':
                                // Leave the workspace
                                WebRTC.core.leaveWorkspace(this.workspaceId);
                                // Send the updated status to the signaling server - it will be
                                // broadcased to other users within the workspace
                                WebRTC.core.setCustomStatus({
                                    cameraStatus: 'Out',
                                    micMuted: true,
                                });
                                // Disconnect from the signaling server
                                WebRTC.core.disconnect();
                                break;
                            case 'in':
                                // Send the updated status to the signaling server - it will be
                                // broadcased to other users within the workspace
                                WebRTC.core.setCustomStatus({
                                    cameraStatus: 'In',
                                    micMuted: true,
                                });
                                // User is in the call? Turn on the video
                                if (self.callId) {
                                    WebRTC.core.callToggleMedia('call', self.callId, true, true);
                                }
                                // User is in the space? Turn on the video
                                if (self.spaceId) {
                                    WebRTC.core.callToggleMedia('space', self.spaceId, true, true);
                                }
                                // Turn on the video for the workspace
                                WebRTC.core.callToggleMedia('workspace', callOrSpaceId, false, true);
                                break;
                        }
                        break;
                    case 'in':
                        switch (newMode) {
                            case 'out':
                                // Leave the workspace
                                WebRTC.core.leaveWorkspace(this.workspaceId);
                                // Send the updated status to the signaling server - it will be
                                // broadcased to other users within the workspace
                                WebRTC.core.setCustomStatus({
                                    cameraStatus: 'Out',
                                    micMuted: true,
                                });
                                // Disconnect from the signaling server
                                WebRTC.core.disconnect();
                                break;
                            case 'novideo':
                                // Send the updated status to the signaling server
                                WebRTC.core.setCustomStatus({
                                    cameraStatus: 'No Video',
                                    micMuted: true,
                                });
                                // User is in the call? Turn off the video
                                if (self.callId) {
                                    WebRTC.core.callToggleMedia('call', self.callId, self.audio, false);
                                }
                                // User is in the space? Turn off the video
                                if (self.spaceId) {
                                    WebRTC.core.callToggleMedia('space', self.spaceId, self.audio, false);
                                }
                                // Turn off the video for the workspace
                                WebRTC.core.callToggleMedia('workspace', callOrSpaceId, false, false);
                                break;
                        }
                        break;
                    case 'out':
                        switch (newMode) {
                            case 'in':
                                // Connect to the signaling server
                                WebRTC.core.connect(() => {
                                    // Join the workspace
                                    WebRTC.core.joinWorkspace(self.workspaceId, true);
                                    // Send the updated status to the signaling server
                                    WebRTC.core.setCustomStatus({
                                        cameraStatus: 'In',
                                        micMuted: true,
                                    });
                                });
                                break;
                            case 'novideo':
                                // Connect to the signaling server
                                WebRTC.core.connect(() => {
                                    // Join the workspace
                                    WebRTC.core.joinWorkspace(self.workspaceId, false);
                                    // Send the updated status to the signaling server
                                    WebRTC.core.setCustomStatus({
                                        cameraStatus: 'No Video',
                                        micMuted: true,
                                    });
                                });
                                break;
                        }
                        break;
                }
                self.mode = newMode;
            }
        });
    }

    /**
     * Init user's interface
     *
     */
    init() {
        const self = this;
        // Prepare interface
        document.querySelector('.entry-field').classList.add('hide-content');
        document.querySelector('.users-data').classList.add('show-content');
    }

    bindEvents() {
        const self = this;
        /**
         *  Fired when the call user list is updated - DEPRECATED !!!
         *
         *  @param callback
         */
        // WebRTC.core.onCallUsersUpdated((err, callId, data) => {
        // console.log(data);
        //});

        /**
         *  Fired when any user's data is updated
         *
         *  @param callback
         */
        WebRTC.core.onUserDataUpdated((err, userId, data) => {
            if (err) {
                return console.warn('User`s data update failed: ' + err);
            }
            const item = document.getElementById(`user-${userId}`);
            if (item.querySelector('.user-status')) {
                item.querySelector('.user-status').className = `user-status ${data.status}`;
            }
        });

        /**
         *  Fired when any user's status is updated
         *
         *  @param callback
         */
        WebRTC.core.onUserStatusUpdated((err, userId, status) => {
            if (err) {
                return console.warn('User`s status update failed: ' + err);
            }
            const item = document.getElementById(`user-${userId}`);
            if (!item) {
                return;
            }
            if (item.querySelector('.user-status')) {
                item.querySelector('.user-status').className = `user-status ${status.status}`;
            }
            item.querySelector('.signal').className = `signal volume${status.mic}`;
        });

        /**
         *  Fired when user list is updated
         *
         *  @param callback
         */
        WebRTC.core.onUserListUpdated((err, users, spaces) => {
            if (err) {
                return console.warn('User list update failed: ' + err);
            }
            // // Display user in the interface
            if (!users) {
                return;
            }
            // Draw all users in the workspace
            users.forEach((user) => {
                // const { id, ...restData } = user;
                const container = document.querySelector('.item-list');
                if (self.users[user.id]) {
                    if (self.users[user.id].status !== user.status) {
                        const item = container.getElementById(`user-${user.id}`);
                        item.getElementsByClassName('user-status').className = `user-status ${user.status}`;
                    }
                } else {
                    const usersHTMLCode = document.createElement('div');
                    usersHTMLCode.className = 'item user-item';
                    usersHTMLCode.id = `user-${user.id}`;
                    usersHTMLCode.innerHTML = codeUserProfile(user);
                    const link1 = document.createElement('a');
                    // Bind starting the call
                    usersHTMLCode.addEventListener('click', () => {
                        // Call is possible only in the workspace, not public space
                        if (!usersHTMLCode.classList.contains('in-public-space')) {
                            this.callStart(user.id);
                        }
                    });
                    container.append(usersHTMLCode);
                }
                self.users[user.id] = user;
            });
            // Draw all spaces
            spaces.forEach((space) => {
                const container = document.querySelector('.space-list');
                if (!self.publicSpaces[space.id]) {
                    const item = document.createElement('div');
                    item.className = 'item space-item';
                    item.id = `space-${space.id}`;
                    const header = document.createElement('h3');
                    header.innerText = `${space.name}   `;
                    item.append(header);

                    const enterLink = document.createElement('a');
                    enterLink.href = '#';
                    enterLink.id = `spaceJoin${space.id}`;
                    enterLink.innerText = 'Go to this space';
                    // Bind joining to the pulbic space
                    enterLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        const startWithAudio = true;
                        const startWithVideo = true;
                        WebRTC.core.joinSpace(space.id, startWithAudio, startWithVideo, (spaceId) => {
                            self.spaceId = space.id;
                            document.querySelector('.wrapper').classList.add('hide');
                            document.querySelector('.conference-container').classList.remove('hide');
                            document.querySelector('.conference-buttons').classList.remove('hide');
                            document.querySelector('.conference-buttons .accept-call').classList.add('hide');
                            document.querySelector('.conference-buttons .accept-join').classList.add('hide');
                            document.querySelector('.conference-buttons .reject-call').classList.add('hide');
                            document.querySelector('.conference-buttons .hangup-call').classList.remove('hide');
                            document.querySelector('.conference-buttons .user-limit-reached').classList.add('hide');
                            self.fillCallInvites(users, null, space.id);
                        });
                    });
                    item.append(enterLink);

                    const users = document.createElement('div');
                    users.className = 'users';
                    item.append(users);
                    container.append(item);
                }
                self.publicSpaces[space.id] = space;
            });
        });

        /**
         *  Add video for user to workspace
         *
         *  @param callback
         *         - err - error message
         *         - userId - ID of the user
         *         - audio - if user's audio is enabled, not used for now
         *         - video - if user's video is enabled, not used for now
         *         - remoteStream - MediaStream object with the remote user's video
         */
        WebRTC.core.onWorkspaceUserAdded((err, userId, audio, video, remoteStream) => {
            const videoContainer = document.getElementById(`preview-${userId}`);
            if (!videoContainer) {
                return console.error('Publisher for non-existing user received');
            }
            videoContainer.srcObject = remoteStream;
        });

        /**
         *  Remove video for remote user from the workspace
         *
         *  @param callback
         *         - err - error message
         *         - userId - ID of the user
         */
        WebRTC.core.onWorkspaceUserRemoved((err, userId) => {
            const videoContainer = document.getElementById(`preview-${userId}`);
            if (videoContainer) {
                videoContainer.srcObject = null;
            }
            if (document.getElementById(`#item-${userId}`)) {
                document.querySelector('.users-data .item-list').append(document.getElementById(`#item-${userId}`));
            }
        });

        /**
         *  New media for the user is ready - for both call and space
         *
         *  @param callback
         *         - err - error message
         *         - workspaceId - ID of the workspace
         *         - callId - ID of the call
         *         - userId - ID of the user
         *         - audio - if user's audio is enabled, not used for now
         *         - video - if user's video is enabled, not used for now
         *         - remoteStream - MediaStream object with the remote user's video
         *         - usersInCall - list of users in the call, including their states ("in" | "pending")
         *         - mediaType - 'full' or 'preview', indicating if it's about the full size or preview video
         */
        WebRTC.core.onCallUserAdded((err, callId, userId, audio, video, remoteStream, usersInCall, mediaType) => {
            if (usersInCall[userId] && usersInCall[userId].status === 'in' && mediaType === 'preview') {
                // User is in the call and the video type is preview - nothing to do
                return;
            }
            // Add user's video
            self.addUserToCall(err, callId, userId, audio, video, remoteStream, usersInCall, mediaType);
        });

        /**
         *  Remove video for remote user from the call / space
         *
         *  @param callback
         *         - err - error message
         *         - callId - ID of the call
         *         - userId - ID of the user
         *         - usersInCall - list of users in the call, including their states ("in" | "pending")
         */
        WebRTC.core.onCallUserRemoved((err, callId, userId, usersInCall) => {
            if (document.getElementById(`video-box-${userId}`)) {
                document.getElementById(`video-box-${userId}`).remove();
            }
            if ((self.callId && Object.values(usersInCall).length === 1) || (!self.callId && !Object.values(usersInCall).length)) {
                document.querySelector('.conference-container').classList.add('hide');
                const callId = self.incomingCall && self.incomingCall.id ? self.incomingCall.id : self.callId;
                self.incomingCall = {};
                self.callId = null;
                if (callId) {
                    WebRTC.core.hangupCall(callId);
                }
            }
        });

        /**
         *  Add video for remote user to workspace - DEPRECATED
         *
         *  @param callback
         *         - err - error message
         *         - spaceId - ID of the space
         *         - userId - ID of the user
         *         - audio - if user's audio is enabled, not used for now
         *         - video - if user's video is enabled, not used for now
         *         - remoteStream - MediaStream object with the remote user's video
         */
        // WebRTC.core.onSpaceUserAdded((err, spaceId, userId, audio, video) => {
        /*
            const videoContainer = document.getElementById(`video-box-${userId}`);
            if (videoContainer) {
                document.querySelector('.users-data .item-list').appendChild(videoContainer);
                videoContainer.getElementsByTagName('video').srcObject = remoteStream;
            }
            */
        // });

        /**
         *  Remove video for remote user from the workspace - DEPRECATED
         *
         *  @param callback
         *         - err - error message
         *         - spaceId - ID of the call
         *         - userId - ID of the user
         */
        // WebRTC.core.onSpaceUserRemoved((err, spaceId, userId, remoteStream) => {
        /*
            const video = document.getElementById(`video-box-${userId}`);
            if (video) {
                document.querySelector('.users-data .item-list').appendChild(video);
                video.srcObject = remoteStream;
            }
            */
        // });

        /**
         *  List of users within the public space is updated
         *  Used to draw the list of preview videos in the workspace screen
         *
         *  @param callback
         *         - err - error message
         *         - spaceId - ID of the call
         *         - userId - ID of the user
         *         - list of streams
         */
        WebRTC.core.onSpaceUsers((err, spaceId, users, streams) => {
            document.querySelectorAll(`#space-${spaceId} .users .item`).forEach((item) => item.classList.add('to-remove'));
            users &&
                Object.values(users).forEach((user) => {
                    document.getElementById(`user-${user.id}`).classList.remove('to-remove');
                    const video = document.querySelector(`.users-data .item-list #user-${user.id}`);
                    // If user isn't in the workspace - skip him. For example, if user is in the public space
                    if (!video) {
                        return;
                    }
                    if (streams[`space:${spaceId}`] && streams[`space:${spaceId}`][user.id]) {
                        document.getElementById(`user-${user.id}`).srcObject = streams[`space:${spaceId}`][user.id];
                    }
                    document.getElementById(`user-${user.id}`).classList.add('in-public-space');
                    document.querySelector(`#space-${spaceId} .users`).append(document.getElementById(`user-${user.id}`));
                });
            document.querySelectorAll(`#space-${spaceId} .users .item.to-remove`).forEach((item) => {
                if (!item) {
                    return;
                }
                const userId = item.id.replace('user-', '');
                document.getElementById(`user-${userId}`).classList.remove('in-public-space');
                document.getElementById(`user-${userId}`).srcObject = streams['workspace'][userId];
                document.querySelector('.users-data .item-list').append(item);
            });
        });

        WebRTC.core.onSpaceLeft((err, spaceId) => {
            document.querySelector('.wrapper').classList.remove('hide');
            document.querySelector('.conference-container').classList.add('hide');
            document.querySelector('.conference-buttons').classList.add('show');
            document.querySelector('.incomming-knock, .outgoing-knock').classList.add('hide');
            document.querySelector('.screen-buttons').classList.add('hide-content');
        });

        /**
         *  Add screen for remote user
         *
         *  @param callback
         *         - err - error message
         *         - workspaceId - ID of the workspace
         *         - userId - ID of the user
         *         - groupId - ID of the group
         *         - remoteStream - MediaStream object with the remote user's video
         */
        WebRTC.core.onScreenAdded((err, callId, userId, remoteStream) => {
            let videoContainer = document.getElementById(`screen-box-${userId}`);
            if (videoContainer) {
                videoContainer.getElementsByTagName('video').srcObject = remoteStream;
                return;
            }
            // Create the screen container
            videoContainer = document.createElement('DIV');
            videoContainer.id = `screen-box-${userId}`;
            videoContainer.className = `screen-box-${userId}`;
            // Create the user name element
            const nameElement = document.createElement('SPAN');
            nameElement.innerHTML = self.users[userId] ? self.users[userId].short_name : '';
            videoContainer.appendChild(nameElement);
            // Create the video element
            const videoElement = document.createElement('VIDEO');
            videoElement.autoplay = true;
            videoElement.playsinline = true;
            videoElement.muted = true;
            videoElement.className = 'screen';
            videoElement.srcObject = remoteStream;
            videoContainer.appendChild(videoElement);
            document.querySelector('.collutors').appendChild(videoContainer);

            document.querySelector('.collutors').classList.add('with-screen-sharing');
        });

        /**
         *  Remove video for remote SFU user
         *
         *  @param callback
         */
        WebRTC.core.onScreenRemoved((err, callId, userId) => {
            if (document.getElementById(`screen-box-${userId}`)) {
                document.getElementById(`screen-box-${userId}`).remove();
            }
            document.querySelector('.collutors').classList.remove('with-screen-sharing');
        });

        /**
         * Event on local video ready
         *
         * @param callback
         */
        WebRTC.core.onSelfie((err, localStream) => {
            document.getElementById('ownVideo').srcObject = localStream;
        });

        /**
         * Event on stopping the local video
         *
         * @param callback
         */
        WebRTC.core.onSelfieStop((err) => {
            document.getElementById('ownVideo').srcObject = null;
        });

        /**
         * Event on local video ready
         *
         * @param callback
         */
        WebRTC.core.onSelfieFull((err, localStream) => {
            document.querySelector('.selfie').srcObject = localStream;
        });

        /**
         * Event on stopping the local video
         *
         * @param callback
         */
        WebRTC.core.onSelfieFullStop((err) => {
            document.querySelector('.selfie').srcObject = null;
        });

        /**
         * Event on local screen share is ready
         *
         * @param callback
         */
        WebRTC.core.onScreen((err, workspaceId, localStream) => {
            // document.getElementById('ownScreen').srcObject = localStream;
        });

        /**
         * Event on stopping the screen sharing
         *
         * @param callback
         */
        WebRTC.core.onScreenStop((err, workspaceId, callId) => {
            // document.getElementById('ownScreen').srcObject = null;
        });

        /**
         * Handle incoming call
         *
         */
        WebRTC.core.onCallIncoming((err, callId, caller, users, audio, video) => {
            if (self.incomingCall && self.incomingCall.id) {
                WebRTC.core.rejectCall(self.incomingCall.type, self.incomingCall.id, self.incomingCall.caller.id);
                self.incomingCall = {};
            }
            if (self.outgoingCall && self.outgoingCall.id) {
                WebRTC.core.hangupCall(self.outgoingCall.id);
                self.outgoingCall = {};
                self.callId = null;
            }
            self.incomingCall = { type: 'call', id: callId, caller, audio, video };
            if (!caller || !caller.id) {
                console.warn('Incoming call from nobody');
                return;
            }
            if (!self.users[caller.id]) {
                console.warn(`Incoming call from unknown user: ${caller.id}`);
                return;
            }
            document.querySelector('.incomming-knock').innerHTML = `${self.users[caller.id].short_name} is knocking`;
            document.querySelector('.incomming-knock').classList.remove('hide');
            document.querySelector('.wrapper').classList.add('hide');
            document.querySelector('.conference-container').classList.remove('hide');
            document.querySelector('.conference-buttons').classList.add('show');
            if (users.length >= self.maxUsersInCall) {
                document.querySelector('.conference-buttons .accept-call').classList.add('hide');
                document.querySelector('.conference-buttons .accept-join').classList.add('hide');
                document.querySelector('.conference-buttons .user-limit-reached').classList.remove('hide');
            } else if (self.callId) {
                document.querySelector('.conference-buttons .accept-call').classList.add('hide');
                document.querySelector('.conference-buttons .accept-join').classList.remove('hide');
                document.querySelector('.conference-buttons .user-limit-reached').classList.add('hide');
            } else {
                document.querySelector('.conference-buttons .accept-call').classList.remove('hide');
                document.querySelector('.conference-buttons .accept-join').classList.add('hide');
                document.querySelector('.conference-buttons .user-limit-reached').classList.add('hide');
            }
            document.querySelector('.conference-buttons .reject-call').classList.remove('hide');
            document.querySelector('.conference-buttons .hangup-call').classList.add('hide');

            document.querySelector('.conference-container .other-users').innerHTML = 'Invite users: ';
            self.fillCallInvites(users, callId);
        });

        /**
         * Handle incoming invite to the public space
         *
         */
        WebRTC.core.onSpaceIncoming((err, spaceId, caller, users, audio, video) => {
            if (self.incomingCall && self.incomingCall.id) {
                WebRTC.core.rejectCall(self.incomingCall.id, self.incomingCall.id, self.incomingCall.caller.id);
                self.incomingCall = {};
            }
            if (self.outgoingCall && self.outgoingCall.id) {
                WebRTC.core.hangupCall(self.outgoingCall.id);
                self.outgoingCall = {};
                self.spaceId = null;
            }
            self.incomingCall = { type: 'space', id: spaceId, caller, audio, video };
            if (!caller || !caller.id) {
                console.warn('Incoming call from nobody');
                return;
            }
            if (!self.users[caller.id]) {
                console.warn(`Incoming call from unknown user: ${caller.id}`);
                return;
            }
            document.querySelector('.incomming-knock').innerHTML = `${
                self.users[caller.id].short_name
            } is inviting you to the public space`;
            document.querySelector('.incomming-knock').classList.remove('hide');
            document.querySelector('.wrapper').classList.add('hide');
            document.querySelector('.conference-container').classList.remove('hide');
            document.querySelector('.conference-buttons').classList.add('show');
            if (users.length >= self.maxUsersInCall) {
                document.querySelector('.conference-buttons .accept-call').classList.add('hide');
                document.querySelector('.conference-buttons .accept-join').classList.add('hide');
                document.querySelector('.conference-buttons .user-limit-reached').classList.remove('hide');
            } else if (self.spaceId) {
                document.querySelector('.conference-buttons .accept-call').classList.add('hide');
                document.querySelector('.conference-buttons .accept-join').classList.remove('hide');
                document.querySelector('.conference-buttons .user-limit-reached').classList.add('hide');
            } else {
                document.querySelector('.conference-buttons .accept-call').classList.remove('hide');
                document.querySelector('.conference-buttons .accept-join').classList.add('hide');
                document.querySelector('.conference-buttons .user-limit-reached').classList.add('hide');
            }
            document.querySelector('.conference-buttons .reject-call').classList.remove('hide');
            document.querySelector('.conference-buttons .hangup-call').classList.add('hide');

            document.querySelector('.conference-container .other-users').innerHTML = 'Invite users: ';
            self.fillCallInvites(users, null, spaceId);
        });

        /**
         * User joined to the call
         *
         */
        WebRTC.core.onCallJoined((err, callId, userId, audio, video, usersInCall) => {
            if (userId === self.userId) {
                return;
            }
            document.querySelector('.incomming-knock').classList.add('hide');
            document.querySelector('.outgoing-knock').classList.add('hide');
            document.querySelector('.screen-buttons').classList.remove('hide-content');
            const videoContainer = document.getElementById(`video-box-${userId}`);
            if (self.incomingCall && self.incomingCall.id && self.incomingCall.id === callId) {
                self.incomingCall = {};
            }
            if (self.outgoingCall && self.outgoingCall.id) {
                self.outgoingCall = {};
            }
        });

        /**
         * Call was rejected by another user - deprecated
         *
         */
        WebRTC.core.onCallRejected((err, callId, userId, callFinished) => {
            if (callFinished) {
                console.log('Call was rejected and it`s finished');
            } else {
                console.log('Call was rejected, but not finished - threre are other users in the call');
            }
            /*
            document.querySelector('.wrapper').classList.remove('hide');
            document.querySelector('.conference-container').classList.add('hide');
            document.querySelector('.conference-buttons').classList.add('show');
            document.querySelector('.incomming-knock, .outgoing-knock').classList.add('hide');
            document.querySelector('.screen-buttons').classList.add('hide');
            */
        });

        /**
         * On hangup
         *
         */
        WebRTC.core.onHangup((err, callId, collutorId) => {
            if (self.callId && callId !== self.callId && callId !== self.spaceId) {
                return;
            }
            if (self.incomingCall && self.incomingCall.id && self.incomingCall.id !== callId && self.incomingCall.id !== spaceId) {
                return;
            }
            document.querySelectorAll('.collutors > div').forEach((item) => item.remove());
            document.querySelector('.wrapper').classList.remove('hide');
            document.querySelector('.conference-container').classList.add('hide');
            document.querySelector('.conference-buttons').classList.add('show');
            document.querySelector('.incomming-knock, .outgoing-knock').classList.add('hide');
            document.querySelector('.screen-buttons').classList.add('hide-content');
        });

        WebRTC.core.onMediaReconnect((what) => {
            console.warn('Media reconnect', what);
        });

        WebRTC.core.onMediaReconnectFails((what) => {
            console.error('Media reconnect failed');
        });

        // Device list changed
        WebRTC.core.getDevices((err, devices) => {
            const audioSelector = document.querySelector('.device-sfu-audio');
            const videoSelector = document.querySelector('.device-sfu-video');
            audioSelector.innerHTML = '';
            videoSelector.innerHTML = '';

            let option = document.createElement('option');
            option.innerHTML = 'Select audio device';
            audioSelector.appendChild(option);

            option = document.createElement('option');
            option.innerHTML = 'Select video device';
            videoSelector.appendChild(option);

            devices.audio.forEach((device) => {
                option = document.createElement('option');
                option.value = device.deviceId;
                option.innerHTML = device.label;
                audioSelector.appendChild(option);
            });
            devices.video.forEach((device) => {
                option = document.createElement('option');
                option.value = device.deviceId;
                option.innerHTML = device.label;
                videoSelector.appendChild(option);
            });
        });

        /**
         * Change audio device
         *
         */
        document.querySelector('.device-sfu-audio').addEventListener('change', (el) => {
            if (el.currentTarget.value) {
                WebRTC.core.changeDevice('audio', el.currentTarget.value);
            }
        });

        /**
         * Change video device
         *
         */
        document.querySelector('.device-sfu-video').addEventListener('change', (el) => {
            if (el.currentTarget.value) {
                WebRTC.core.changeDevice('video', el.currentTarget.value);
            }
        });

        /**
         * Release the camera
         *
         */
        document.querySelector('.camera-release').addEventListener('click', () => {
            WebRTC.core.releaseCamera((err) => {
                if (err) {
                    return;
                }
                document.querySelector('.camera-release').classList.add('hide');
                document.querySelector('.camera-restart').classList.remove('hide');
            });
        });

        /**
         * Enable the camera after releasing it
         *
         */
        document.querySelector('.camera-restart').addEventListener('click', () => {
            WebRTC.core.restartCamera(null, null, (err) => {
                if (err) {
                    return;
                }
                document.querySelector('.camera-release').classList.remove('hide');
                document.querySelector('.camera-restart').classList.add('hide');
            });
        });

        /**
         * Accept an incoming call
         *
         */
        document.querySelector('.accept-call').addEventListener('click', () => {
            // Accept incoming call
            if (!self.incomingCall || !self.incomingCall.id) {
                return console.warn('No incoming call ID to accept');
            }
            // We can select if we're joining with audio and video;
            const joinWithAudio = true; // self.incomingCall.audio,
            const joinWithVideo = true; // self.incomingCall.video;
            if (self.incomingCall.type === 'call') {
                self.callId = self.incomingCall ? self.incomingCall.id : null;
                self.joinCall(self.callId, joinWithAudio, joinWithVideo);
            } else if (self.incomingCall.type === 'space') {
                self.spaceId = self.incomingCall ? self.incomingCall.id : null;
                document.getElementById(`spaceJoin${self.spaceId}`).click();
            }
            self.incomingCall = {};
        });

        /**vb
         * Accept an incoming call
         *
         */
        document.querySelector('.accept-join').addEventListener('click', () => {
            // Accept incoming call
            // self.callId = self.incomingCall ? self.incomingCall.id : null;
            if (!self.incomingCall || !self.incomingCall.id) {
                return console.warn('No incoming call ID to accept');
            }
            if (self.incomingCall.id !== self.callId) {
                return console.warn('Incoming call ID differs from the existing call ID, skipping');
            }
            document.querySelector('.incomming-knock').classList.add('hide');
            WebRTC.core.acceptJoiningUser(
                self.callId,
                self.incomingCall.caller.id,
                self.incomingCall.audio,
                self.incomingCall.video,
                (error, callId, userId, audio, video) => {
                    console.log('User joined');
                }
            );
            self.incomingCall = {};
        });

        /**
         *  Finish the call
         *
         */
        document.querySelector('.hangup-call').addEventListener('click', () => {
            const callId = self.incomingCall && self.incomingCall.id ? self.incomingCall.id : self.callId;
            if (callId) {
                WebRTC.core.hangupCall(callId);
            }
            if (self.spaceId) {
                WebRTC.core.leaveSpace(self.spaceId);
            }
            self.incomingCall = {};
            self.outgoingCall = {};
            self.callId = null;
        });

        /**
         *  Reject the incoming call
         *
         */
        document.querySelector('.reject-call').addEventListener('click', () => {
            if (!self.incomingCall) {
                return console.warn('No incoming call to reject');
            }
            const callerId = self.incomingCall && self.incomingCall.caller ? self.incomingCall.caller.id : null;
            WebRTC.core.rejectCall(self.incomingCall.type, self.incomingCall.id, callerId, (error, callId, userId, callFinished) => {
                self.outgoingCall = {};
                self.incomingCall = {};
                if (callFinished) {
                    document.querySelector('.wrapper').classList.remove('hide');
                    document.querySelector('.conference-container').classList.add('hide');
                    document.querySelector('.conference-buttons').classList.add('show');
                    document.querySelector('.incomming-knock, .outgoing-knock').classList.add('hide');
                    document.querySelector('.screen-buttons').classList.add('hide-content');
                }
            });
        });

        /**
         *  Ask server to update the user list
         *
         */
        document.querySelector('.user-list-update').addEventListener('click', () => {
            WebRTC.core.forceUserListUpdate(self.workspaceId);
        });

        document.querySelector('.disconnectWorkspace').addEventListener('click', () => {
            WebRTC.core.leaveWorkspace(self.workspaceId);
            document.querySelector('.disconnectWorkspace').style.display = 'none';
            document.querySelector('.reconnectWorkspace').style.display = 'inline';
        });
        document.querySelector('.reconnectWorkspace').addEventListener('click', () => {
            self.joinWorkspace(self.workspaceId, true);
            document.querySelector('.disconnectWorkspace').style.display = 'inline';
            document.querySelector('.reconnectWorkspace').style.display = 'none';
        });

        document.querySelector('.disconnectSocket').addEventListener('click', () => {
            WebRTC.core.disconnect();
            document.querySelector('.disconnectSocket').style.display = 'none';
            document.querySelector('.reconnectSocket').style.display = 'inline';
        });
        document.querySelector('.reconnectSocket').addEventListener('click', () => {
            WebRTC.core.connect();
            document.querySelector('.disconnectSocket').style.display = 'inline';
            document.querySelector('.reconnectSocket').style.display = 'none';
        });

        document.querySelector('.stopSendingStatus').addEventListener('click', () => {
            WebRTC.core.stopSendingStatus();
            document.querySelector('.stopSendingStatus').style.display = 'none';
            document.querySelector('.startSendingStatus').style.display = 'inline';
        });
        document.querySelector('.startSendingStatus').addEventListener('click', () => {
            WebRTC.core.startSendingStatus();
            document.querySelector('.stopSendingStatus').style.display = 'inline';
            document.querySelector('.startSendingStatus').style.display = 'none';
        });
        /**
         *  Toggle dashboard media
         *  Note: audio is disabled for the dashboard, so you can use this method for
         *  switching on/off microphone level propagation. Set false to set "mic" to 0
         *
         *  @param userId
         *  @param audio        If audio should be enabled in dashboard
         *  @param video        If video should be enabled in dashboard
         */
        // WebRTC.core.isMute - set this variable to true to disable sending your mic level to other users

        /**
         *  Toggle p2p media
         *
         *  @param userId
         *  @param audio        If audio should be enabled in dashboard
         *  @param video        If video should be enabled in dashboard
         */
        // enable video and don't change audio
        // WebRTC.core.p2pToggleMedia(self.userId, null, true);
        //
        // You also can access the actual values using WebRTC.core.p2pAudio && WebRTC.core.p2pVideo boolean variables
        document.querySelector('.conference-buttons .knock-has-audio').addEventListener('click', () => {
            const callOrSpaceId = self.callId ? self.callId : self.spaceId;
            const type = self.callId ? 'call' : 'space';
            self.audio = !self.audio;
            WebRTC.core.callToggleMedia(type, callOrSpaceId, self.audio, null, (err, audio, video) => {
                if (err) {
                    return;
                }
                self.updateKnockingMedia(audio, video);
            });
        });
        document.querySelector('.conference-buttons .knock-has-video').addEventListener('click', () => {
            const callOrSpaceId = self.callId ? self.callId : self.spaceId;
            const type = self.callId ? 'call' : 'space';
            self.video = !self.video;
            WebRTC.core.callToggleMedia(type, callOrSpaceId, null, self.video, (err, audio, video) => {
                if (err) {
                    return;
                }
                self.updateKnockingMedia(audio, video);
            });
        });

        document.querySelector('.getMicLevel').addEventListener('click', () => {
            const micLevel = WebRTC.core.getLocalMicLevel();
            console.log('Mic level', micLevel);
        });

        document.querySelector('.mic1').addEventListener('change', (el) => {
            WebRTC.core.micLevels[1] = el.currentTarget.value;
        });
        document.querySelector('.mic2').addEventListener('change', (el) => {
            WebRTC.core.micLevels[2] = el.currentTarget.value;
        });
        document.querySelector('.mic3').addEventListener('change', (el) => {
            WebRTC.core.micLevels[3] = el.currentTarget.value;
        });
        document.querySelector('.mic4').addEventListener('change', (el) => {
            WebRTC.core.micLevels[4] = el.currentTarget.value;
        });
        document.querySelector('#connection-state').addEventListener('change', (el) => {
            WebRTC.core.changeConnectionState(self.workspaceId, el.currentTarget.value);
        });
        document.querySelector('.block-incoming-video').addEventListener('click', (el) => {
            WebRTC.core.blockIncomingVideoStream();
        });
        document.querySelector('.allow-incoming-video').addEventListener('click', (el) => {
            WebRTC.core.allowIncomingVideoStream();
        });

        document.querySelector('.start-screen-sharing').addEventListener('click', (el) => {
            const mediaStream = null; // Place your media strem here
            const itemId = this.callId ? this.callId : this.spaceId;
            WebRTC.core.screenShare(itemId, mediaStream, (err) => {
                if (err) {
                    console.error(err);
                }
            });
            document.querySelector('.start-screen-sharing').style.display = 'none';
            document.querySelector('.stop-screen-sharing').style.display = 'block';
        });
        document.querySelector('.stop-screen-sharing').addEventListener('click', (el) => {
            const itemId = this.callId ? this.callId : this.spaceId;
            WebRTC.core.stopScreenShare(itemId);
            document.querySelector('.start-screen-sharing').style.display = 'block';
            document.querySelector('.stop-screen-sharing').style.display = 'none';
        });
    }

    /**
     * Start a new call
     *
     * @param calleeId
     */
    callStart(calleeId) {
        const self = this;
        // If audio and video should be enabled
        const startWithAudio = true; //
        const startWithVideo = WebRTC.core.cameraEnabled;
        // You can call to several users at once to start the group call
        const callUsers = [calleeId];
        WebRTC.core.startCall(callUsers, startWithAudio, startWithVideo, (err, callId, users, audio, video) => {
            /*
            if (err === 'Conflict' && callId) {
                document.querySelector('.wrapper').classList.add('hide');
                document.querySelector('.conference-container').classList.remove('hide');
                document.querySelector('.conference-buttons').classList.add('show');
                document.querySelector('.conference-container .other-users').innerHTML = 'Invite users: ';
                self.fillCallInvites(users, callId);
                self.joinCall(callId, audio, video);
                return;
            }
            */
            if (err) {
                alert(err);
                return false;
            }
            self.outgoingCall = { id: callId, audio, video };
            self.callId = callId;

            // document.querySelectorAll('.collutors > div').forEach((item) => item.remove());
            document.querySelector('.outgoing-knock').classList.remove('hide');
            document.querySelector('.outgoing-knock').innerHTML = 'Knocking';
            document.querySelector('.wrapper').classList.add('hide');
            document.querySelector('.conference-container').classList.remove('hide');
            document.querySelector('.conference-buttons').classList.remove('hide');
            document.querySelector('.conference-buttons .accept-call').classList.add('hide');
            document.querySelector('.conference-buttons .accept-join').classList.add('hide');
            document.querySelector('.conference-buttons .reject-call').classList.add('hide');
            document.querySelector('.conference-buttons .hangup-call').classList.remove('hide');
            document.querySelector('.conference-buttons .user-limit-reached').classList.add('hide');
            self.updateKnockingMedia(startWithAudio, startWithVideo);
            self.fillCallInvites(users, callId);
        });
    }

    /**
     * Join the call
     *
     * @param callId
     * @param audio
     * @param video
     */
    joinCall(callId, audio, video) {
        WebRTC.core.joinCall(callId, audio, video, (err, callId, audio, video) => {
            if (err) {
                return alert(err);
            }
            // Set call ID
            self.incomingCall = {};
            self.outgoingCall = {};
            self.callId = callId;
            // document.querySelectorAll('.collutors > div').forEach((item) => item.remove());
            document.querySelector('.conference-buttons .accept-call').classList.add('hide');
            document.querySelector('.conference-buttons .accept-join').classList.add('hide');
            document.querySelector('.conference-buttons .reject-call').classList.add('hide');
            document.querySelector('.conference-buttons .hangup-call').classList.remove('hide');
            document.querySelector('.conference-buttons .user-limit-reached').classList.add('hide');
            document.querySelector('.incomming-knock').classList.add('hide');
            document.querySelector('.outgoing-knock').classList.add('hide');
            document.querySelector('.screen-buttons').classList.remove('hide-content');
        });
    }

    /**
     *  Start the session, send the own video and subscribe to other's videos
     *
     *  @param workspaceId
     */
    joinWorkspace(workspaceId, video) {
        const self = this;
        // If audio and video should be enabled - not used now
        const startWithVideo = video;

        // Change outgoing video parameters
        const width = document.querySelector('.constraintWidth').value;
        const height = document.querySelector('.constraintHeight').value;
        const frameRate = document.querySelector('.constraintFamerate').value;
        WebRTC.core.videoWidth = width;
        WebRTC.core.videoHeight = height;
        WebRTC.core.videoFps = frameRate;

        WebRTC.core.joinWorkspace(workspaceId ? workspaceId : self.workspaceId, startWithVideo, (err) => {
            if (err) {
                return alert(err);
            }
        });
    }

    addUserToCall(err, callId, userId, audio, video, remoteStream, usersInCall, mediaType) {
        const self = this;
        let videoContainer = document.getElementById(`video-box-${userId}`);
        if (videoContainer) {
            const videoElement = videoContainer.getElementsByTagName('video')[0];
            // console.log('>>>>>>>>>>>>>>>>> MMMM 1');
            // const t = Date.now();
            videoElement.srcObject = remoteStream;
            // console.log('>>>>>>>>>>>>>>>>> MMMM 2', Date.now() - t);
            if (!usersInCall[userId] || usersInCall[userId].status !== 'in') {
                videoElement.classList.add('preview');
            } else {
                videoElement.classList.remove('preview');
            }
            return;
        }
        // Create the screen container
        videoContainer = document.createElement('DIV');
        videoContainer.id = `video-box-${userId}`;
        videoContainer.className = 'video-box';
        // Create the user name element
        const nameElement = document.createElement('SPAN');
        nameElement.innerHTML = self.users[userId] ? self.users[userId].short_name : '';
        videoContainer.appendChild(nameElement);
        // Create the video element
        const videoElement = document.createElement('VIDEO');
        videoElement.autoplay = true;
        videoElement.playsinline = true;
        videoElement.srcObject = remoteStream;
        if (!usersInCall[userId] || usersInCall[userId].status !== 'in') {
            videoElement.classList.add('preview');
        } else {
            videoElement.classList.remove('preview');
        }
        videoContainer.appendChild(videoElement);
        document.querySelector('.collutors').appendChild(videoContainer);
        // Get the list of available users
        WebRTC.core.getCallUsers((err, users) => {});
    }

    /**
     * Interface functionality
     *
     */
    hideLoginFields() {
        const self = this;
        const email = document.querySelector('input[name="email"]').value;
        const securitySeed = document.querySelector('input[name="securitySeed"]').value;
        WebRTC.core.login(email, securitySeed, self.workspaceId, (err, userId, userData, token, versions) => {
            if (err) {
                return alert('Auth failed: ' + err);
            }
            self.userId = userId;
            console.log('Logged in as user', self.userId);
            document.querySelector('.versions').innerHTML = `frontend: ${versions.frontend}<br />signaling: ${versions.signaling}`;
            self.workspaceId = userData.workspaceID;
            self.init();

            self.mode = document.querySelector('.mode').value;
            console.log('Starting with the mode: ', self.mode);
            switch (self.mode) {
                case 'in':
                    WebRTC.core.setCustomStatus({
                        cameraStatus: 'In',
                        micMuted: true,
                    });
                    self.joinWorkspace(null, true);
                    // document.querySelector('.wrapper').style.display = 'block';
                    break;
                case 'novideo':
                    self.joinWorkspace(null, false);
                    WebRTC.core.setCustomStatus({
                        cameraStatus: 'No Video',
                        micMuted: true,
                    });
                    break;
                case 'out':
                    WebRTC.core.setCustomStatus({
                        cameraStatus: 'Out',
                        micMuted: true,
                    });
                    break;
            }
            if (self.callId) {
                self.joinCall(self.callId, self.audio, self.video, () => {});
            }
        });
    }

    updateKnockingMedia(audio, video) {
        if (audio) {
            document.querySelector('.conference-buttons .knock-has-audio').classList.add('fa-microphone');
            document.querySelector('.conference-buttons .knock-has-audio').classList.remove('fa-microphone-slash');
        } else {
            document.querySelector('.conference-buttons .knock-has-audio').classList.remove('fa-microphone');
            document.querySelector('.conference-buttons .knock-has-audio').classList.add('fa-microphone-slash');
        }
        if (video) {
            document.querySelector('.conference-buttons .knock-has-video').classList.add('fa-video');
            document.querySelector('.conference-buttons .knock-has-video').classList.remove('fa-video-slash');
        } else {
            document.querySelector('.conference-buttons .knock-has-video').classList.remove('fa-video');
            document.querySelector('.conference-buttons .knock-has-video').classList.add('fa-video-slash');
        }
    }

    fillCallInvites(users, callId, spaceId) {
        const self = this;
        document.querySelector('.conference-container .other-users').innerHTML = '';
        Object.values(self.users).forEach((existingUser) => {
            let status = null;
            try {
                status = JSON.parse(existingUser.connectionStatus);
            } catch (e) {}

            if (!status || status.cameraStatus === 'Out' || existingUser.id === self.userId) {
                return;
            }
            const link = document.createElement('a');
            link.innerHTML = existingUser.short_name;
            link.href = '#';
            link.addEventListener('click', () => {
                if (callId) {
                    WebRTC.core.inviteUserToCall(callId, existingUser.id);
                } else if (spaceId) {
                    WebRTC.core.inviteUserToSpace(spaceId, existingUser.id);
                }
            });
            document.querySelector('.conference-container .other-users').append(link);
            document.querySelector('.conference-container .other-users').append(' ');
        });
    }
}

const ui = new UI();