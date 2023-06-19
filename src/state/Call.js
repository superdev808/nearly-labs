import { action, observable, computed, makeObservable } from "mobx";
import { core as WebRTC } from "../assets/js/webrtc";
import Me from "./Me";
import Workspace from "./Workspace";

const electron = window.require && window.require("electron");
const remote = window.require("electron").remote;
const trackEvent = remote.getGlobal("trackEvent");

class Call {
  // Updates to value deeply-nested inside _peopleInCall won't make React re-render
  // so increment this counter any time something changes as a hack to force re-renders
  streamCounter = 0;

  _peopleInCall = null;
  userOnCall = null;

  callId = null;
  currentPublicWorkspaceId = null;
  publicSpaceName = null;

  screenShareStream = null;
  screenShareWidth = null;
  screenShareHeight = null;
  screenShareId = null;
  streamSource = null;

  knocking = {
    inbound: false,
    outbound: false,
  };

  beingKnocked = {
    caller: null,
    calleeId: null, // TODO: separate "beingKnocked" and "I'm knocking" objects?
    audio: null,
    video: null,
    localStream: null,
  };

  constructor() {
    makeObservable(this, {
      currentPublicWorkspaceId: observable,
      streamCounter: observable,
      _peopleInCall: observable,
      knocking: observable,
      beingKnocked: observable,
      userOnCall: observable,

      screenShareStream: observable,
      screenShareWidth: observable,
      screenShareHeight: observable,
      screenShareId: observable,
      streamSource: observable,

      peopleInCall: computed,
      userCount: computed,
      isMyScreenShared: computed,

      startCall: action,
      hangupCall: action,
      startScreenShare: action,

      onCallUserAdded: action,
      onCallJoined: action,
      onHangupCall: action,
      onCallRejected: action,
      onAcceptCall: action,
      onCallIncoming: action,
      onCallUserRemoved: action,
      onStartCall: action,

      onScreenAdded: action,
      onScreenRemoved: action,
    });

    this._peopleInCall = new Map();

    WebRTC.onCallUserAdded(this.onCallUserAdded);
    WebRTC.onCallUserRemoved(this.onCallUserRemoved);
    WebRTC.onCallJoined(this.onCallJoined);
    WebRTC.onCallRejected(this.onCallRejected);
    WebRTC.onHangup(this.onHangupCall);
    WebRTC.onCallIncoming(this.onCallIncoming);
    WebRTC.onSpaceIncoming(this.onSpaceIncoming);

    WebRTC.onScreenAdded(this.onScreenAdded);
    WebRTC.onScreenRemoved(this.onScreenRemoved);
    WebRTC.onMediaToggled(this.onMediaToggled);
    WebRTC.onMediaReconnect(this.onMediaReconnect);
    WebRTC.onMediaReconnectFails(this.onMediaReconnectFails);
  }

  get userCount() {
    return this._peopleInCall.size;
  }

  get peopleInCall() {
    return Array.from(this._peopleInCall.keys());
  }

  getUserStream = (id) => {
    return this._peopleInCall.get(id);
  };

  get isMyScreenShared() {
    return this.screenShareId === Me.userId;
  }

  startCall = (userId) => {
    this.beingKnocked.calleeId = userId;
    this._peopleInCall.set(userId, null);
    this.streamCounter++;

    // already in a call; add the user to it!
    if (this.userOnCall) {
      return WebRTC.inviteUserToCall(this.callId, userId);
    } else if (this.currentPublicWorkspaceId) {
      return WebRTC.inviteUserToSpace(this.currentPublicWorkspaceId, userId);
    }

    // if (this.showNoInternetDialog() === false) {
    //   return;
    // }
    else {
      WebRTC.startCall(
        userId,
        true, //startWithAudio
        Me.isCameraStatusIn, // startWithVideo,
        this.onStartCall
      );
      this.emitUserCount();
    }
  };

