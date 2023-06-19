import React from "react";
import {inject, observer} from 'mobx-react';

const cameraTickSrc = require("../../../assets/images/tick.jpg");

const CameraTick = ({ status, myData }) => {
    return (status === myData.cameraStatus) ? (
        <div className="tick">
            <img alt="Tick" src={cameraTickSrc} />
        </div>
    ) : null;
};
export default inject('myData')(observer(CameraTick));