import React from "react";
import {inject, observer} from 'mobx-react';
import "../../assets/css/Profile.css";
import { Redirect } from "react-router";

const remote = window.require("electron").remote;
const trackEvent = remote.getGlobal("trackEvent");

const timeStyle = {
  width: 80,
  height: 20,
  fontFamily: "Lato",
  fontSize: 13,
};
const defaultInTime = "10:00";
const defaultOutTime = "14:00";

class Profile extends React.Component {
  constructor(props) {
    super(props);
    this.defaultMicrophone =
      localStorage.getItem("DefaultMicrophone") === null
        ? "default"
        : localStorage.getItem("DefaultMicrophone");
    this.defaultCamera =
      localStorage.getItem("DefaultCamera") === null
        ? "default"
        : localStorage.getItem("DefaultCamera");
    this.state = {
      audioDevice: this.defaultMicrophone,
      videoDevice: this.defaultCamera,
      logoutSuccess: false,
    };
  }
  officeHoursSave = () => {
    const { myData } = this.props;
    myData.setOfficeHours(myData.inTime, myData.outTime, myData.dayType);
    if (myData.dayType === "Weekday") {
      trackEvent("Office Hours", "Change Day Setting", 0);
    }
    else {
      trackEvent("Office Hours", "Change Day Setting", 1);
    }
    let inTimeInt = parseInt(myData.inTime.replace(":", ""));
    trackEvent("Office Hours", "Change In Time", inTimeInt);
    let outTimeInt = parseInt(myData.outTime.replace(":", ""));
    trackEvent("Office Hours", "Change Out Time", outTimeInt);
  }
  dayChangeHandler = (event) => {
    const newDayType = event.target.value;
    const { myData } = this.props;
    myData.setDayType(newDayType);
  }
  inTimeChangeHandler = (event) => {
      const newInTime = event.target.value;
      const { myData } = this.props;
      myData.setInTime(newInTime);
  }
  outTimeChangeHander = (event) => {
    const newOutTime = event.target.value;
    const { myData } = this.props;
    myData.setOutTime(newOutTime);
  }
  cameraChangeHandler = (event) => {
    const {myData} = this.props;
    myData.changeCamera(event.target.value);
  };
  microphoneChangeHandler = (event) => {
    const {myData} = this.props;
    myData.changeMicrophone(event.target.value);
  };

  renderRedirect = () => {
    if (this.state.logoutSuccess) {
      console.log("Redirecting from Dashboard to Splash");
      return <Redirect to='/Splash'/>;
    }
  }
  logout = () => {
    const {myData} = this.props;
    myData.logout(() => {
      this.setState({
        logoutSuccess: true,
      });
    });
  }

  render() {
    const { myData } = this.props;
    if (myData.dayType === null) myData.dayType = "Weekday";
    return (
      <div className={this.props.profilePopupClass}>
        {this.renderRedirect()}
        <div className="officeHoursDiv">
          <div className="office-hours-label">Office Hours:</div>
          <input onChange={this.inTimeChangeHandler} type="time" id="inTime" name="inTime"
       min="09:00" max="18:00" value={myData.inTime} defaultValue={defaultInTime} style={timeStyle} required></input>
          <input onChange={this.outTimeChangeHander} type="time" id="outTime" name="outTime"
       min="09:00" max="18:00" value={myData.outTime} defaultValue={defaultOutTime} style={timeStyle} required></input>
            <label>
              <select
                onChange={this.dayChangeHandler}
                value={myData.dayType === null ? "Weekday" : myData.dayType}
                className="dayTypeSelector"
              >
              <option value={"Weekday"}>Weekdays  </option>
              <option value={"Every Day"}>Every Day  </option>
              </select>
            </label>
        </div>
        <br></br>
        <div className="select-box">
          <div className="select-lable">Camera:</div>
          <div className="selectdiv">
            <label>
              <select
                onChange={this.cameraChangeHandler.bind(this)}
                value={myData.defaultCamera}
              >
                {this.props.videoDevices.map((device, index) => {
                  return (
                    <option key={index} value={device.deviceId}>
                      {device.label.replace(/ *\([^)]*\) */g, "")}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>
        </div>
        <div className="select-box">
          <div className="select-lable">Microphone:</div>
          <div className="selectdiv">
            <label>
              <select
                onChange={this.microphoneChangeHandler.bind(this)}
                value={myData.defaultMicrophone}
              >
                {this.props.audioDevices.map((device, index) => {
                  return (
                    <option key={index} value={device.deviceId}>
                      {device.label.replace(/ *\([^)]*\) */g, "").substr(0, 25)}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>
        </div>
        <div className="big-button-container">
          <div className="save-officehours">
            <button className="savebtn-officehours" onClick={this.officeHoursSave}>
              Save
            </button>
          </div>
          <div className="logout-container">
            <button className="logout-btn" onClick={this.logout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }
}
export default inject('myData')(observer(Profile));