  hangupCall = () => {
    console.warn("CallStore.hangupCall()", this.callId);

    if (!this.callId) {
      return;
    }

    WebRTC.hangupCall(this.callId);
    this.callId = null;

    this.knocking.outbound = false;
    this.knocking.inbound = false;

    this.beingKnocked.calleeId = null;
    this.beingKnocked.caller = null;
    this.beingKnocked.audio = null;
    this.beingKnocked.video = null;
    this.beingKnocked.localStream = null;

    this._peopleInCall = new Map();
    this.streamCounter++;

    this.userOnCall = false;

    Me.setCallId(this.callId);
    Me.setMicrophoneMuted(false);
    Workspace.incrementCounter();

    // resize the window
    this.emitUserCount();
  };

  sendIPCToMainProcess = (obj) => {
    electron.ipcRenderer.send("FOR-MAINPROCESS", { ...obj });
  };

  isSpaceCall = (callId) => {
    let result = false;
    if (Workspace.publicWorkspaces) {
      Workspace.publicWorkspaces.map((publicWorkspace, id) => {
        if (callId === publicWorkspace.id) {
          result = true;
        }
      });
    }
    console.log(result);
    return result;
  };

  rejectCall = () => {
    trackEvent("Call rejected");
    console.warn("CallStore.rejectCall()");
    if (!this.callId && !this.currentPublicWorkspaceId) return;
    if (this.currentPublicWorkspaceId !== null) {
      this.leaveSpace();
    }
    WebRTC.rejectCall(this.isSpaceCall(this.callId) ? 'call' : 'space', this.callId, this.beingKnocked.caller.id, this.onCallRejected);
    this.knocking.outbound = false;
    this.knocking.inbound = false;

    this.beingKnocked.calleeId = null;
    this.beingKnocked.caller = null;
    this.beingKnocked.audio = null;
    this.beingKnocked.video = null;
    this.beingKnocked.localStream = null;
    this.emitUserCount();
  };

  acceptCall = () => {
    trackEvent("Call accepted");
    console.warn("CallStore.acceptCall()");
    if (!this.callId && !this.currentPublicWorkspaceId) return;
    if (this.isSpaceCall(this.callId)) {
      this.joinSpace(this.callId, true, true);
    } else if (this.isSpaceCall(this.currentPublicWorkspaceId)) {
      this.joinSpace(
        this.currentPublicWorkspaceId,
        true,
        true,
        this.onAcceptCall
      );
    } else {
      WebRTC.joinCall(this.callId, true, true, this.onAcceptCall);
    }
  };

  joinCall = () => {
    trackEvent("Call joined");
    console.warn(
      "CallStore.acceptJoin()",
      this.callId,
      this.beingKnocked.caller.id
    );
    if (!this.callId || !this.beingKnocked || !this.beingKnocked.caller.id)
      return;
    if (this.isSpaceCall(this.callId)) {
      this.joinSpace(this.callId, true, true);
    } else {
      // DMakeev:
      // WebRTC.joinCall - join the call
      // WebRTC.acceptJoiningUser - approve another user to join the call
      // So, the use case for WebRTC.joinCall - "I'm joining the call" while use case for
      // WebRTC.acceptJoiningUser is "user X is going to join our call, I approve it,
      // he can join"
      // WebRTC.acceptJoiningUser(this.callId, this.beingKnocked.caller.id, true, true)
      WebRTC.joinCall(this.callId, true, true);
    }

    this.knocking.inbound = false;
    this.beingKnocked.caller = null;
    this.beingKnocked.audio = null;
    this.beingKnocked.video = null;
    this.beingKnocked.localStream = null;
  };

  acceptJoiningUser = () => {
    console.warn(
      "CallStore.acceptJoiningUser()",
      this.callId,
      this.beingKnocked.caller.id
    );
    WebRTC.acceptJoiningUser(this.callId, this.beingKnocked.caller.id, true, true);

    this.knocking.inbound = false;
    this.beingKnocked.caller = null;
    this.beingKnocked.audio = null;
    this.beingKnocked.video = null;
    this.beingKnocked.localStream = null;
  }

