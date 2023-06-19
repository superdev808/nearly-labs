import React from 'react';
import {inject, observer} from 'mobx-react';
import { Link } from "react-router-dom";
import { core as WebRTC } from "../../assets/js/webrtc.js";

const remote = window.require("electron").remote;
const trackEvent = remote.getGlobal("trackEvent");

const addBtn = require("../../assets/images/add-button.jpg");

const InviteButton = ({ workspaceStore, callStore }) => (
    <div
    className={ callStore.callId ? "user-video opacity-cont-hide" : "user-video" }
    style={{ marginLeft: "8px" }}
  >
    <Link
      to="/InviteCoworker"
      onClick={() => {
        trackEvent("Workspace Invite Clicked");
        /* try {
          WebRTC.leaveWorkspace(workspaceStore.workspaceId);
          WebRTC.disconnect();
        } catch (e) {} */
      }}
    >
      <button className="invite-button">
        <img alt="User" src={addBtn} />
        <p className="invite-text">Invite</p>
      </button>
    </Link>
  </div>
);

export default inject('workspaceStore', 'callStore')(observer(InviteButton));