import React from "react";
import {inject, observer} from "mobx-react";
import DumbHeader from "./DumbHeader";
import axios from "axios";
import config from "../../config/default";
import { Redirect } from "react-router-dom";
const electron = window.require("electron").remote;
const { shell } = window.require("electron").remote;
const systemPreferences = electron.systemPreferences;
const os = window.require("os");
const trackEvent = electron.getGlobal("trackEvent");

class Home extends React.Component {
  self = this;
  constructor(props) {
    super(props);
    this.state = {
      email: "",
      pendingRequest: false,
      emailSent: false,
      redirect: false,
      redirectURL: null,
    };

    const platforms = {
      WINDOWS: "Windows",
      MAC: "Mac",
      LINUX: "Linux",
      SUN: "Sun",
      OPENBSD: "OpenBSD",
      ANDROID: "Android",
      AIX: "AIX",
    };

    const platformsNames = {
      win32: platforms.WINDOWS,
      darwin: platforms.MAC,
      linux: platforms.LINUX,
      sunos: platforms.SUN,
      openbsd: platforms.OPENBSD,
      android: platforms.ANDROID,
      aix: platforms.AIX,
    };
    this.currentPlatform = platformsNames[os.platform()];
    //Check if we have permissions
    this.camera = {};
    this.microphone = {};
  }

  isLoggedIn = () => {
    if (localStorage.getItem("me.securitySeed")) return true;
    return false;
  };
  isFirstTime = () => {
    if (localStorage.getItem("me.firstTime") === "true") return true;
    return false;
  };
  componentWillUnmount = () => {
    this._isMounted = false;
  };
  componentDidMount = () => {
    document.title = "Nearly - Log In";

    this._isMounted = true;
    setTimeout(() => {
      if (this.isLoggedIn()) {
        const { myData } = this.props;
        if (myData.cameraStatus === "In") {
          trackEvent("Login", "Successful", 0);
        }
        else if (myData.cameraStatus === "No Video") {
          trackEvent("Login", "Successful", 1);
        }
        else {
          trackEvent("Login", "Successful", 2);
        }
        var state = { ...this.state };
        state.redirect = true;
        if (os.platform() !== 'darwin'){
          localStorage.setItem("permissions", true);
          if (this.isFirstTime()) {
            state.redirectURL = "/InviteCoworker";
          } else {
            state.redirectURL = "/Dashboard";

          }
        }else
        if (
          (systemPreferences.getMediaAccessStatus("camera") === "granted" ||
            systemPreferences.getMediaAccessStatus("camera") === "denied") &&
          (systemPreferences.getMediaAccessStatus("microphone") === "granted" ||
            systemPreferences.getMediaAccessStatus("microphone") === "denied")
        ) {
          console.log("Permissions granted");
          localStorage.setItem("permissions", true);

          if (this.isFirstTime()) {
            trackEvent("First Run", "CameraPermission", systemPreferences.getMediaAccessStatus("camera") === "granted");
            trackEvent("First Run", "MicPermission", systemPreferences.getMediaAccessStatus("microphone") === "granted");
            trackEvent("First Run", "ScreenSharePermission", systemPreferences.getMediaAccessStatus("screen") === "granted");
            state.redirectURL = "/InviteCoworker";
          } else {
            if (
              localStorage.getItem("DefaultMicrophone") === null ||
              localStorage.getItem("DefaultCamera") === null ||
              localStorage.getItem("DefaultCamera") === "0" ||
              localStorage.getItem("DefaultMicrophone") === "0"
            )
              state.redirectURL = "/FinishSetup";
            else state.redirectURL = "/Dashboard";
          }
        } else {
          console.log("Permissions not-determined");
          localStorage.setItem("permissions", false);

          state.redirectURL = "/FinishSetup";
        }
        this.setState(state);
      }
    }, 1000);
  };