  emitUserCount = () => {
    console.warn("emitUserCount()", this.userCount);
    if (this.callId && this.userCount === 0) {
      this.hangupCall();
    }

    let userCount;
    if (!this.callId && !this.currentPublicWorkspaceId) {
      userCount = 0;
    } else {
      userCount = this.callId
        ? this.userCount
        : Workspace.usersInPublicWorkspace(this.currentPublicWorkspaceId)
            .length - 1;
    }

    if (this.knocking.inbound) {
      userCount = this._peopleInCall.size;
    }
    else if (this.callId) {
      userCount = this._peopleInCall.size;
    }
    else if (this.currentPublicWorkspaceId) {
      userCount += 0;
    }
    else {
      userCount -= 1;
    }

    if (this.screenShareId === null) {
      console.log("userCount", userCount);
      if (userCount > 1) {
        electron && electron.ipcRenderer.send("MULTI-PARTY-CALL", userCount);
      } else {
        electron && electron.ipcRenderer.send("SINGLE-PERSON-CALL");
      }
    }
  };

  startScreenShare = (stream, source) => {
    //Start Animation
    // electron.remote.getCurrentWindow().setSize(410, 100, false);
    // electron.remote.getCurrentWindow().setPosition(500, -22, true);

    this.streamSource = source.display_id;

    WebRTC.screenShare(
      this.callId ? this.callId : Me.currentPublicWorkspaceId,
      stream,
      (err) => {
        if (err) {
          console.error(err);
        }
      }
    );
  };

  stopScreenShare = () => {
    WebRTC.stopScreenShare(
      this.callId ? this.callId : Me.currentPublicWorkspaceId
    );

    this.sendIPCToMainProcess({
      type: "SWITCH-TO-DASHBOARD-SCREEN",
    });
    if (this.currentPublicWorkspaceId !== null) {
      trackEvent("Public Space Screensharing", "Unshared");
    } else {
      trackEvent("Call Screensharing", "Unshared");
    }
    // resize the window when exiting screen share
    this.emitUserCount();
  };

  joinSpace = (
    publicWorkspaceId,
    startWithAudio,
    startWithVideo,
    onAcceptCall
  ) => {
    WebRTC.joinSpace(
      publicWorkspaceId,
      startWithAudio,
      startWithVideo,
      onAcceptCall
        ? onAcceptCall
        : () => {
            this.currentPublicWorkspaceId = publicWorkspaceId;
            Me.setCurrentPublicWorkspaceId(this.currentPublicWorkspaceId);
            Me.setMicrophoneMuted(false);
            this.emitUserCount();
          }
    );
    Workspace._publicWorkspaces.forEach((space) => {
      if (space.id === publicWorkspaceId) {
        this.publicSpaceName = space.name;
      }
    });
    this.userOnCall = true;
    trackEvent("Public Space Joined", this.publicSpaceName);
  };

  leaveSpace = () => {
    console.warn("CallStore.leaveSpace()", this.currentPublicWorkspaceId);

    trackEvent("Public Space Left", this.publicSpaceName);

    if (this.currentPublicWorkspaceId) {
      WebRTC.leaveSpace(this.currentPublicWorkspaceId);
      this.currentPublicWorkspaceId = null;
      Me.setCurrentPublicWorkspaceId(this.currentPublicWorkspaceId);
      this.emitUserCount();
    }
    this.userOnCall = false;
  };

  // ========== WebRTC callbacks ==========

  /*
   * Event fires when:
   *   * Someone is calling me (after onCallIncoming() executes)
   *   * A user has been added to a call we just started (after onStartCall() executes)
   *   * A user has been added to (but not yet accepted) a call we're already in (multi-party call)
   *   @param callback
   *         - err - error message
   *         - workspaceId - ID of the workspace
   *         - userId - ID of the user
   *         - audio - if user's audio is enabled, not used for now
   *         - video - if user's video is enabled, not used for now
   *         - remoteStream - MediaStream object with the remote user's video
   *         - mediaType - 'full' or 'preview', indicating if it's about the full size or preview video
   */
  onCallUserAdded = (
    err,
    callId,
    userId,
    audio,
    video,
    remoteStream,
    usersInCall,
    mediaType
  ) => {
    console.warn("CallStore.onCallUserAdded()");

    if (userId !== Me.userId) {
      const streamData = { stream: remoteStream, updated: Date.now() };
      console.log("userID:", userId, "mediaType:", mediaType);
      this._peopleInCall.set(userId, streamData); // remoteStream
      this.streamCounter++;
      console.warn("CallStore.onCallUserAdded() :: user added!", userId);
    } else {
      console.warn("CallStore.onCallUserAdded() :: user not added?", userId);
    }

    this.emitUserCount();
  };

