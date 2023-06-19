import React from "react";
import { inject, observer } from "mobx-react";

const remote = window.require("electron").remote;
const trackEvent = remote.getGlobal("trackEvent");

const micIcons = [
  require("../../assets/images/Mic/small/S0.png"),
  require("../../assets/images/Mic/small/MB1.png"),
  require("../../assets/images/Mic/small/MB2.png"),
  require("../../assets/images/Mic/small/MB3.png"),
  require("../../assets/images/Mic/small/MB4.png"),
  // require("../../assets/images/Mic/small/S1.png"),
  // require("../../assets/images/Mic/small/S2.png"),
  // require("../../assets/images/Mic/small/S3.png"),
  // require("../../assets/images/Mic/small/S4.png"),
];

const muteMicIcons = [
  require("../../assets/images/Mic/small/S0.png"),
  require("../../assets/images/Mic/small/MB1.png"),
  require("../../assets/images/Mic/small/MB2.png"),
  require("../../assets/images/Mic/small/MB3.png"),
  require("../../assets/images/Mic/small/MB4.png"),
];

class UserThumbnail extends React.Component {
  constructor(props) {
    super(props);
    this.myVideo = React.createRef();
  }

  componentDidMount() {
    this.updateVideoStream();
  }

  componentDidUpdate() {
    this.updateVideoStream();
  }

  updateVideoStream = () => {
    const { workspaceStore, id, myData } = this.props;
    const user = workspaceStore.getUser(id);
    if (!user) return;
    const stream = this.isMe()
      ? myData.myPixelatedVideo
      : workspaceStore.getUserStream(user.id);

    if (
      stream &&
      this.myVideo &&
      this.myVideo.current &&
      this.myVideo.current.srcObject !== stream
    ) {
      this.myVideo.current.srcObject = stream;
    }
  };

  isMe = () => {
    const { id, myData } = this.props;
    return id === myData.userId;
  };

  renderImage = () => {
    const { id, workspaceStore, myData } = this.props;
    const user = workspaceStore.getUser(id);

    let parentStyles = { display: "block", cursor: "default" };
    if (this.isMe()) {
      parentStyles = { ...parentStyles, border: "2px solid #000062" };
    }

    return (
      <div
        className={this.isMe() ? "user-video" : "user-video opacity-cont"}
        style={parentStyles}
      >
        <img
          draggable={this.isMe()}
          className={`main-video ${user.status?.status}`}
          alt=""
          src={user.profile_pic}
          style={{ cursor: "default" }}
        />
        <p className="video-text" style={{ cursor: "default" }}>
          {this.isMe() ? "You" : user.short_name}
        </p>
      </div>
    );
  };

  renderNoVideoImage = () => {
    const { callStore, id, workspaceStore } = this.props;
    const user = workspaceStore.getUser(id);
    let micIcon = muteMicIcons[0];

    let fadeOut = { display: "block", cursor: "pointer" };

    if (callStore.callId) {
      fadeOut = { opacity: 0, cursor: "pointer" };
    }

    if (!this.isNothing(user.status))
      if (!user.status.micMuted) micIcon = micIcons[user.status.mic - 1];
      else micIcon = muteMicIcons[user.status.mic - 1];

    return (
      <div
        onClick={this.handleClick}
        style={fadeOut}
        data-component="UserThumbnail"
      >
        <div draggable={this.isMe()} className="user-video">
          <div className="user-no-video-container">
            <img
              style={{ width: "14px", height: "21px" }}
              alt="micIcon"
              src={micIcon}
            />
          </div>
          <p className="video-text">{user.short_name}</p>
        </div>
      </div>
    );
  };

  handleClick = () => {
    const { myData, clickable, callStore, id, afterClick, workspaceStore } =
      this.props;
    const user = workspaceStore.getUser(id);

    if (this.isMe() || !clickable) return;

    if (
      !this.isNothing(user.status) &&
      !this.isNothing(user.status.cameraStatus) &&
      user.status.cameraStatus === "Out"
    )
      return;

      callStore.startCall(user.id);
      callStore.emitUserCount();

    if (workspaceStore.currentPublicWorkspaceId !== null) {
      trackEvent("Public Spaces Add Person", "Knocking");
    } else {
      trackEvent("Call Initiated", "Knocking");
    }

    if (afterClick) {
      afterClick();
    }
  };

  renderVideo = () => {
    const { id, workspaceStore, callStore } = this.props;
    const user = workspaceStore.getUser(id);

    let fadeOut = { display: "block", cursor: "pointer" };
    let micIcon = muteMicIcons[0];

    if (!this.isNothing(user.status)) {
      if (!this.isNothing(user.status.micMuted)) {
        if (!user.status.micMuted) {
          if (user.status.mic) {
            micIcon = micIcons[user.status.mic - 1];
          } else {
            micIcon = muteMicIcons[0];
          }
        } else {
          micIcon = muteMicIcons[user.status.mic - 1];
        }
      } else {
        micIcon = micIcons[user.status.mic - 1];
      }
    }

    if (micIcon === undefined) micIcon = muteMicIcons[0];
    return (
      <div onClick={this.handleClick} style={fadeOut}>
        <div draggable={this.isMe()} className="user-video">
          <div
            className="user-video-container"
            style={this.isMe() ? { border: "2px solid #000062" } : {}}
          >
            <video
              className={`main-video ${user.status?.status}`}
              ref={this.myVideo}
              autoPlay={true}
            ></video>
          </div>
          <p className="video-text">{this.isMe() ? "You" : user.short_name}</p>
          {!this.isMe() && (
            <div className="icon">
              <img
                style={{ width: "14px", height: "21px" }}
                alt="mic"
                src={micIcon}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  isNothing = (el) => {
    if (el === undefined || el === null) return true;
    return false;
  };

  renderThumbnail = () => {
    const { workspaceStore, id, clickable, myData } = this.props;
    const user = workspaceStore.getUser(id);

    if (!user) return <></>;

    const stream = this.isMe()
      ? myData.myPixelatedVideo
      : workspaceStore.getUserStream(id);

    if (clickable === true && workspaceStore.isUserInPublicWorkspace(id)) {
      return this.renderImage();
    }

    if (this.isNothing(stream)) {
      if (!this.isNothing(user.status)) {
        if (!this.isNothing(user.status.status)) {
          if (user.status.status === "No Video") {
            return this.renderNoVideoImage();
          }
        }
      }
      return this.renderImage();
    } else {
      if (!this.isNothing(user.status)) {
        if (!this.isNothing(user.status.status)) {
          switch (user.status.status) {
            case "In":
              return this.renderVideo();
            case "Out":
              return this.renderImage();
            case "No Video":
              return this.renderNoVideoImage();
            default:
              return this.renderVideo();
          }
        } else {
          return this.renderVideo();
        }
      } else {
        return this.renderVideo();
      }
    }
  };

  render() {
    const { workspaceStore } = this.props;

    return (
      <div
        style={{ display: "block" }}
        data-component={`UserThumbnail-${workspaceStore.streamCounter}`}
      >
        <div>{this.renderThumbnail()}</div>
      </div>
    );
  }
}
export default inject(
  "callStore",
  "workspaceStore",
  "myData"
)(observer(UserThumbnail));
