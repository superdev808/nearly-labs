import React from "react";
import {inject, observer} from "mobx-react";
import DumbHeader from "./DumbHeader";
import { Redirect } from "react-router-dom";
// MARK fix this
// import * as electronUtils from 'electron-util';
// const { api, openSystemPreferences } = electronUtils;
//
const electron = window.require("electron").remote;
const systemPreferences = electron.systemPreferences;
const trackEvent = electron.getGlobal("trackEvent");
const {openSystemPreferences, api, enforceMacOSAppLocation} = window.require("electron-util");

class FinishSetup extends React.Component {
  constructor(props) {
    super(props);
    localStorage.removeItem("DefaultCamera");
    localStorage.removeItem("DefaultMicrophone");
    this.camera = {};
    this.microphone = {};
    this.timer = null;
    this.state = {
      videoDevices: [],
      audioDevices: [],
      redirect: false,
      cameraSelectorText: "Please select your camera",
      microphoneSelectorText: "Please select your microphone",
      screenShareSelectorText: "Click to allow in preferences",
      redirectURL: "",
      disabled: false,
      allDone: false,
    };
  }

  cameraClickHandler = () => {
    console.log("cameraClickHandler");
    if (systemPreferences.getMediaAccessStatus("camera") === "not-determined") {
      var state = { ...this.state };
      state.cameraSelectorText = "Waiting for permission approval";
      state.disabled = true;
      this.setState(state);
      systemPreferences.askForMediaAccess("camera").then((res) => {
        console.log(res);
        var state = { ...this.state };
        state.disabled = false;
        this.setState(state);
        if (res === true) {
          navigator.mediaDevices.enumerateDevices().then((deviceInfos) => {
            let videoDevices = [];
            for (var i = 0; i !== deviceInfos.length; ++i) {
              var deviceInfo = deviceInfos[i];
              if (deviceInfo.kind === "videoinput") {
                videoDevices.push(deviceInfo);
              }
            }
            var state = { ...this.state };
            if (videoDevices.length > 0) {
              state.selectedCamera = videoDevices[0].deviceId;
              localStorage.setItem("DefaultCamera", videoDevices[0].deviceId);
            }
            state.cameraSelectorText = "Please select your camera";
            state.videoDevices = videoDevices;
            this.setState(state, () => {
              console.log("===========", this.state);
            });
          });
        } else {
          state = { ...this.state };
          state.cameraSelectorText = "Please select your camera";
          this.setState(state, () => {
            localStorage.setItem("DefaultCamera", "NO CAMERA PERMISSION");
          });
        }
      });
    }
  };
  cameraChangeHandler = (event) => {
    let deviceId = event.target.value;
    console.log(deviceId);
    let state = { ...this.state };
    state.selectedCamera = deviceId;
    this.setState(state, () => {
      console.log("New State is ", this.state);
    });
    localStorage.setItem("DefaultCamera", event.target.value);
    console.log("Saving Default Camera as " + event.target.value);
    this.checkIfSelectionDone();
  };