  /*
   * Event fires when:
   *   * User accepts a call we invited them into
   *   * We accept an incoming call
   */
  onCallJoined = (err, callId, userId, audio, video, usersInCall) => {
    console.warn("CallStore.onCallJoined()");

    if (callId !== this.callId || userId === Me.userId) {
      return;
    }

    this.knocking.outbound = false;

    this.beingKnocked.calleeId = null;
    this.beingKnocked.caller = null;
    this.beingKnocked.audio = null;
    this.beingKnocked.video = null;
    this.beingKnocked.localStream = null;

    this.userOnCall = true;

    this.emitUserCount();
  };

  /*
   * A user has been removed from a call we're already in
   */
  onCallUserRemoved = (
    err,
    callId,
    userId,
    audio,
    video,
    remoteStream,
    usersInCall
  ) => {
    console.warn("CallStore.onCallUserRemoved()");
    this._peopleInCall.delete(userId);
    this.streamCounter++;

    this.emitUserCount();
  };

  /*
   * Event fires when:
   *   * You have declined an incoming call
   *   * You have left an existing call
   *   * You have canceled an outbound call
   */
  onHangupCall = () => {
    console.warn("CallStore.onHangupCall()");
  };

  /*
   * Event fires when:
   *   * Someone rejects your call
   */
  onCallRejected = (err, callId, userId, callFinished) => {
    console.warn("CallStore.onCallRejected()");

    if (callFinished) {
      if (!this.isSpaceCall(callId)) {
        WebRTC.hangupCall(callId);
      }
    }

    this.knocking.outbound = false;
    this.beingKnocked.calleeId = null;

    this.emitUserCount();
  };

  /*
   * Event fires when:
   *   * You have accepted an incoming call
   */
  onAcceptCall = (err, callId, audio, video) => {
    console.warn("CallStore.onAcceptCall()");
    this.knocking.inbound = false;

    this.beingKnocked.caller = null;
    this.beingKnocked.audio = null;
    this.beingKnocked.video = null;
    this.beingKnocked.localStream = null;

    Me.setMicrophoneMuted(false);
    this.streamCounter++;
    this.emitUserCount();
  };

  /*
   * Event fires when:
   *   * Someone is calling me
   */
  onCallIncoming = (err, callId, caller, audio, video, localStream) => {
    console.warn("CallStore.onCallIncoming()");
    // TODO: when you are already in a call, and someone knocks
    // if you accept, they join YOUR EXISTING CALL, not the callId here
    if (this.callId && this.callId !== callId) {
      console.warn("CallStore.onCallIncoming() :: already in a call");
      return;
    }

    this.callId = callId;
    this.knocking.inbound = true;

    //Put myself in Focus
    if (electron) {
      const win = electron.remote.getCurrentWindow();
      win.focus();
      win.setVisibleOnAllWorkspaces(true);
      win.show();
    }

    this.beingKnocked.caller = caller;
    this.beingKnocked.audio = audio;
    this.beingKnocked.video = video;
    this.beingKnocked.localStream = localStream;

    Me.setCallId(this.callId);
    // DMakeev - don't know why but with this string uncommented I don't see a preview video
    // this._peopleInCall.set(caller.id, localStream);
    this.streamCounter++;
    this.emitUserCount();
  };

  /*
   * Event fires when:
   *   * I start a new call
   */
  onStartCall = (err, callId, users, audio, video) => {
    console.warn("CallStore.onStartCall()");
    this.knocking.outbound = true;
    this.callId = callId;

    this.beingKnocked.audio = audio;
    this.beingKnocked.video = video;

    Me.setCallId(this.callId);
    Me.setMicrophoneMuted(false);
    this.streamCounter++;
    this.emitUserCount();
  };

