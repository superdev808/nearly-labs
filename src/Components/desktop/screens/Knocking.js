import React, { Component } from "react";
import { inject, observer } from 'mobx-react';

const remote = window.require("electron").remote;
const trackEvent = remote.getGlobal("trackEvent");

const closeBtn = require("../../../assets/images/close.png");
const knockAudio = require('../../../assets/Knock_Knock.m4a');

export class Knocking extends Component {
  constructor(props) {
    super(props);
    this.remoteVideo = React.createRef();
  }

  componentDidMount = () => {
    trackEvent("Knocking");
    const { workspaceStore, callStore } = this.props;
    const stream = workspaceStore.getUserStream(callStore.beingKnocked.calleeId);
    if (this.remoteVideo.current)
      this.remoteVideo.current.srcObject = stream;
  };

  isNoVideo = () => {
    const { workspaceStore, callStore } = this.props;
    const targetUser = workspaceStore.getUser(callStore.beingKnocked.calleeId);
    return targetUser.status.status === "No Video";
  }

  render() {
    const { workspaceStore, callStore } = this.props;
    const targetUser = workspaceStore.getUser(callStore.beingKnocked.calleeId);
    const { profile_pic } = targetUser;

    return (
      <div className="knocking-container" data-component="Knocking">

        <audio src={knockAudio} autoPlay={true} />

        <div className="knocking-video-container">
          <div
            className="main-user-video"
            style={{ alignItems: "center" }}
          >
            {this.isNoVideo() ?
              <img src={profile_pic} className={"knockee-user-video"} /> :
              <video
                id="video_player"
                className="knockee-user-video"
                style={{ filter: "grayscale(100%)" }}
                controls={false}
                ref={this.remoteVideo}
                autoPlay={true}
              />}
            <div className="knocking-label" style={this.isNoVideo() ? { color: 'black' } : {}}>Knocking</div>
            <div className="knocking-shorten-name">{targetUser.short_name}</div>
            {this.isNoVideo() && (
              <div className="sharer-video-cover">
                <p className={"call-participant-name"}>{targetUser.short_name}</p>
              </div>
            )}
          </div>
        </div>
        <div className="new-user-video"></div>

        <button onClick={callStore.hangupCall} className="knocking-btn-close">
          <img alt="Close" src={closeBtn} />
        </button>
      </div>
    );
  }
}

export default inject('callStore', 'workspaceStore')(observer(Knocking));
