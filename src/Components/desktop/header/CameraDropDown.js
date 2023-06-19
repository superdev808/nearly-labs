import React from "react";
import {inject, observer} from 'mobx-react';
import CameraTick from './CameraTick';
import { videoStatus } from '../../../state/Me';

const remote = window.require("electron").remote;
const trackEvent = remote.getGlobal("trackEvent");

class CameraDropDown extends React.Component {
    constructor(props) {
      super(props);
      this.myInVideo = React.createRef();
    }

    componentDidMount() {
      this.updateVideoStream();
    }
  
    componentDidUpdate() {
      this.updateVideoStream();
    }
  
    updateVideoStream = () => {
      const { myData, callStore } = this.props;
  
      if (callStore.callId) {
        if (this.myInVideo.current.srcObject !== myData.myClearVideo) {
          this.myInVideo.current.srcObject =  myData.myClearVideo;
        }
      } else {
        if (this.myInVideo.current.srcObject !== myData.myPixelatedVideo) {
          this.myInVideo.current.srcObject =  myData.myPixelatedVideo;
        }
      }
    }

    setVideoIn = () => {
      const {myData} = this.props;
      trackEvent("Set Selfie Video", "In");
      myData.setVideoIn();
    }
    setVideoNone = () => {
      const {myData} = this.props;
      trackEvent("Set Selfie Video", "No Video");
      myData.setVideoNone();
    }
    setVideoOut = () => {
      const {myData} = this.props;
      trackEvent("Set Selfie Video", "Out");
      myData.setVideoOut();
    }
  
    render () {
      const { myData, profile_pic, cameraDropdown = {} } = this.props;
      const blurEffect = { filter: "blur(1px) grayscale(100%)" };
  
      return (
        <div className="dropdown" style={cameraDropdown}>
        <div className="drop">
          <div
            className="video-box"
            onClick={this.setVideoIn}
          >
            <CameraTick status={videoStatus.in} />
            <div
              className="dropdown-thumbnail"
              style={{ filter: "grayscale(100%)" }}
            >
              <video
                ref={this.myInVideo}
                className="main-video my-video blur-efect1 hand "
                style={ myData.isCameraStatusIn ? null : blurEffect }
                autoPlay
                muted
              />
            </div>
            <p
              className="video-text"
              style={{ marginLeft: "13px", marginTop: "3px" }}
            >
              In
            </p>
          </div>
  
          <div
            className="video-box"
            onClick={this.setVideoNone}
          >
            <CameraTick status={videoStatus.noVideo} />
            <div className="user-video fright">
              <video
                className="main-video my-video blur-efect1 hand"
                autoPlay
                muted
              />
              <p className="video-text">No Video</p>
            </div>
          </div>
  
          <div
            className="video-box"
            onClick={this.setVideoOut}
          >
            <CameraTick status={videoStatus.out} />
            <div className="user-video fright">
              <img
                className="main-video my-video"
                style={{ opacity: "0.15", cursor: "pointer" }}
                src={profile_pic}
                alt={videoStatus.out}
              />
              <p className="video-text">Out</p>
            </div>
          </div>
        </div>
      </div>
      );
    }
  }
  export default inject('callStore', 'myData')(observer(CameraDropDown));