  onScreenAdded = (err, workspaceId, userId, remoteStream) => {
    console.warn("CallStore.onScreenAdded()");

    this.screenShareStream = remoteStream;
    this.screenShareId = userId;

    if (userId === Me.userId) {
      this.sendIPCToMainProcess({
        type: "SWITCH-TO-SHAREE-SCREEN",
        source: this.streamSource,
      });
    } else {
      electron.remote.getCurrentWindow().setSize(410, 120, false);
      electron.remote.getCurrentWindow().setPosition(500, -22, true);

      this.sendIPCToMainProcess({
        type: "SWITCH-TO-SHARE-SCREEN",
      });
    }
  };

  /*
   * Event fires when:
   *   * Someone invites me to the space
   */
  onSpaceIncoming = (err, spaceId, caller, audio, video, localStream) => {
    console.warn("CallStore.onSpaceIncoming()");
    if (this.spaceId && this.currentPublicWorkspaceId !== spaceId) {
      console.warn("CallStore.onSpaceIncmoing() :: already in a space");
      return;
    }

    this.currentPublicWorkspaceId = spaceId;
    this.knocking.inbound = true;

    if (electron) {
      const win = electron.remote.getCurrentWindow();
      win.focus();
      win.setVisibleOnAllWorkspaces(true);
      win.show();
    }

    this.beingKnocked.caller = caller;
    this.beingKnocked.audio = audio;
    this.beingKnocked.video = video;
    this.beingKnocked.localStream = localStream;

    Me.setCurrentPublicWorkspaceId(spaceId);
    this.streamCounter++;
    this.emitUserCount();
  };

  /*
   * Event fires when:
   *   * I start a new call
   */
  // onStartCall = (err, callId, users, audio, video) => {
  //   console.warn("CallStore.onStartCall()");
  //   this.knocking.outbound = true;
  //   this.callId = callId;

  //   this.beingKnocked.audio = audio;
  //   this.beingKnocked.video = video;

  //   Me.setCallId(this.callId);
  //   Me.setMicrophoneMuted(false);
  //   this.streamCounter++;
  //   this.emitUserCount();
  // };

  onScreenAdded = (err, workspaceId, userId, remoteStream) => {
    console.warn("CallStore.onScreenAdded()");

    this.screenShareStream = remoteStream;
    this.screenShareId = userId;

    if (userId === Me.userId) {
      this.sendIPCToMainProcess({
        type: "SWITCH-TO-SHAREE-SCREEN",
        source: this.streamSource,
      });
    } else {
      electron.remote.getCurrentWindow().setSize(410, 120, false);
      electron.remote.getCurrentWindow().setPosition(500, -22, true);

      this.sendIPCToMainProcess({
        type: "SWITCH-TO-SHARE-SCREEN",
      });
    }
  };

  onScreenRemoved = (err, workspaceId, userId) => {
    console.warn("CallStore.onScreenRemoved()");

    this.screenShareId = null;
    this.screenShareStream = null;
    this.streamSource = null;

    this.sendIPCToMainProcess({
      type: "SWITCH-TO-DASHBOARD-SCREEN",
    });

    // resize the window when exiting screen share
    this.emitUserCount();
  };

  onMediaReconnect = ((param) => {
    console.log("Media recconecting.");
  });
  
  onMediaReconnectFails = ((param) => {
    console.log("Media reconnection failed!");
  });

  onMediaToggled = (type, callId, userId, audio, video) => {
    console.warn("CallStore.onMediaToggled()");

    let user = Workspace.getUser(userId);
    if (audio !== null && audio !== -1 && user && userId !== Me.userId) {
      if (user.status && typeof user.status !== "string") {
        user.status.micMuted = !audio;
      } else {
        user.status = {
          micMuted: !audio,
        };
      }
      Workspace.setUser(userId, user);
    }
  };
}

const CallState = new Call();

export default CallState;