  checkIfSelectionDone = () => {
    var state = { ...this.state };
    if (
      localStorage.getItem("DefaultCamera") !== null &&
      localStorage.getItem("DefaultMicrophone") !== null &&
      localStorage.getItem("DefaultCamera") !== "0" &&
      localStorage.getItem("DefaultMicrophone") !== "0"
    ) {
      state.allDone = true;
      localStorage.setItem("permissions", true);
    } else {
      state.allDone = false;
    }
    this.setState(state);
  };
  microphoneClickHandler = () => {
    console.log(
      "microphoneClickHandler",
      systemPreferences.getMediaAccessStatus("microphone")
    );
    if (
      systemPreferences.getMediaAccessStatus("microphone") === "not-determined"
    ) {
      var state = { ...this.state };
      state.microphoneSelectorText = "Waiting for permission approval";
      state.disabled = true;
      this.setState(state);
      systemPreferences.askForMediaAccess("microphone").then((res) => {
        var state = { ...this.state };
        state.disabled = false;
        this.setState(state);
        console.log(res);
        if (res === true) {
          navigator.mediaDevices.enumerateDevices().then((deviceInfos) => {
            let audioDevices = [];
            for (var i = 0; i !== deviceInfos.length; ++i) {
              var deviceInfo = deviceInfos[i];
              if (deviceInfo.kind === "audioinput") {
                if (deviceInfo.label.indexOf("Default") === -1)
                  audioDevices.push(deviceInfo);
              }
            }
            var state = { ...this.state };
            if (audioDevices.length > 0) {
              state.selectedMicrophone = audioDevices[0].deviceId;
              localStorage.setItem(
                "DefaultMicrophone",
                audioDevices[0].deviceId
              );
            }
            state.microphoneSelectorText = "Please select your microphone";
            state.audioDevices = audioDevices;
            this.setState(state);
          });
        } else {
          state = { ...this.state };
          state.microphoneSelectorText = "Please select your microphone";
          this.setState(state, () => {
            localStorage.setItem(
              "DefaultMicrophone",
              "NO MICROPHONE PERMISSION"
            );
          });
        }
      });
    }
  };
  // MARK
  screenShareClickHandler = () => {
    if (systemPreferences.getMediaAccessStatus("screen") !== "granted") {
      api.app.relaunch();
      api.desktopCapturer
      .getSources({ types: ["screen"] })
      .then(async (sources) => {
        sources.reverse();
        console.log(sources);
        this.setState({ screens: sources });
      });
      // api.desktopCapturer.getSources({ types: ['window', 'screen'] }).then(async sources => {
      //     try {
      //       const stream = await navigator.mediaDevices.getUserMedia({
      //         audio: false,
      //         video: {
      //           mandatory: {
      //             chromeMediaSource: 'desktop',
      //             chromeMediaSourceId: sources.id,
      //             minWidth: 0,
      //             maxWidth: 5000,
      //             minHeight: 0,
      //             maxHeight: 5000
      //           }
      //         }
      //       })
      //       //handleStream(stream)
      //       } catch (e) {
      //         console.log(e);
      //         //handleError(e);
      //       }
      //       return;
      //     }
      // );
      //openSystemPreferences('security', 'Privacy_ScreenCapture');
    }
    else {
      this.state.screenShareSelectorText = "Permissions granted";
    }
    console.log("screenShareClickHandler called.");
  };
  screenShareChangeHandler = () => {
    if (systemPreferences.getMediaAccessStatus("screen") !== "granted") {
      api.app.relaunch();
      
      //openSystemPreferences('security', 'Privacy_ScreenCapture');
    }
    else {
      this.state.screenShareSelectorText = "Permissions granted";
    }
    console.log("screenShareChangeHandler called.");
  };
  continueBtnHandler = () => {
    var state = { ...this.state };
    state.redirect = true;
    clearInterval(this.timer);
    if (localStorage.getItem("me.firstTime") === "true") {
      state.redirectURL = "/InviteCoworker";
    }
    else {
      state.redirectURL = "/Dashboard";
      // Track Event for amount of live users in Workspace
      const { workspaceStore } = this.props;
      let numCoworkers = workspaceStore.activeUsers + 1;
      trackEvent("Enter Workspace", numCoworkers);
    }
    this.setState(state);
  };
  microphoneChangeHandler = (event) => {
    let deviceId = event.target.value;
    console.log(deviceId);
    let state = { ...this.state };
    state.selectedMicrophone = deviceId;
    this.setState(state, () => {
      console.log("New State is ", this.state);
    });
    localStorage.setItem("DefaultMicrophone", deviceId);
    console.log("Saving Default Microphone as " + deviceId);
    this.checkIfSelectionDone();
  };
  renderRedirect = () => {
    if (this.state.redirect) {
      console.log("Redirecting from Finish Setup to " + this.state.redirectURL);
      return <Redirect to={this.state.redirectURL} />;
    }
  };
  componentDidMount = () => {
    const { workspaceStore } = this.props;
    document.title = `Nearly - ${workspaceStore.workspaceName}`;

    // Check first run settings for analytics event tracking (0 = False or not granted, 1 = True or granted)
    if (systemPreferences.getMediaAccessStatus("camera") === "granted") {
      trackEvent("First Run", "CameraPermission", 1);
    }
    else {
      trackEvent("First Run", "CameraPermission", 0);
    }
    if (systemPreferences.getMediaAccessStatus("microphone") === "granted") {
      trackEvent("First Run", "MicrophonePermissions", 1);
    }
    else {
      trackEvent("First Run", "MicrophonePermissions", 0);
    }
    if (systemPreferences.getMediaAccessStatus("screen") === "granted") {
      trackEvent("First Run", "ScreenSharePermissions", 1);
    }
    else {
      trackEvent("First Run", "ScreenSharePermissions", 0);
    }

    setTimeout(() => {
      if (systemPreferences.getMediaAccessStatus("camera") === "granted") {
        console.log("Camera Permissions - TRUE");
        navigator.mediaDevices.enumerateDevices().then((deviceInfos) => {
          console.log(deviceInfos);
          let audioDevices = [];
          let videoDevices = [];
          for (var i = 0; i !== deviceInfos.length; ++i) {
            var deviceInfo = deviceInfos[i];
            if (deviceInfo.kind === "audioinput") {
              if (deviceInfo.label.indexOf("Default") === -1)
                audioDevices.push(deviceInfo);
            }
            if (deviceInfo.kind === "videoinput") {
              videoDevices.push(deviceInfo);
            }
          }
          var state = { ...this.state };
          if (videoDevices.length > 0) {
            state.selectedCamera = videoDevices[0].deviceId;
            localStorage.setItem("DefaultCamera", videoDevices[0].deviceId);
          }
          if (audioDevices.length > 0) {
            state.selectedMicrophone = audioDevices[0].deviceId;
            localStorage.setItem("DefaultMicrophone", audioDevices[0].deviceId);
          }
          state.audioDevices = audioDevices;
          state.videoDevices = videoDevices;
          this.setState(state, () => {
            this.checkIfSelectionDone();
          });
        });
      }
    }, 1000);
  };
  render() {
    //enforceMacOSAppLocation(); // Forces the user to have the program in the applications folder on mac.
    if (this.timer === null)
      this.timer = setInterval(() => {
        this.checkIfSelectionDone();
      }, 1000);
    return (
      <div className="nearly-container">
        {this.renderRedirect()}
        <DumbHeader />
        <div className="main-login-container">
          <div className="logo-container">
            <p className="logo-title finish-heading">Finish Setup</p>
          </div>
          <p className="finish-setup-text">
            Please select your perferred Camera and Microphone for Nearly. The
            OS will ask for permssions. Please approve!
          </p>
          <div className="check-informaion">
            <div className="select-box" style={{ marginRight: "0px" }}>
              <div className="select-lable">Camera:</div>
              <div className="selectdiv">
                <label>
                  <select
                    onClick={this.cameraClickHandler}
                    onChange={this.cameraChangeHandler.bind(this)}
                    // value={this.state.selectedCamera}
                    disabled={this.state.disabled}
                  >
                    <option value="0">{this.state.cameraSelectorText} </option>
                    {this.state.videoDevices.map((device, index) => {
                      return (
                        <option
                          key={index}
                          value={device.deviceId}
                          selected={index === 0 ? true : false}
                        >
                          {device.label.replace(/ *\([^)]*\) */g, "")}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </div>
            </div>
            <div className="select-box" style={{ marginRight: "0px" }}>
              <div className="select-lable">Microphone:</div>
              <div className="selectdiv">
                <label>
                  <select
                    onClick={this.microphoneClickHandler}
                    onChange={this.microphoneChangeHandler.bind(this)}
                    // value={this.state.selectedMicrophone}
                    disabled={this.state.disabled}
                  >
                    <option value="0">
                      {this.state.microphoneSelectorText}
                    </option>
                    {this.state.audioDevices.map((device, index) => {
                      return (
                        <option
                          key={index}
                          value={device.deviceId}
                          selected={index === 0 ? true : false}
                        >
                          {device.label}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </div>
            </div>
            <div className="select-box" style={{ marginRight: "0px", whiteSpace: 'nowrap' }}>
              {/* MARK */}
              <div className="select-lable">Screen Sharing:</div>
              <div className="selectdiv">
                <label>
                  <select
                    onClick={this.screenShareClickHandler}
                    onChange={this.screenShareChangeHandler}
                    disabled={this.state.disabled}
                  >
                    <option value="0">
                      {this.state.screenShareSelectorText}
                    </option>
                  </select>
                </label>
              </div>
            </div>
          </div>
          <p className="privecy-text" style={{ width: "350px" }}>
            Privacy: Nearly gives you complete control over your camera and mic.
            You can turn them on or off any time. Without permissions, the app
            doesn't do much.{" "}
          </p>
        </div>
        {this.state.allDone ? (
          <div
            className="continue-container"
            style={{ marginTop: "48px", cursor: "pointer" }}
            onClick={this.continueBtnHandler}
          >
            <img
              src={require("./../../assets/images/continueBtn.png")}
              alt="Continue"
            />
          </div>
        ) : null}
      </div>
    );
  }
}
export default inject('workspaceStore')(observer(FinishSetup));
