import React, { Fragment } from "react";
import DevIndicator from "./DevIndicator";
import TitleBar from "./TitleBar";
class DumbHeader extends React.Component {
  render() {
    return (
      <Fragment>
        <TitleBar />
        <div className="top-container">
          <div className="video">
            <div className="top-video">
              <p>Video</p>
            </div>
            <p>Not Set Up</p>
          </div>
          <div className="micro">
            <img
              alt="Microphone"
              src={require("../../assets/images/micro.jpg")}
              className="hand"
            />
            <p>Not Set Up</p>
          </div>
          <DevIndicator />
        </div>
      </Fragment>
    );
  }
}

export default DumbHeader;
