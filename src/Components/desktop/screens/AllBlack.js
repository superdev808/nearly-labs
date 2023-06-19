import { faBorderNone } from "@fortawesome/free-solid-svg-icons";
import React from "react";

function AllBlack() {
  console.log("AllBlack");
  return (
    <div
      style={{
        display: "none",
        position: "absolute",
        width: "100%",
        height: "100%",
        backgroundColor: "black",
        zIndex: 1,
      }}
      className="allBlack"
    ></div>
  );
}

export default AllBlack;
