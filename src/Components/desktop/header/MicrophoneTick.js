import React from "react";

const cameraTickSrc = require("../../../assets/images/tick.jpg");

const CameraTick = () => {
    return (
        <div className="tick">
            <img alt="Tick" src={cameraTickSrc} />
        </div>
    );
};
export default CameraTick;