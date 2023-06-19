import React, { Fragment } from "react";
import {inject, observer} from 'mobx-react';
import DevIndicator from "./DevIndicator";
import Profile from "./Profile";
import SelfieVideo from './SelfieVideo';
import MicrophoneLevel from './header/MicrophoneLevel';

const electron = window.require("electron");

class Header extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      microphoneDropdown: false,
      showProfile: false,
      muted: false,
    };
  }

  componentDidMount() {
    // listen for Profile menu click (main.js)
    electron.ipcRenderer.once("profile-open", (event, someParameter) => {
      let state = { ...this.state };
      state.showProfile = true;
      this.setState(state);
    });
  }

  myHandler = (obj) => {
    if (this.state.showProfile)
      if (obj.clientX >= 17 && obj.clientX <= 400)
        if (obj.clientY >= 106 && obj.clientY <= 252) {
          console.log("POPUP");
        } else {
          //Close Popup
          var state = { ...this.state };
          state.showProfile = false;
          this.setState(state);
          this.state.showProfile = false;
        }
  };

  isNothing = (el) => {
    if (el === undefined || el === null) return true;
    return false;
  };

  render() {
    const { callStore, myData } = this.props;

    document.body.addEventListener("click", this.myHandler);

    if (this.state.showProfile) {
      this.profilePopupClass = "dropdown-select show";
    } else {
      this.profilePopupClass = "dropdown-select hide";
    }

    let topContainerClass;
    if (callStore.callId) {
      topContainerClass = "top-container";
    } else {
      topContainerClass = "top-container";
    }

    electron.ipcRenderer.once("profile-open", (event, someParameter) => {
      let state = { ...this.state };
      state.showProfile = true;
      this.setState(state);
    });
    
    const microTheme = ((!myData.callId && !myData.currentPublicWorkspaceId) || callStore.knocking.inbound) ? "micro-out" : "micro"; 

    return (
      <Fragment>
        <Profile
          profilePopupClass={this.profilePopupClass}
          audioDevices={this.props.audioDevices}
          videoDevices={this.props.videoDevices}
          changeCamera={this.changeCamerahandler}
          changeMicrophone={this.changeMicrophoneHandler}
        />
        <div className={topContainerClass}>
          <SelfieVideo />

          <div className={microTheme}>
            <MicrophoneLevel />

            {!callStore.knocking.inbound && (myData.callId || myData.currentPublicWorkspaceId) && !myData.micIsMuted ? (<p>Mute</p>) : null}
            {!callStore.knocking.inbound && (myData.callId || myData.currentPublicWorkspaceId) && myData.micIsMuted ? (<p>Unmute</p>) : null}
            {((!myData.callId && !myData.currentPublicWorkspaceId) || callStore.knocking.inbound) ? (<p>Signal</p>) : null}
          </div>
          {myData.isCameraStatusOut ? (
            <div className="arrow mask">
              <img
                alt="Out Status"
                src={require("../../assets/images/status-line.png")}
              />
            </div>
          ) : null}
          <DevIndicator />
        </div>
      </Fragment>
    );
  }
}

export default inject('callStore', 'myData')(observer(Header));