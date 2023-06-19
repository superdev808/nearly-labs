import React from "react";
import BlankHeader from "./BlankHeader";
import {inject, observer} from 'mobx-react';
import { Redirect } from "react-router-dom";
const electron = window.require("electron").remote;
const systemPreferences = electron.systemPreferences;
const os = window.require("os");
const trackEvent = electron.getGlobal("trackEvent");

class Splash extends React.Component {
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
    this.logo = require("./../../assets/images/BigLogo.png");
    this.camera = {};
    this.microphone = {};
  }

  isLoggedIn = () => {
    if (localStorage.getItem("me.securitySeed") !== null) return true;
    return false;
  };
  isFirstTime = () => {
    if (
      localStorage.getItem("me.firstTime") !== null &&
      localStorage.getItem("me.firstTime") === "true"
    )
      return true;
    return false;
  };
  componentWillUnmount = () => {
    this._isMounted = false;
  };

  componentDidMount = () => {
    document.title = "Nearly";
    this._isMounted = true;
    setTimeout(() => {
      var state = { ...this.state };
      state.redirect = true;
      if (os.platform() === "darwin") {
        if (
          (systemPreferences.getMediaAccessStatus("camera") === "granted" ||
            systemPreferences.getMediaAccessStatus("camera") === "denied") &&
          (systemPreferences.getMediaAccessStatus("microphone") === "granted" ||
            systemPreferences.getMediaAccessStatus("microphone") === "denied")
        ) {
          console.log("Permissions granted");
          localStorage.setItem("permissions", true);
          if (this.isLoggedIn()) {
            if (
              localStorage.getItem("DefaultMicrophone") === null ||
              localStorage.getItem("DefaultCamera") === null ||
              localStorage.getItem("DefaultCamera") === 0 ||
              localStorage.getItem("DefaultMicrophone") === 0
            )
              state.redirectURL = "/FinishSetup";
            else {
              state.redirectURL = "/Dashboard";
              // Track Event for amount of live users in Workspace
              const { workspaceStore } = this.props;
              let numCoworkers = workspaceStore.activeUsers + 1;
              trackEvent("Enter Workspace", numCoworkers);
            }
          } else {
            state.redirectURL = "/DesktopHome";
          }
        } else {
          console.log("Permissions not-determined");
          localStorage.setItem("permissions", false);
          if (this.isLoggedIn()) {
            state.redirectURL = "/FinishSetup";
          } else {
            state.redirectURL = "/DesktopHome";
          }
        }
      } else if (this.isLoggedIn()) {
        state.redirectURL = "/Dashboard";
        // Track Event for amount of live users in Workspace
        const { workspaceStore } = this.props;
        let numCoworkers = workspaceStore.activeUsers + 1;
        trackEvent("Enter Workspace", numCoworkers);
      } else {
        state.redirectURL = "/DesktopHome";
      }
      if (this._isMounted) this.setState(state);
    }, 1000);
  };

  renderRedirect = () => {
    if (this.state.redirect) {
      console.log("Redirecting to ", this.state.redirectURL);
      return <Redirect to={this.state.redirectURL} />;
    }
  };
  render() {
    return (
      <div className="nearly-container">
        <BlankHeader />
        <div className="main-login-container">
          <div className="logo-container">
            <img alt="Nearly Logo" src={this.logo} />
          </div>
          <p
            className="workany-text"
            style={{
              textAlign: "center",
              marginTop: "42px",
              fontFamily: "Lato",
              fontSize: "24px",
              fontWeight: "Normal",
              letterSpacing: "Normal",
            }}
          >
            Work Anywhere, Together
          </p>
        </div>
        {this.renderRedirect()}
      </div>
    );
  }
}
export default inject('workspaceStore')(observer(Splash));
