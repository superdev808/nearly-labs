import React, { Fragment } from "react";
const electron = window.require("electron");

class AudoUpdatePopup extends React.Component {
  constructor(props) {
    super(props);
    electron.ipcRenderer.once("UPDATE-AVAILABLE", (event, someParameter) => {
      console.log("UPDATE AVAILABLE");
      var state = { ...this.state };
      state.show = true;
      this.setState(state);
    });

    this.state = { show: false };
  }
  laterHandler = () => {
    console.log("Selected Later");
    this.setState({ show: false });
  };

  updateHandler = () => {
    console.log("Sending for Auto-Update");
    electron.ipcRenderer.send("AUTO-UPDATE");
  };
  render() {
    if (this.state.show === true)
      return (
        <div className="nearly-update-container">
          <div className="logo-area">
            <div className="logo">N</div>
          </div>
          <div className="nearly-content-area">
            <div className="update-heading">Nearly update</div>
            <p>
              We've downloaded a fresh new version of Nearly for you. To get the
              latest improvements, click "Update"{" "}
            </p>
            <div className="upate-btn-container">
              <img
                className="later-btn"
                src={require("./../../assets/images/later-button.png")}
                onClick={this.laterHandler}
                alt="Later"
              />
              <img
                className="update-btn"
                src={require("./../../assets/images/update-button.png")}
                onClick={this.updateHandler}
                alt="Update"
              />
            </div>
          </div>
        </div>
      );
    else return <Fragment></Fragment>;
  }
}
export default AudoUpdatePopup;
