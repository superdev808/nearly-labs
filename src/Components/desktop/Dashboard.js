import React, { Fragment } from "react";
import {inject, observer} from "mobx-react";
import Header from "./Header";
import AudoUpdatePopup from "./AudoUpdatePopup";
import { core as WebRTC } from "../../assets/js/webrtc.js";
import NoInternet from "./NoInternet";
import ShareScreen from "./ShareScreen";
import BeingKnocked from "./screens/BeingKnocked";
import Knocking from "./screens/Knocking";
import CallScreen from "./screens/CallScreen";
import TitleBar from "./TitleBar";
import Coworkers from './Coworkers';
import PublicWorkspacePreview from "./PublicWorkspacePreview";
import { Redirect } from "react-router";

import axios from "axios";
import { SIGNAL_SERVER } from "../../config/default";

const remote = window.require("electron").remote;
const trackEvent = remote.getGlobal("trackEvent");
const electron = window.require("electron");

const inviteArrow = require("../../assets/images/invite-arrow.png");

export class Dashboard extends React.Component {
  constructor(props) {
    super(props);

    this.updateTimer = null;
    this.noInternetTimer = null;

    //State Variable
    this.state = {
      blur: false,
      noInternet: false,
      me: {
        myCallAudio: true,
        myCallVideo: true,
        micMuted: true,
        profile_pic: "",
      },

      audioDevices: [],
      videoDevices: [],

      logoutSuccess: false,
      activeUserCount: 0,
    };
  }

  showNoInternetDialog = () => {
    if (this.state.me.cameraStatus === "Out") return true;
    let isConnected;
    try {
      isConnected = WebRTC.isConnected();
    } catch (e) {
      isConnected = false;
    }
    try {
      if (isConnected !== true) {
        setTimeout(() => {
          if (WebRTC.isConnected() !== true)
            electron.ipcRenderer.send("NO-INTERNET");
        }, 2000);
        return false;
      }
    } catch (e) {}

    return true;
  };

  handleVisibilityChange = () => {
    return;
  };

  sendIPCToBGWindow = (obj) => {
    console.log("Sending IPC to BG Window", obj);
    electron.ipcRenderer.send("FOR-BGWINDOW", obj);
  };

  sendIPCToMainProcess = (obj) => {
    console.log("Sending IPC to MAIN PROCESS", obj);
    electron.ipcRenderer.send("FOR-MAINPROCESS", { ...obj });
  };

