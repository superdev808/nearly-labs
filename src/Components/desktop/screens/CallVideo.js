import React, { Component, Fragment } from "react";
import { inject, observer } from "mobx-react";
import loadingSpinner from "../../../assets/images/spinner.gif";

const remote = window.require("electron").remote;
const trackEvent = remote.getGlobal("trackEvent");

const muteIcon = require("../../../assets/images/Mic/big/Muted4.png");
const knockAudio = require("../../../assets/Knock_Knock.m4a");

export class Video extends Component {
  constructor(props) {
    super(props);
    this.vidRef = React.createRef();
  }

  componentDidMount() {
    this.updateVideoStream();
  }

  componentDidUpdate() {
    this.updateVideoStream();
  }

  updateVideoStream = () => {
    const { id, callStore } = this.props;

    const streamData = callStore.getUserStream(id);

    if (streamData === true) {
      return;
    }

    if (streamData && this.vidRef && this.vidRef.current) {
      if (
        !this.vidRef.current.srcObject ||
        !this.vidRef.current.dataset.mediaStreamUpdated ||
        this.vidRef.current.dataset.mediaStreamUpdated < streamData.updated
      ) {
        this.vidRef.current.dataset.mediaStreamUpdated = streamData.updated;
        this.vidRef.current.srcObject = streamData.stream;
      }
    }
  };

  isStreamLoading = () => {
    const { id, callStore, workspaceStore } = this.props;

    callStore.emitUserCount();

    const streamData = callStore.getUserStream(id);
    const user = workspaceStore.getUser(id);
    if (user && user.status && user.status.status === "In" && !streamData)
      return true;
    return false;
  };

  isScreenSharing = () => {
    const { id, callStore, smallImage } = this.props;
    return smallImage && callStore.screenShareId === id;
  };

  isNoVideo = () => {
    const { id, workspaceStore } = this.props;
    const user = workspaceStore.getUser(id);
    if (!user || !user.status) return true;
    return user.status.status === "No Video";
  };

  acceptCall = () => {
    const { callStore } = this.props;
    callStore.acceptCall();
    trackEvent("Call Received", "Answered");
  };

  joinCall = () => {
    const { callStore } = this.props;
    callStore.joinCall();
    trackEvent("Call Received", "Joined");
  };

  acceptJoiningUser = () => {
    const { callStore } = this.props;
    callStore.acceptJoiningUser();
    trackEvent("Call Received", "Accepted");
  };

  declineCall = () => {
    const { callStore } = this.props;
    callStore.rejectCall();
    callStore.hangupCall();
    // if (callStore.userCount < 2) {
    //   callStore.hangupCall();
    // } else {
    //   callStore.rejectCall();
    // }
    trackEvent("Call Received", "Declined");
  };

