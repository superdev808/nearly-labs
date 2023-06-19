import React, { Component } from "react";

const electron = window.require("electron");
var CronJob = require("cron").CronJob;

export default class Background extends Component {
  constructor(props) {
    super(props);
    this.inJob = null;
    this.outJob = null;
  }
  stopInOutSchedule = () => {
    this.inJob.stop();
    this.outJob.stop();
    this.inJob = null;
    this.outJob = null;
  };

  sendIPCToMainWindow = (obj) => {
    console.log("Sending IPC to MAIN WINDOW", obj);
    electron.ipcRenderer.send("FOR-MAINWINDOW", obj);
  };

  sendIPCToMainProcess = (obj) => {
    console.log("Sending IPC to MAIN PROCESS", obj);
    electron.ipcRenderer.send("FOR-MAINPROCESS", obj);
  };

  startInOutSchedule = () => {
    console.log("Starting INOUT Schedule");
    let inTime =
      localStorage.getItem("me.inTime") === null
        ? 10
        : parseInt(localStorage.getItem("me.inTime"));

    let outTime =
      localStorage.getItem("me.outTime") === null
        ? 10
        : parseInt(localStorage.getItem("me.outTime"));
    if (this.outJob === null) {
      this.outJob = new CronJob(`00 21 ${outTime} * * 1-5`, () => {
        console.log("Out Time Fired");
        this.sendIPCToMainWindow({ type: "TO-OUT" });
      });
      this.outJob.start();
      console.log("Out Time Job Started");
    }

    if (this.inJob === null) {
      this.inJob = new CronJob(`30 21 ${inTime} * * 1-5`, () => {
        console.log("In Time Fired");
        setTimeout(() => {
          this.sendIPCToMainProcess({ type: "BRING-TO-FRONT" });
        }, 2000);
        this.sendIPCToMainWindow({ type: "TO-IN" });
        //Bring to front (show)
      });
      this.inJob.start();
      console.log("In Time Job Started");
    }
  };

  componentDidMount = () => {
    console.log("componentDidMount");
    electron.ipcRenderer.on("FOR-BGWINDOW", (event, obj) => {
      console.log("FOR-BGWINDOW", obj);
      switch (obj.type) {
        case "RESET-INOUT-SCHEDULE":
          this.stopInOutSchedule();
          this.startInOutSchedule();
          break;
        case "START-INOUT-SCHEDULE":
          this.startInOutSchedule();
          break;
        case "STOP-INOUT-SCHEDULE":
          this.stopInOutSchedule();
          break;
        default:
          break;
      }
    });
  };
  render() {
    return <div>Background.js</div>;
  }
}