  btnHandler = () => {
    //Validate Email
    if (/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(this.state.email)) {
      var state = { ...this.state };
      state.error = false;
      state.pendingRequest = true;
      if (this._isMounted) this.setState(state);

      //Send Axios Request
      axios({
        method: "post",
        url: config.backendURL + "api/user/login",
        data: {
          email: this.state.email,
          platform: this.currentPlatform,
        },
      }).then(
        (response) => {
          if (response.data.done) {
            if (response.data.key !== null) {
              trackEvent("Login", "Email Sent");
            }
            if (response.data.quickLogin) {
              console.log("Login Successfully with Quick Login");
              //Redirect to Dashboard based on firstTime Flag
              localStorage.setItem("me.id", response.data.me.id);
              localStorage.setItem("me.email", response.data.me.email);
              localStorage.setItem(
                "me.short_name",
                response.data.me.short_name
              );
              localStorage.setItem(
                "me.profile_pic",
                response.data.me.profile_pic
              );
              localStorage.setItem("me.firstTime", response.data.firstTime);
              localStorage.setItem(
                "me.securitySeed",
                response.data.me.securitySeed
              );
              // office hours
              localStorage.setItem("me.inTime", response.data.me.inTime);
              localStorage.setItem("me.outTime", response.data.me.outTime);

              this.props.workspaceStore.setWorkspaceData(response.data.me.workspace_id, response.data.me.workspaceName);

              let state = { ...this.state };
              state.redirect = true;
              if (os.platform() !== 'darwin'){
                localStorage.setItem("permissions", true);
                if (response.data.firstTime === true) {
                  state.redirectURL = "/InviteCoworker";
                } else {
                  state.redirectURL = "/Dashboard";
                }
              }else
              if (
                (systemPreferences.getMediaAccessStatus("camera") ===
                  "granted" ||
                  systemPreferences.getMediaAccessStatus("camera") ===
                    "denied") &&
                (systemPreferences.getMediaAccessStatus("microphone") ===
                  "granted" ||
                  systemPreferences.getMediaAccessStatus("microphone") ===
                    "denied")
              ) {
                localStorage.setItem("permissions", true);
                if (response.data.firstTime === true){
                  state.redirectURL = "/InviteCoworker";
                }
                else
                state.redirectURL = "/Dashboard";

              } else {
                localStorage.setItem("permissions", false);
                state.redirectURL = "/FinishSetup";

              }
              if (this._isMounted) this.setState(state);
            } else {
              var state = { ...this.state };
              state.error = false;
              state.pendingRequest = false;
              state.emailSent = true;
              state.securitySeed = response.data.key;
              if (this._isMounted) this.setState(state);
            }
          }
        },
        (error) => {
          trackEvent("Login", "Email Invalid");
          //Show this error and stick to this page
          var state = { ...this.state };
          state.error = true;
          state.pendingRequest = false;
          state.emailSent = false;
          if (this._isMounted) this.setState(state);
        }
      );
    } else {
      trackEvent("Login", "Email Invalid");
      state = { ...this.state };
      state.error = true;
      state.pendingRequest = false;
      state.emailSent = false;
      if (this._isMounted) this.setState(state);
    }
  };
  keydownHandler = (e) => {
    if (e.key === "Enter") {
      this.btnHandler(e);
    }
  };
  emailChangeHandler = (e) => {
    var state = { ...this.state };
    state.email = e.target.value;
    if (this._isMounted) this.setState(state);
  };