  componentDidMount = () => {
    trackEvent("Workspace opened");
    const { workspaceStore, callStore, myData } = this.props;
    workspaceStore.loadWorkspaceData();
    myData.loadMyData();

    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    electron.ipcRenderer.on("RELAUNCHED", (event, obj) => {
      console.log("Relaunched:", myData.outTime);
      console.log("argv", process.argv);
    });
    console.log("argv", process.argv);

    electron.ipcRenderer.on("FOR-MAINWINDOW", (event, obj) => {
      console.log("FOR-MAINWINDOW", obj);
      switch (obj.type) {
        case "TO-IN":
          console.log("IPC > Switching to  In State");
          if (myData.isCameraStatusOut) {
            this.sendIPCToMainProcess("SHOW-DOCK-ICON");
            this.sendIPCToMainProcess("BRING-TO-FRONT");
            this.setToInVideo();
          }
          break;
        case "TO-OUT":
          return;
          if (myData.cameraStatus !== "Out") this.setToOutVideo();
          if (obj.quit) {
            alert("App Quitting");
          }
          break;
        case "CLOSE":
          callStore.hangupCall();
          callStore.leaveSpace();
          electron.ipcRenderer.send("FOR-MAINPROCESS", { type: "CALL_HANG_UP_BEFORE_CLOSE_WINDOW"});
          break;
        default:
      }
    });
    electron.ipcRenderer.on("IDLE-TIMEOUT", (event, someParameter) => {
      console.log("IDLE-TIMEOUT");
      if (callStore.callId === null && callStore.currentPublicWorkspaceId === null) {
        this.setToOutVideo();
      }
    });
    electron.ipcRenderer.on("LOCK-SCREEN", (event, someParameter) => {
      console.log("LOCK-SCREEN IPC CALLED", myData.cameraStatus);
      localStorage.setItem("beforeLockStatus", myData.cameraStatus);
      if (myData.isCameraStatusOut) return;
      this.setToOutVideo();
    });

    electron.ipcRenderer.on("UNLOCK-SCREEN", (event, someParameter) => {
      myData.loadMyData();
      console.log(
        "UNLOCK-SCREEN IPC CALLED",
        localStorage.getItem("beforeLockStatus")
      );
      // Old logic for using saved video state on wakeup: updated as per this card: https://trello.com/c/Eyed6OmW/368-camera-stays-on-when-user-goes-to-lock-screen-or-display-black
      // if (myData.cameraStatus === "Out") {
      //   if (myData.previousStatus === "No Video") {
      //     myData.setVideoNone();
      //   }
      //   else {
      //     myData.setVideoIn();
      //   }
      // }
      myData.setVideoIn();
      // Old logic, being replaced by above, left in so you can clearly see the change
      // if (localStorage.getItem("beforeLockStatus") === "Out") return;

      // localStorage.setItem(
      //   "myCameraStatus",
      //   localStorage.getItem("beforeLockStatus")
      // );
      // localStorage.removeItem("beforeLockStatus");
      // console.error("Restarting with ", localStorage.getItem("myCameraStatus"));
      // window.location.reload();
    });

    this._isMounted = true;
    if (!this.isLoggedIn()) {
      return this.logout();
    }

    /* try {
      WebRTC.socket = null;
    } catch (e) {} */

    WebRTC.load();
    WebRTC.onDisconnected(() => {
      // TODO: logout bug...
      console.error("OnDisconected Called", WebRTC.socket);
      setTimeout(() => {
        if (!myData.isCameraStatusOut)
          try {
            if (!WebRTC.isConnected()) {
              this.setState({ noInternet: true });
            }
          } catch (e) {}
      }, 3000);
    });

    WebRTC.onConnected(() => {
      console.log("onConnected() Called");
      this.setState({ noInternet: false });
      WebRTC.login(
        myData.email,
        myData.securitySeed,
        workspaceStore.workspaceId,
        (err, userId, userData) => {
          console.log("WebRTC.login() callback");
          if (err) {
            return this.logout();
          }

          //this.sendIPCToBGWindow({ type: "START-INOUT-SCHEDULE" });

          let state = { ...this.state };
          state.me.profile_pic = userData.profile_pic;
          myData.setProfilePicture(userData.profile_pic);

          if (this._isMounted)
            this.setState(state, () => {
              this.init();

              switch (myData.cameraStatus) {
                case "In":
                  workspaceStore.joinWorkspace();
                  this.setToInVideo();
                  break;

                case "No Video":
                  workspaceStore.joinWorkspace();
                  this.setToNoVideo();
                  break;

                case "Out":
                  this.setToOutVideo();
                  break;

                default:
                  break;
              }
            });
        }
      );
    });

    this.activeUsersInterval = setInterval(() => {
      const env = localStorage.getItem("ENV");
      const signalServerURL = SIGNAL_SERVER[env ? env : "PRODUCTION"];
      let reqURL = null;
      if (env === "PRODUCTION") {
        reqURL = `${signalServerURL.split(":443").join(":8891")}userCount/${workspaceStore.workspaceId}/${myData.userId}`;
      }
      else {
        reqURL = `${signalServerURL.split(":8890").join(":8891")}userCount/${workspaceStore.workspaceId}/${myData.userId}`;
      }
      axios.post(reqURL, {})
        .then((response) => {
          let updatedActiveUserCount = parseInt(response.data);
          if (updatedActiveUserCount !== NaN) {
            this.setState({
              activeUserCount: updatedActiveUserCount
            });
          }
        }).catch((error) => {
          console.log(error);
        })
    }, 2000);
  };

  componentWillUnmount = () => {
    clearInterval(this.activeUsersInterval);
    this._isMounted = false;
  };

  init = () => {
    WebRTC.getDevices((err, devices) => {
      if (err) return console.error(err);
      console.log("getDevices", devices);
      var state = { ...this.state };
      state.audioDevices = devices.audio;
      state.videoDevices = devices.video;
      if (this._isMounted) this.setState(state);
    });
  };

