import React, { Fragment } from "react";

class DevIndicator extends React.Component {
  render() {
    let myElement;
    let env = localStorage.getItem("ENV");
    // console.log("Environment ", env);

    switch (env) {
      case "PRODUCTION":
        myElement = null;
        break;
      case "DEVELOPMENT":
        myElement = (
          <div
            style={{
              backgroundColor: "#000062",
              position: "absolute",
              top: "0px",
              left: "400px",
              width: "20px",
              height: "20px",
              borderWidth: "1px",
              paddingLeft: "2px",
              color: "#ffffff",
            }}
          >
            D
          </div>
        );
        break;
      case "TEST":
        myElement = (
          <div
            style={{
              backgroundColor: "#000062",
              position: "absolute",
              top: "0px",
              left: "400px",
              width: "20px",
              height: "20px",
              borderWidth: "1px",
              paddingLeft: "2px",
              color: "#ffffff",
            }}
          >
            T
          </div>
        );
        break;
      default:
        myElement = null;
    }
    return <Fragment>{myElement}</Fragment>;
  }
}
export default DevIndicator;
