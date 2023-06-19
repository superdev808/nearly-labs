import React from 'react';
import { inject, observer } from 'mobx-react';
import { videoStatus } from '../../state/Me';
import CameraDropDown from './header/CameraDropDown';

const electron = window.require("electron");
const blankImage = require("./../../assets/images/blank.png");

class SelfieVideo extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      cameraDropdown: false,
      forScreenShare: props.forScreenShare ? props.forScreenShare : false,
    };

    this.selfieVideo = React.createRef();
  }

  componentDidMount() {
    this.updateVideoStream();
  }

  componentDidUpdate() {
    this.updateVideoStream();
  }

  updateVideoStream = () => {
    const { myData, callStore } = this.props;
    if (!this.selfieVideo || !this.selfieVideo.current)
      return

    if (callStore.currentPublicWorkspaceId || callStore.callId) {
      if (this.selfieVideo.current.srcObject !== myData.myClearVideo) {
        this.selfieVideo.current.srcObject = myData.myClearVideo;
      }
    } else {
      if (this.selfieVideo.current.srcObject !== myData.myPixelatedVideo) {
        this.selfieVideo.current.srcObject = myData.myPixelatedVideo;
      }
    }

    /* if (callStore.callId) {
        if (this.selfieVideo.current.srcObject !== myData.myClearVideo) {
            this.selfieVideo.current.srcObject = myData.myClearVideo;
        }
    } else {
        if (this.selfieVideo.current.srcObject !== myData.myClearVideo) {
            this.selfieVideo.current.srcObject = myData.myClearVideo;
        }
    } */
  }

  sendIPCToMainProcess = (obj) => {
    console.log("Sending IPC to MAIN PROCESS", obj);
    electron.ipcRenderer.send("FOR-MAINPROCESS", obj);
  };

  toggleCameraDropdown = () => {
    const { callStore } = this.props;
    const { cameraDropdown } = this.state;

    if (callStore.isMyScreenShared) {
      this.sendIPCToMainProcess({ type: "SHARE-CONTROL-DROP-DOWN", cameraDropdown: !cameraDropdown });
    }

    this.setState({
      cameraDropdown: !cameraDropdown,
    });
  }

  isNoVideo = () => {
    const { cameraStatus } = this.props.myData;
    return cameraStatus === "No Video";
  }

  render() {
    const { myData, callStore, videoWidth, videoHeight } = this.props;
    const { forScreenShare } = this.state;
    const { profile_pic } = myData

    let InVideoStyle = { display: "none" };
    const videoTopStyle = forScreenShare === true ? { cursor: "pointer", display: "flex" } : { cursor: "pointer" };

    if (myData.isCameraStatusIn) {
      InVideoStyle.display = "block";
    }

    if (callStore.currentPublicWorkspaceId || callStore.callId) {
      InVideoStyle.filter = ""
    } else {
      InVideoStyle.filter = "grayscale(100) blur(2px)";
    }

    if (videoWidth && videoHeight) {
      InVideoStyle.width = videoWidth;
      InVideoStyle.height = videoHeight;
      videoTopStyle.width = videoWidth;
      videoTopStyle.height = videoHeight;
    }

    let cameraStyle;
    if (!this.state.cameraDropdown) {
      cameraStyle = {
        display: "none",
      };
    }

    return (
      <div
        className="video"
        style={videoWidth && videoHeight ? { width: videoWidth, height: videoHeight } : {}}
        onClick={this.toggleCameraDropdown}
      >
        <div className="top-video" style={videoTopStyle}>
          {this.isNoVideo() &&
            <img src={profile_pic} alt="participant" className="main-video my-video hand selfie" />
          }
          <video
            ref={this.selfieVideo}
            id="selfie_video"
            className="main-video my-video hand selfie"
            style={InVideoStyle}
            autoPlay={true}
            muted={true}
            data-forceupdate={`${myData.streamCounter}-${callStore.streamCounter}`}
          />

          {myData.isCameraStatusOut ? (
            <img
              className="main-video my-video"
              style={{ opacity: "0.15", cursor: "pointer" }}
              src={blankImage}
              alt={videoStatus.out}
            />
          ) : null}
        </div>
        {!forScreenShare && <p>{myData.cameraStatus}</p>}

        <CameraDropDown
          profile_pic={myData.profile_pic}
          cameraDropdown={cameraStyle}
        />
      </div>
    );
  }
}

export default inject('myData', 'callStore')(observer(SelfieVideo));