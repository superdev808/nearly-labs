import React, { Fragment } from "react";
import DevIndicator from "./DevIndicator";
import TitleBar from "./TitleBar";

class InviteHeader extends React.Component {
  constructor(props) {
    super(props);
    this.myVideo = React.createRef();
    this.myProfilePic = localStorage.getItem("me.profile_pic");

    this.myCameraStatus = "In";
    if (localStorage.getItem("myCameraStatus"))
      this.myCameraStatus = localStorage.getItem("myCameraStatus");
    else localStorage.setItem("myCameraStatus", "In");
  }
  render() {
    return (
      <Fragment>
        <TitleBar />
        <div className="top-container">
          <DevIndicator />
          <div className="video">
            <div className="top-video">
              <img
                className="main-video my-video"
                style={{ opacity: "0.15", cursor: "pointer" }}
                src={this.myProfilePic}
                alt="Me"
              />
            </div>
            <p>{this.myCameraStatus}</p>
          </div>
          <div className="micro">
            <img
              alt="Microphone"
              src={require("../../assets/images/micro.jpg")}
              className="hand"
            />
            <p>Signal Only</p>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default InviteHeader;