  isNothing = (el) => {
    if (el === undefined || el === null) return true;
    return false;
  };

  setToInVideo = () => {
    this.props.myData.setVideoIn();
  }

  setToNoVideo = () => {
    this.props.myData.setVideoNone();
  }

  setToOutVideo = () => {
    this.props.myData.setVideoOut();
  };

  changeCameraStatus = (status) => {
    const { callStore } = this.props;

    if (this.showNoInternetDialog() === false) return;
    if (this.state.callAccepted === true) {
      switch (status) {
        case "In":
          if (this.state.me.myCallVideo === true) return;
          console.log("Starting Toggle Now");
          var state = { ...this.state };
          state.me.myCallVideo = true;

          this.setState(state, () => {
            WebRTC.callToggleMedia(
              'call',
              callStore.callId,
              null,
              -1,
              (err, audio, video) => {
                if (err) {
                  console.error(err, audio, video);
                  return;
                }
                console.log("Switching to In Complete");
              }
            );
          });

          break;
        case "No Video":
          if (this.state.me.myCallVideo === false) return;
          WebRTC.callToggleMedia('call', callStore.callId, null, -1, (err, audio, video) => {
            if (err) {
              return;
            }
            var state = { ...this.state };
            state.me.myCallVideo = false;

            this.setState(state);
          });
          break;
        case "Out":
          // this.hangupCall();
          setTimeout(() => {
            this.setToOutVideo();
          }, 1000);
          break;
        default:
          console.error("PROBLEM3");
          break;
      }
    } else
      switch (status) {
        case "In":
          this.setToInVideo();
          break;

        case "Out":
          this.setToOutVideo();
          break;

        case "No Video":
          this.setToNoVideo();
          break;
        default:
          console.error("PROBLEMMMMMMMMMMMMM");
          this.setToInVideo();
          break;
      }
  };

  createNoPermissionMarkup = () => {
    return { __html: this.noPermissionsText };
  };

  isLoggedIn = () => {
    if (localStorage.getItem("me.securitySeed") !== null) return true;
    return false;
  };

  renderNoInternet = () => {
    if (this.state.noInternet === true) return <NoInternet />;
  };


  renderRedirect = () => {
    if (this.state.logoutSuccess) {
      console.log("Redirecting from Dashboard to Splash");
      return <Redirect to='/Splash'/>;
    }
  }
  logout = () => {
    const {myData} = this.props;
    myData.logout(() => {
      this.setState({
        logoutSuccess: true,
      });
    });
  }

  joinToWorkSpace = (publicWorkspaceId) => {
    const {myData,callStore} = this.props;
    callStore.joinSpace(publicWorkspaceId, true, true);
  }

