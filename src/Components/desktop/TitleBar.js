import React, { Component } from "react";
import {inject, observer} from "mobx-react";
import "./../../assets/css/titleBar.css";
import "./../../assets/css/font-awesome.min.css";
const electron = window.require("electron");
export class TitleBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      blur: false,
    };
  }

  sendIPCToMainProcess = (obj) => {
    console.log("Sending IPC to MAIN PROCESS", obj);
    electron.ipcRenderer.send("FOR-MAINPROCESS", obj);
  };

  componentDidMount = () => {
    electron.ipcRenderer.on("FOR-TITLEBAR", (event, obj) => {
      switch (obj.type) {
        case "BLUR":
          this.setState({ blur: true });
          break;
        case "FOCUS":
          this.setState({ blur: false });
          break;
        default:
          break;
      }
    });
  };

  render() {
    const { workspaceStore } = this.props;

    return (
      <div className="title-container">
        <div className="controls">
          <button
            className="close"
            onClick={this.sendIPCToMainProcess.bind(this, { type: "CLOSE" })}
            style={
              this.state.blur === false
                ? { background: "" }
                : { background: "#dfdfdf", border: "none" }
            }
          >
            <img
              src={require("./../../assets/images/close-hover.png")}
              alt="Close"
            />
          </button>
          <button
            className="minimize"
            onClick={this.sendIPCToMainProcess.bind(this, { type: "MINIMIZE" })}
            style={
              this.state.blur === false
                ? { background: "" }
                : { background: "#dfdfdf", border: "none" }
            }
          >
            <img
              src={require("./../../assets/images/minimize-hover.png")}
              alt="Minimize"
            />{" "}
          </button>
        </div>
        <div
          className="title-heading"
          style={
            this.state.blur === false ? { color: "" } : { color: "#A8A8A8" }
          }
        >
          Nearly - {workspaceStore.workspaceName}
        </div>
      </div>
    );
  }
}

export default inject('workspaceStore')(observer(TitleBar));
