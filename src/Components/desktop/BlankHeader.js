import React, { Fragment } from "react";
import DevIndicator from "./DevIndicator";
import TitleBar from "./TitleBar";

class BlankHeader extends React.Component {
  render() {
    return (
      <Fragment>
        <TitleBar />
        <div className="top-container" style={{ height: "62px" }}>
          <DevIndicator />
        </div>
      </Fragment>
    );
  }
}

export default BlankHeader;
