import React, { Component } from "react";
import { inject, observer } from "mobx-react";
import "./../../assets/css/shareScreen.css";
import ShareVideo from "./share/ShareVideo";
import SelfieVideo from "./SelfieVideo";
import CallVideo from "./screens/CallVideo";
import MicrophoneLevel from "./header/MicrophoneLevel";

export class ShareScreen extends Component {
  getScreenShareMetaInfo() {
    const { callStore } = this.props;
    const myWidth = window.screen.width,
      myHeight = window.screen.height;
    let sharerWidth = callStore.screenShareWidth,
      sharerHeight = callStore.screenShareHeight;

    if (callStore.isMyScreenShared) {
      sharerWidth = myWidth;
      sharerHeight = myHeight;
    }

    const sharerRatio = sharerWidth / sharerHeight;
    const myRatio = myWidth / myHeight,
      xRatio = 0.2465,
      yRatio = 0.0833,
      padding = 3,
      userCount = callStore.userCount;

    if (!myWidth || !myHeight || !sharerWidth || !sharerHeight) {
      return {
        screenWidth: undefined,
        screenHeight: undefined,
        controlWidth: undefined,
        controlHeight: undefined,
      };
    }

    let screenWidth, screenHeight, controlWidth, controlHeight;

    if (myRatio > sharerRatio) {
      screenWidth = Math.round(myWidth * sharerRatio / myRatio)
      screenHeight = Math.round(screenWidth / sharerRatio)
      controlHeight = Math.round(myHeight * yRatio)
      controlWidth = Math.round(screenWidth * xRatio + (userCount - 1) * (controlHeight + padding))
    } else if (myRatio < sharerRatio) {
      screenHeight = Math.round(myHeight * myRatio / sharerRatio)
      screenWidth = Math.round(screenHeight * sharerRatio)
      controlHeight = Math.round(screenHeight * yRatio)
      controlWidth = Math.round(myWidth * xRatio + (userCount - 1) * (controlHeight + padding))
    } else {
      screenWidth = myWidth
      screenHeight = myHeight
      controlHeight = Math.round(myHeight * yRatio)
      controlWidth = Math.round(myWidth * xRatio + (userCount - 1) * (controlHeight + padding))
    }

    controlWidth = Math.min(520, controlWidth);
    controlHeight = Math.min(100, controlHeight);

    return {
      screenWidth: screenWidth,
      screenHeight: screenHeight,
      controlWidth: controlWidth,
      controlHeight: controlHeight,
    };
  }

  render() {
    const { myData, callStore } = this.props;
    const { screenWidth, screenHeight, controlWidth, controlHeight } =
      this.getScreenShareMetaInfo();

    console.log(">>>", screenWidth, screenHeight, controlWidth, controlHeight);

    return (
      <div className="share-parent-container" style={{ display: "block" }}>
        <ShareVideo width={screenWidth} height={screenHeight} />
        <div
          className={
            callStore.isMyScreenShared
              ? "sharer-users-container"
              : "share-users-container"
          }
          style={
            controlWidth && controlHeight
              ? {
                width: controlWidth,
                height: controlHeight,
                left: `calc(50% - ${controlWidth / 2}px)`,
              }
              : {}
          }
        >
          <div className="share-btn-box">
            <button
              className="share-stop-btn"
              style={{
                width: Math.round(controlHeight * 0.64),
                height: Math.round(controlHeight * 0.64),
              }}
              onClick={() => {
                if (callStore.isMyScreenShared) {
                  callStore.stopScreenShare();
                } else {
                  if (callStore.callId) {
                    callStore.hangupCall();
                  } else if (callStore.currentPublicWorkspaceId) {
                    callStore.leaveSpace();
                  }
                }
              }}
            >
              {callStore.isMyScreenShared ? "Stop" : "Exit"}
            </button>
            <p>{callStore.isMyScreenShared ? "Sharing" : "Share"}</p>
          </div>

          <div className="share-main-users">
            {callStore.peopleInCall && callStore.peopleInCall.length > 0 && (
              callStore.peopleInCall.map((id) => (
                <div
                  className="share-users"
                  style={{
                    width: Math.floor(controlHeight * 0.96),
                    height: Math.floor(controlHeight * 0.96)
                  }}
                >
                  <CallVideo
                    key={id}
                    id={id}
                    muted={false}
                    style={{ width: "100%", height: "100%" }}
                    className="main-video my-video hand"
                    smallImage={true}
                  />
                </div>
              ))
            )}
          </div>

          <div className="share-main-sharing">
            <div className="share-user-control">
              <div className="share-user1">
                <SelfieVideo forScreenShare={true} videoWidth={Math.round(controlHeight * 0.64)} videoHeight={Math.round(controlHeight * 0.64)} />
              </div>
              <p>In</p>
            </div>
            <div className="share-user-control">
              <div
                className="share-main-mic"
                style={{
                  height: Math.round(controlHeight * 0.64),
                  marginLeft: 8
                }}
              >
                <MicrophoneLevel />
              </div>
              <p>{myData.micIsMuted ? "Unmute" : "Mute"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default inject("myData", "callStore")(observer(ShareScreen));