  btnResendHandler = () => {
    clearTimeout(this.timer);
    var state = { ...this.state };
    state.emailSent = false;
    if (this._isMounted) this.setState(state);
  };
  checkLogin = () => {
    axios({
      method: "post",
      url: config.backendURL + "api/user/isLoginValid",
      data: {
        securitySeed: this.state.securitySeed,
      },
    }).then(
      (response) => {
        if (response.data.done) {
          clearTimeout(this.timer);
          console.log("Login Successful");
          //Redirect to Dashboard based on firstTime Flag
          localStorage.setItem("me.id", response.data.me.id);
          localStorage.setItem("me.email", response.data.me.email);
          localStorage.setItem("me.short_name", response.data.me.short_name);
          localStorage.setItem("me.profile_pic", response.data.me.profile_pic);
          localStorage.setItem("me.firstTime", response.data.firstTime);
          localStorage.setItem("me.createdAt", response.data.me.createdAt);
          localStorage.setItem("me.inTime", response.data.me.inTime);
          localStorage.setItem("me.outTime", response.data.me.outTime);

          localStorage.setItem(
            "me.securitySeed",
            response.data.me.securitySeed
          );
          
          this.props.workspaceStore.setWorkspaceData(response.data.me.workspace_id, response.data.me.workspaceName);

          let state = { ...this.state };
          state.redirect = true;
          if (os.platform() !== 'darwin'){
            localStorage.setItem("permissions", true);
            if (this.isFirstTime()) {
              state.redirectURL = "/InviteCoworker";
            } else {
              state.redirectURL = "/Dashboard";
  
            }
          }else
          if (
            (systemPreferences.getMediaAccessStatus("camera") === "granted" ||
              systemPreferences.getMediaAccessStatus("camera") === "denied") &&
            (systemPreferences.getMediaAccessStatus("microphone") ===
              "granted" ||
              systemPreferences.getMediaAccessStatus("microphone") === "denied")
          ) {
            localStorage.setItem("permissions", true);
            if (
              localStorage.getItem("DefaultCamera") === null ||
              localStorage.getItem("DefaultMicrophone") === null ||
              localStorage.getItem("DefaultCamera") === "0" ||
              localStorage.getItem("DefaultMicrophone") === "0"
            ) {
              state.redirectURL = "/FinishSetup";
            } else if (this.isFirstTime())
              state.redirectURL = "/InviteCoworker";
            else state.redirectURL = "/Dashboard";
          } else {
            localStorage.setItem("permissions", false);

            state.redirectURL = "/FinishSetup";
          }
          if (this._isMounted) this.setState(state);
        } else {
          if (this.state.emailSent) {
            clearTimeout(this.timer);
            this.timer = setTimeout(() => {
              this.checkLogin();
            }, 2000);
          }
        }
      },
      (error) => {
        console.error(error);
      }
    );
  };
  renderRedirect = () => {
    if (this.state.redirect) {
      console.log("Redirecting to ", this.state.redirectURL);
      return <Redirect to={this.state.redirectURL} />;
    }
  };
  render() {
    if (this.state.emailSent) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.checkLogin();
      }, 2000);
    }
    return (
      <div className="nearly-container">
        <DumbHeader />
        {this.renderRedirect()}
        {this.state.emailSent === false ? (
          <div className="main-login-container">
            <div className="logo-container">
              <p className="logo-title login-heading">
                {this.state.error === true ? "Email Unrecognized" : "Log In"}
              </p>
            </div>
            {this.state.error === true ? (
              <p className="unrecognized-text">
                We don't recognize that email. Please double check the one below
                or sign up at{" "}
                <span
                  onClick={() => {
                    shell.openExternal("https://www.nearlylabs.com");
                  }}
                  className="link-lookalike"
                >
                  nearlylabs.com.
                </span>
              </p>
            ) : (
              <p className="help-text">
                If you haven’t signed up, first go to{" "}
                <span
                  onClick={() => {
                    shell.openExternal("https://www.nearlylabs.com");
                  }}
                  className="link-lookalike"
                >
                  nearlylabs.com.
                </span>
              </p>
            )}
            <input
              type="name"
              className="signin-field"
              placeholder="Work email you used at signup"
              value={this.state.email}
              onChange={this.emailChangeHandler.bind(this)}
              onKeyDown={this.keydownHandler.bind(this)}
            ></input>
            <button
              className="login-link-button"
              onClick={this.btnHandler}
              disabled={this.state.pendingRequest}
            >
              Send Email Login Link
            </button>
          </div>
        ) : (
          <div className="main-login-container">
            <div className="logo-container">
              <p className="logo-title check-heading">Check your email</p>
            </div>
            <p className="login-email-text">
              Login email sent! It'll be there soon.
              <br />
              Please check Spam or Junk folder before trying again.
            </p>

            <button
              className="login-link-button"
              onClick={this.btnResendHandler}
            >
              Resend Email Confirmation
            </button>
          </div>
        )}
      </div>
    );
  }
}
export default inject('workspaceStore', 'myData')(observer(Home));
// TODO: add in trackEvent("Login", "Email Sent") trackEvent("Login", "Invalid Email")
