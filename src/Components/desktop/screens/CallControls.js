import React, { Component } from "react";
import { inject, observer } from "mobx-react";
import AddressingPopup from "../AddressingPopup";
import Popup from "reactjs-popup";
import Modal from "react-modal";
import "./../../../assets/css/AddressingPopup.css";

const remote = window.require("electron").remote;
const trackEvent = remote.getGlobal("trackEvent");

const electron = window.require("electron");
const AddScreenIcon = require("../../../assets/images/add-screen-hover.png");
const ShareScreenIcon = require("../../../assets/images/Share_Screen_Icon.png");
const AddPersonIcon = require("../../../assets/images/Add_Person_Icon.png");

class CallControls extends Component {
  constructor(props) {
    super(props);
    this.state = {
      screens: [],
      showDropdown: false,
      showPopup: false,
    };

    Modal.setAppElement("#root");
  }

  componentDidMount = () => {
    electron.desktopCapturer
      .getSources({ types: ["screen"] })
      .then(async (sources) => {
        sources.reverse();
        this.setState({ screens: sources });
      });
    // let displays = screen.getAllDisplays();
    // this.setState({ screens: displays });
  };

  singleScreenSelect = () => {
    if (this.state.screens.length > 1) {
      this.setState({ showDropdown: !this.state.showDropdown });
      return;
    }
    electron.ipcRenderer.send("HIDE-PATCH-WINDOW");
    this.returnStream(this.state.screens[0]);
  };

  returnStream = async (source) => {
    const { callStore } = this.props;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: source.id,
          },
        },
      });
      electron.ipcRenderer.send("HIDE-PATCH-WINDOW");
      console.log("returnStream source.id: " + source.name);
      var screenNumber = parseInt(source.name[source.name.length - 1]); // This gets the screen's number, such as 1 for Screen 1, etc.

      // Check if user is in Public Space
      if (callStore.currentPublicWorkspaceId !== null) {
        trackEvent("Public Space Screensharing", "Shared", screenNumber);
      } else {
        trackEvent("Call Screensharing", "Shared", screenNumber);
      }
      this.props.returnStream(stream, source);
    } catch (e) {
      console.error(e);
    }
  };

  closePopup = () => {
    this.setState({ showPopup: false });
  };

  renderTrigger = () => {
    const { callStore } = this.props;

    return (
      <button
        className="add-person"
        style={{ backgroundColor: "transparent" }}
        onClick={() => this.setState({ showPopup: true })}
        disabled={callStore.userCount > 4}
      >
        <img
          alt="add"
          src={AddPersonIcon}
          style={{ display: "block", width: "74px" }}
        />
        <p className="share-screen-btn">Add Person</p>
      </button>
    );
  };

  render() {
    return (
      <div className="knocker-btn-container">
        <button
          className="add-screen dropup"
          onClick={this.singleScreenSelect}
          style={{ backgroundColor: "transparent" }}
        >
          <img
            alt="add"
            src={
              this.state.showDropdown === true ? AddScreenIcon : ShareScreenIcon
            }
            style={{ display: "block", width: "74px" }}
          />

          <p className="share-screen-btn">Share Screen</p>

          {this.state.screens.length > 1 ? (
            <div
              className="dropbox"
              style={
                this.state.showDropdown === true
                  ? { display: "block" }
                  : { display: "none" }
              }
            >
              {this.state.screens.map((screen, index) => {
                return (
                  <div
                    className="dropbox-text"
                    key={index}
                    onClick={this.returnStream.bind(this, screen)}
                    onMouseOver={() => {
                      electron.ipcRenderer.send(
                        "SHOW-PATCH-WINDOW",
                        screen.display_id,
                        screen.name
                      );
                    }}
                    onMouseOut={() => {
                      electron.ipcRenderer.send("HIDE-PATCH-WINDOW");
                    }}
                  >
                    {screen.name}
                  </div>
                );
              })}
            </div>
          ) : null}
        </button>

        {this.state.showPopup && (
          <Popup modal centered open trigger={this.renderTrigger()}>
            <AddressingPopup closePopup={this.closePopup} />
          </Popup>
        )}

        {!this.state.showPopup && this.renderTrigger()}
      </div>
    );
  }
}

export default inject("callStore")(observer(CallControls));
