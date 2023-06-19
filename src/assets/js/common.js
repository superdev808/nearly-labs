const electron = window.require("electron");
electron.ipcRenderer.once("switch-to-dev", (event, someParameter) => {
  localStorage.setItem("ENV", "DEVELOPMENT");
  logout("DEVELOPMENT");
});

electron.ipcRenderer.once("switch-to-prod", (event, someParameter) => {
  localStorage.setItem("ENV", "PRODUCTION");
  logout("PRODUCTION");
});

electron.ipcRenderer.once("switch-to-test", (event, someParameter) => {
  localStorage.setItem("ENV", "TEST");
  logout("TEST");
});

const logout = (env) => {
  console.log("Logout Called");
  for (var a in localStorage) {
    if (!(a === "DefaultCamera" || a === "DefaultMicrophone" || a === "ENV"))
      localStorage.removeItem(a);
  }
  electron.ipcRenderer.send(env + "-LOGOUT");
};

// window.onbeforeunload = (e) => {
//   var answer = false;
//   e.returnValue = answer;  // this will *prevent* the closing no matter what value is passed
//   electron.ipcRenderer.send("HIDEME");
// };