  render() {
    //Check if Logged In or Not
    const { workspaceStore, callStore, myData } = this.props;
    const { activeUserCount } = this.state;
    let activeUsersText = '';

    if (myData.isCameraStatusOut) {
      switch (activeUserCount) {
        case 0:
          activeUsersText = `There are no active coworkers in the ${workspaceStore.workspaceName} workspace`;
          break;

        case 1:
          activeUsersText = `There is 1 active coworker in the ${workspaceStore.workspaceName} workspace`;
          break;

        default:
          activeUsersText = `There are ${activeUserCount} active coworkers in the ${workspaceStore.workspaceName} workspace`;
          break;
      }
    }

    this.noPermissionsText = "";
    this.noPermissionsText =
      localStorage.getItem("permissions") === "false"
        ? "But you can't see them because your Camera and Microphone permissions were denied.<br /><br /> Please allow permissions in System Preferences under Security & Privacy > Privacy"
        : 'Set your status to "In" to see them.';

    if (this.noInternetTimer === null)
      this.noInternetTimer = setInterval(() => {
        if (!myData.isCameraStatusOut)
          try {
            this.setState({ noInternet: !WebRTC.isConnected() });
          } catch (e) {}
      }, 60000);
    if (this.updateTimer === null) {
      setTimeout(() => {
        if (!myData.isCameraStatusOut)
          try {
            this.setState({ noInternet: !WebRTC.isConnected() });
          } catch (e) {}
      }, 5000);
      console.log("Checking Auto Update -> Sending IPC to Main");
      electron.ipcRenderer.send("CHECK-AUTO-UPDATE");
      this.updateTimer = setInterval(() => {
        let dt = new Date(localStorage.getItem("me.createdAt"));
        let now = new Date();
        if (
          now.getHours() === dt.getHours() &&
          now.getMinutes() === dt.getMinutes()
        ) {
          console.log("Checking Auto Update -> Sending IPC to Main");
          electron.ipcRenderer.send("CHECK-AUTO-UPDATE");
        }
      }, 58000);
    }

    return (
      // Implement header and all that from the fragment below!
      <Fragment>
        {this.renderRedirect()}
        {callStore.screenShareId === null ? (
          <div className="video-container"
            data-forcerender={`${callStore.streamCounter}`}
            style={{
              width: remote.getCurrentWindow().webContents.getOwnerBrowserWindow().getBounds().width, 
              height: remote.getCurrentWindow().webContents.getOwnerBrowserWindow().getBounds().height 
            }}
          >
            {this.renderNoInternet()}
            <AudoUpdatePopup />
            <TitleBar />
            <Header
              me={this.state.me}
              changeCameraStatus={this.changeCameraStatus}
              audioDevices={this.state.audioDevices}
              videoDevices={this.state.videoDevices}
            />

            {
              (!(myData.isCameraStatusOut || callStore.callId || callStore.currentPublicWorkspaceId)
              || myData.isCameraStatusOut && workspaceStore.coworkers.length >= 0)
              && <div className="user-container">
                {(myData.isCameraStatusOut || callStore.callId || callStore.currentPublicWorkspaceId)
                  ? null
                  : <Coworkers />
                }

                {myData.isCameraStatusOut && workspaceStore.coworkers.length >= 0 ? (
                  <p className="set-status-text">
                    {activeUsersText}
                    <br />
                    <br />
                    <span
                      dangerouslySetInnerHTML={this.createNoPermissionMarkup()}
                    ></span>
                  </p>
                ) : null}
              </div>
            }

            {
              // in a call already; not knocking or being knocked
              // !callStore.knocking.inbound &&
              ((callStore.currentPublicWorkspaceId || callStore.callId || callStore.knocking.inbound) && !callStore.knocking.outbound) && (
                <CallScreen dash={this.state} />
              )
            }

            {callStore.knocking.outbound && (
              <Knocking />
            )}

            {
              // callStore.knocking.inbound && (
                // <BeingKnocked />
              // )
            }
            {/* the -1 is needed since the coworkers list includes the current user */}
            {workspaceStore.coworkers.length-1 === 0 && !myData.isCameraStatusOut ? (
              <Fragment>
                <img src={inviteArrow} className="invite-arrow" alt="arrow" />
                <p className="set-status-text">
                  <br />
                  Feels a little quiet in here.
                  <br />
                  Invite some friends or coworkers.
                </p>
              </Fragment>
            ) : 
            !myData.isCameraStatusOut
            && !callStore.callId
            && !callStore.currentPublicWorkspaceId
            && workspaceStore.publicWorkspaces
            && workspaceStore.publicWorkspaces.map((publicWorkspace, id) => {
              return (
                <PublicWorkspacePreview publicWorkspace={publicWorkspace} joinToWorkSpace={this.joinToWorkSpace}/>
              );
            })}
            {/* {
              !myData.isCameraStatusOut
              && !callStore.callId
              && !callStore.currentPublicWorkspaceId
              && workspaceStore.publicWorkspaces
              && workspaceStore.publicWorkspaces.map((publicWorkspace, id) => {
                return (
                  <PublicWorkspacePreview publicWorkspace={publicWorkspace} joinToWorkSpace={this.joinToWorkSpace}/>
                );
              })
            } */}
          </div>
        ) : (
          <ShareScreen />
        )}
      </Fragment>
    );
  }
}

const DashboardWithStores = inject('workspaceStore', 'callStore', 'myData')(observer(Dashboard));

export default DashboardWithStores;
