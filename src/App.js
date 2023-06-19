import React from "react";
import {Provider} from "mobx-react";
import { HashRouter as Router, Route } from "react-router-dom";
import DesktopHome from "./Components/desktop/Home";
import FinishSetup from "./Components/desktop/FinishSetup";
import InviteCoworker from "./Components/desktop/InviteCoworker";
import Dashboard from "./Components/desktop/Dashboard";
import Splash from "./Components/desktop/Splash";
import "./assets/css/style.css";
import "./assets/js/common";
import Background from "./Components/desktop/Background";
import CallState from './state/Call';
import WorkspaceState from './state/Workspace';
import MyData from './state/Me';

function App() {
  return (
    <Provider
      callStore={CallState}
      workspaceStore={WorkspaceState}
      myData={MyData}
    >
      <Router>
        <Route path="/FinishSetup">
          <FinishSetup />
        </Route>
        <Route path="/InviteCoworker">
          <InviteCoworker />
        </Route>
        <Route path="/Dashboard">
          <Dashboard />
        </Route>
        <Route path="/DesktopHome">
          <DesktopHome />
        </Route>
        <Route path="/Splash">
          <Splash />
        </Route>
        <Route path="/Background">
          <Background />
        </Route>
        <Route exact path="/">
          <Splash />
        </Route>
      </Router>
    </Provider>
  );
}
export default App;
