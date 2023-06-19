import React, { Component } from "react";
import { inject, observer } from "mobx-react";
import CallControls from "./CallControls";
import CallVideo from "./CallVideo";
import CafeteriaBk from "../../../assets/images/public-workspace-background-cafeteria-large.png";
import SunnyBk from "../../../assets/images/public-workspace-background-sunny-large.png";
import CourtYardBk from "../../../assets/images/public-workspace-background-courtyard-large.png";

const closeBtn = require("../../../assets/images/close-btn.png");

export class CallScreen extends Component {
  constructor(props) {
    super(props);
    this.publicWorkspaceName = null;
  }

  render() {
    const { myData, callStore, workspaceStore, dash } = this.props;
    const currentPublicWorkspaceId = callStore?.currentPublicWorkspaceId;

    let containerStyle = {
      marginLeft: 5,
      marginTop: 25,
    };

    if (callStore?.currentPublicWorkspaceId) {
      let publicSpaces = workspaceStore.publicWorkspaces;
      let background = CafeteriaBk;
      publicSpaces.forEach((space) => {
        if (space.id === callStore?.currentPublicWorkspaceId) {
          this.publicWorkspaceName = space.name;
          if (space.name === "Cafeteria") {
            background = CafeteriaBk;
          } else if (space.name === "Sunny Day") {
            background = SunnyBk;
          } else if (space.name === "Courtyard") {
            background = CourtYardBk;
          } else {
            background = CafeteriaBk;
          }
        }
      });
      containerStyle = {
        ...containerStyle,
        marginLeft: 0,
        marginTop: 0,
        backgroundImage: `url(${background})`,
      };
    } else {
      this.publicWorkspaceName = null;
    }

    return (
      <div className="main-video-container" style={containerStyle}>
        {this.publicWorkspaceName !== null ? (
          <p className="public-space-label">{this.publicWorkspaceName}</p>
        ) : null}
        {!callStore.knocking.inbound && (
          <CallControls dash={dash} returnStream={callStore.startScreenShare} />
        )}
        {!currentPublicWorkspaceId &&
          callStore.peopleInCall.map((id, index) => (
            <CallVideo
              participantNo={index + 1}
              key={id}
              id={id}
              smallImage={false}
            />
          ))}
        {currentPublicWorkspaceId &&
          workspaceStore
            .usersInPublicWorkspace(currentPublicWorkspaceId)
            .filter((id) => id !== myData.userId)
            .map((id, index) => (
              <CallVideo
                participantNo={index + 1}
                key={id}
                id={id}
                smallImage={false}
              />
            ))}
        {currentPublicWorkspaceId &&
          workspaceStore
            .usersInPublicWorkspace(currentPublicWorkspaceId)
            .filter((id) => id !== myData.userId).length === 0 && (
            <div
              style={{
                color: "#000062",
                fontSize: 24,
                padding: "70px 27px 0px 27px",
                fontFamily: "Lato",
                textAlign: "center",
              }}
            >
              No one's here yet. Use "Add Person" below to have someone join
              you.
            </div>
          )}
        <div className="new-user-video"></div>

        <button
          onClick={
            callStore.callId ? callStore.hangupCall : callStore.leaveSpace
          }
          className="btn-close"
          style={
            callStore.currentPublicWorkspaceId
              ? {
                  top: 20,
                }
              : {}
          }
        >
          <img alt="Close" src={closeBtn} style={{ width: "48px" }} />
        </button>
      </div>
    );
  }
}

export default inject(
  "myData",
  "callStore",
  "workspaceStore"
)(observer(CallScreen));
