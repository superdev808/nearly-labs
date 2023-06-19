import React from "react";
import {inject, observer} from "mobx-react";
import InviteHeader from "./InviteHeader";
import { Redirect } from "react-router-dom";
import axios from "axios";
import config from "../../config/default";

const electron = window.require("electron");
const shell = electron.shell;

const remote = electron.remote;
const trackEvent = remote.getGlobal("trackEvent");

class InviteCoworker extends React.Component {
  constructor(props) {
    super(props);
    this.securitySeed = localStorage.getItem("me.securitySeed");
    this.state = {
      emails: "",
      redirect: false,
      me: {},
    };
  }

  inviteHandler = () => {
    const { workspaceStore } = this.props;
    var emails = this.state.emails.split(",");
    // Santize email list before sending to backend
    emails.forEach((email, index) => {
      let trimmed = email.trim(); // Remove leading and trailing whitespace
      // Validate email with regex expression
      if (/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(trimmed)) {
        emails[index] = trimmed;
        console.log(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(trimmed));
      }
      else {
        delete emails[index];
      }
    });
    let sanitizedEmails = emails.filter(function (el) {
      return el != null;
    });

    axios.post(config.backendURL + "api/user/sendInvitationToFriends", {
      emails: sanitizedEmails,
      workspaceName: workspaceStore.workspaceName,
      securitySeed: this.securitySeed
    }).then((response) => {
      console.log("Send invitations succeeded.");
      this.skipBtnHandler();
    }).catch((err) => {
      console.log("Send invitation failed.");
      this.skipBtnHandler();
    })
    
  };
  componentDidMount = () => {
    const { workspaceStore } = this.props;
    document.title = `Nearly - ${workspaceStore.workspaceName}`;
  };

  keydownHandler = (e) => {
    if (e.key === "Enter") {
      this.inviteHandler();
    }
  };
  emailChangeHandler = (e) => {
    var state = { ...this.state };
    state.emails = e.target.value;
    this.setState(state);
  };
  renderRedirect = () => {
    if (this.state.redirect) return <Redirect to="/Dashboard" />;
  };

  skipBtnHandler = () => {
    if (localStorage.getItem("me.firstTime") === "true") {
      //Set me.firstTime as false
      axios({
        method: "get",
        url: config.backendURL + "api/user/finishSetup/" + this.securitySeed,
      }).then(() => {
        localStorage.setItem("me.firstTime", "false");
        var state = { ...this.state };
        state.redirect = true;
        this.setState(state);
      });
    } else {
      var state = { ...this.state };
      state.redirect = true;
      this.setState(state);
    }
  };
  render() {
    return (
      <div className="nearly-container">
        {this.renderRedirect()}
        <InviteHeader />
        <div className="main-login-container">
          <div className="logo-container">
            <p className="logo-title coworkers-heading">Invite Coworkers</p>
          </div>
          <textarea
            className="coworker-field"
            name="comment"
            form="usrform"
            style={{ resize: "none" }}
            placeholder={
              "Enter coworker email addresses \n separated by commas"
            }
            onKeyDown={this.keydownHandler}
            // onChange={this.emailChangeHandler}
            onPaste={(a, b, c) => {
              console.log("PASTEEEE", a, b, c);
            }}
            // onInput={this.emailChangeHandler}
            value={this.state.emails}
            onChange={this.emailChangeHandler}
          ></textarea>
          <button className="login-link-button" onClick={this.inviteHandler}>
            Send Invites
          </button>

          <p className="privecy-text">
            "Send Invites" button opens your email and creates a pre-addressed
            message. You hit send when you're ready. Feel free to add a little
            note, but please don't mess with the URL.
          </p>
          <a href="#" onClick={this.skipBtnHandler}>
            <p className="skip">Skip</p>
          </a>
        </div>
      </div>
    );
  }
}
export default inject('workspaceStore')(observer(InviteCoworker));
