import React, { Component, Fragment } from "react";
import {inject, observer} from 'mobx-react';

const remote = window.require("electron").remote;
const trackEvent = remote.getGlobal("trackEvent");

const closeBtn = require("../../../assets/images/close.png");
const knockAudio = require('../../../assets/Knock_Knock.m4a');

export class BeingKnocked extends Component {
  constructor(props) {
    super(props);
    this.remoteVideo = React.createRef();
    this.isPublicSpace = null; // True if getting knocked from public space, false or null otherwise
  }

  componentDidMount = () => {
    const { workspaceStore, callStore } = this.props;
    if (!callStore.beingKnocked) return;

    if (workspaceStore.isUserInPublicWorkspace(callStore.beingKnocked.caller.id)) {
      trackEvent("Public Space Received", "Knocked");
      this.isPublicSpace = true;
    }
    else {
      trackEvent("Call Received", "Knocked");
      this.isPublicSpace = false;
    }
    
    const stream = workspaceStore.getUserStream(callStore.beingKnocked.caller.id);
    this.remoteVideo.current.srcObject = stream;
  };

  acceptCall = () => {
    const {callStore} = this.props;
    callStore.acceptCall();
    if (this.isPublicSpace) {
      trackEvent("Public Space Received", "Answered");
    }
    else {
      trackEvent("Call Received", "Answered");
    }
  }
  declineCall = () => {
    const {callStore} = this.props;
    callStore.rejectCall();
    if (this.isPublicSpace) {
      trackEvent("Public Space Received", "Declined");
    }
    else {
      trackEvent("Call Received", "Declined");
    }
  }

  render() {
    const { callStore, workspaceStore } = this.props;

    return (
      <div className="beingknocked-container">
        <audio src={knockAudio} autoPlay={true} />

        <div className="beingknocked-video-container">
          <div className="knockee-user-video">
            <video
              id="video_player"
              className="knockee-user-video"
              controls={false}
              autoPlay={true}
              ref={this.remoteVideo}
              style={{ filter: "grayscale(100%)" }}
            />
            <div className="knocking-label">Knocking</div>
            <div className="knocking-shorten-name">{callStore.beingKnocked.caller.short_name}</div>
          </div>          
          <Fragment>
            <div className="knockee-btn-container">
              <button
                className="btn-declin"
                onClick={this.declineCall}
              >
                Decline
              </button>
              <button
                className="btn-answer"
                onClick={this.acceptCall}
              >
                {callStore.callId ? "Answer" : "Add to Call"}
              </button>
            </div>
          </Fragment>
        </div>
        <div className="new-user-video"></div>
        <button
          onClick={callStore.rejectCall}
          className="btn-close"
          style={{ top: "-27px", right: "22px" }}
        >
          <img alt="Close" src={closeBtn} />
        </button>
      </div>
    );
  }
}

export default inject('callStore', 'workspaceStore')(observer(BeingKnocked));