  render() {
    const {
      participantNo,
      callStore,
      workspaceStore,
      className,
      id,
      smallImage,
      ...rest
    } = this.props;

    const user = workspaceStore.getUser(id);

    const userCount = callStore.currentPublicWorkspaceId
      ? workspaceStore.usersInPublicWorkspace(
          callStore.currentPublicWorkspaceId
        ).length - 1
      : callStore.userCount;

    const isPreview = (user) => {
      return (
        user &&
        callStore.beingKnocked.caller &&
        callStore.knocking.inbound &&
        callStore.beingKnocked.caller.id === user.id
      );
    };

    const positionClassName = {
      1: "CallVideo-Participant Top-Left-Participant",
      2: "CallVideo-Participant Top-Center-Participant",
      3: "CallVideo-Participant Top-Right-Participant",
      4: "CallVideo-Participant Bottom-Left-Participant",
      5: "CallVideo-Participant Bottom-Right-Participant",
    };

    let style = userCount > 3 ? { width: 279, height: 279 } : {};
    style = isPreview(user)
      ? {
          ...style,
          filter: "grayscale(100%)",
          boxShadow: "-2px 2px 6px #333",
        }
      : style;

    let positionStyle =
      participantNo === 5 && isPreview(user)
        ? {
            right: 123,
          }
        : {};

    return (
      <div
        className={
          userCount < 4 || !positionClassName[participantNo]
            ? "CallVideo-Participant"
            : positionClassName[participantNo]
        }
        style={
          participantNo >= 4
            ? {
                display: "flex",
                alignItems: "center",
                ...positionStyle,
              }
            : !smallImage
            ? {
                paddingTop: 23,
                paddingLeft: 11,
              }
            : {}
        }
      >
        <div
          style={
            isPreview(user)
              ? {
                  display: "flex",
                  alignItems: "center",
                  position: "relative",
                }
              : {
                  position: "relative",
                }
          }
        >
          {this.isNoVideo() ? (
            <img
              src={user.profile_pic}
              className={className || "call-screen-user-video"}
              style={style}
              {...rest}
            />
          ) : (
            <video
              className={className || "call-screen-user-video"}
              style={{ backgroundColor: "white" }}
              controls={false}
              ref={this.vidRef}
              autoPlay={true}
              style={style}
              data-forcerender={`${callStore.streamCounter}`}
              {...rest}
            />
          )}
          {this.isStreamLoading() && (
            <div className="person-joining-label">
              {callStore.callId !== null ? (
                <p>{`Adding ${user.short_name}`}</p>
              ) : (
                <p>{`${user.short_name} Joining`}</p>
              )}
              <img
                src={loadingSpinner}
                className="loading-spinner"
                alt="loading..."
              />
            </div>
          )}
          {this.isNoVideo() && !this.isScreenSharing() && (
            <div className="sharer-video-cover">
              <p
                className={smallImage ? "sharer-text" : "call-participant-name"}
              >
                {user.short_name}
              </p>
            </div>
          )}
          {this.isScreenSharing() && (
            <div className="sharer-video-cover">
              <p className="sharer-text">Sharing</p>
            </div>
          )}
          {isPreview(user) && (
            <div
              className="knocking-label"
              style={this.isNoVideo() ? { color: "black" } : {}}
            >
              Knocking
            </div>
          )}
          {isPreview(user) && !this.isNoVideo() && (
            <div className="knocking-shorten-name">
              {callStore.beingKnocked.caller.short_name}
            </div>
          )}
          {user && user.status && user.status.micMuted && (
            <div
              className="CallVideo-Participant-microphone"
              style={{
                bottom: smallImage
                  ? "3px"
                  : userCount <= 3 || participantNo >= 4
                  ? "30px"
                  : "70px",
                right: userCount <= 3 || participantNo >= 4 ? "0px" : "-11px",
              }}
            >
              <img
                style={{
                  width: smallImage ? "12px" : "21px",
                  height: smallImage ? "21px" : "36px",
                }}
                alt="mic"
                src={muteIcon}
              />
              {!smallImage && <p>Muted</p>}
            </div>
          )}
        </div>
        {isPreview(user) && (
          <Fragment>
            <audio src={knockAudio} autoPlay={true} />
            <div
              className="knockee-btn-container"
              style={
                participantNo >= 4
                  ? {
                      float: "right",
                      display: "flex",
                      flexDirection: "column-reverse",
                      marginLeft: 15,
                    }
                  : {}
              }
            >
              <button className="btn-declin" onClick={this.declineCall}>
                Decline Call
              </button>
              <button
                className="btn-answer"
                // onClick={
                //   callStore.callId && callStore.userCount > 1
                //     ? this.joinCall
                //     : this.acceptCall
                // }
                onClick={
                  callStore.userOnCall ? this.acceptJoiningUser : this.joinCall
                }
                style={
                  participantNo >= 4
                    ? {
                        marginBottom: 15,
                      }
                    : {}
                }
              >
                {callStore.userOnCall ? "Add to Call" : "Answer the call"}
              </button>
            </div>
          </Fragment>
        )}
      </div>
    );
  }
}

export default inject("callStore", "workspaceStore")(observer(Video));
