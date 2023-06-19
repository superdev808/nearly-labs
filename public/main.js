const {
  app,
  BrowserWindow,
  Menu,
  globalShortcut,
  nativeImage,
  dialog,
  powerMonitor,
  shell,
  screen,
  ipcMain,
} = require("electron");
const childProcess = require("child_process");
const { trackEvent } = require("./analytics.js");
global.trackEvent = trackEvent;
const {
  default: installExtension,
  REACT_DEVELOPER_TOOLS,
} = require("electron-devtools-installer");
const url = require("url");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
let processing = false;
const path = require("path");
let forceQuit = false;
let updateQuit = false;
let mainWindow,
  aboutWindow,
  bgWindow,
  patchWindow = null;
let firstToggleKey = false;
let secondToggleKey = false;
let noInternetResponse;
// Sleep settings to know when to go to OUT mode
let displaySleepSeconds = null;
let isInForeground = false;

let mainWindowPreviousPosition; // Variable used to store screen position for animations.

let idleTimer = null;
let idleMinimize = false;
let ENV = process.env.ENV || "PROD";
ENV = ENV.trim();
console.log("ENV", ENV);
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    console.log("Second Instance");
    if (mainWindow) {
      visibleMode();
    }
  });
}

const hideMonitorPatch = () => {
  try {
    patchWindow.destroy();
    patchWindow = null;
  } catch (e) {
    return;
  }
  return;
};

const displayMonitorPatch = async (screenId, name) => {
  await hideMonitorPatch();
  let displays = screen.getAllDisplays();
  let myDisplay = null;
  for (let i = 0; i < displays.length; i++) {
    // console.log(displays[i]);
    if (displays[i].id === parseInt(screenId)) myDisplay = displays[i];
  }
  patchWindow = new BrowserWindow({
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    focusable: false,
    closable: false,
    frame: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
      preload: "./preload.js",
    },
  });
  patchWindow.loadFile(`${path.join(__dirname, "../build/patch.html")}`);

  patchWindow.webContents.on("did-finish-load", () => {
    patchWindow.setPosition(myDisplay.bounds.x, myDisplay.bounds.y);
    patchWindow.setSize(myDisplay.bounds.width, myDisplay.bounds.height / 5);
    // patchWindow.webContents.openDevTools();
    patchWindow.webContents.send("CONTENT", { title: name });
    patchWindow.show();
  });
};

const getDisplay = (id) => {
  let displays = screen.getAllDisplays();
  let myDisplay = null;
  for (let i = 0; i < displays.length; i++) {
    // console.log(displays[i]);
    if (displays[i].id === parseInt(id)) myDisplay = displays[i];
  }
  console.log("MyDisplay", myDisplay);
  return myDisplay;
};
function getNumber(str) {
  let numberString = "";
  for (var i = 0; i < str.length; i++) {
    var c = str.charAt(i);
    if (c >= "0" && c <= "9") {
      numberString += c;
    }
  }
  return parseInt(numberString);
}
function getSleepSettings() {
  console.log("getSleepSettings");
  // This function reads the output of pmset -g to get the energy saver settings from macOS
  // This is used so Nearly knows when to go to OUT mode so that the computer can sleep.
  let pmsettings = childProcess.execSync("pmset -g").toString().split("\n");
  let displaySleepIndex = null;
  pmsettings.forEach((setting, index) => {
    console.log(index, setting, setting.includes("displaysleep"));
    if (setting.includes("displaysleep")) {
      displaySleepIndex = index;
    }
  });
  let displaySleepSetting = pmsettings[displaySleepIndex].replace(/\s+/g, "");
  console.log("displaySleepSetting", displaySleepSetting);
  let displaySleepMinutes = getNumber(displaySleepSetting);
  console.log("displaySleepMinutes", displaySleepMinutes);
  displaySleepSeconds = parseInt(displaySleepMinutes) * 60;
  console.log("displaySleepSeconds:", displaySleepSeconds);
}
const isIdle = () => {
  if (displaySleepSeconds === null) {
    getSleepSettings();
  }
  if (idleTimer === null) {
    idleTimer = setInterval(() => {
      const idleTime = powerMonitor.getSystemIdleTime();
      if (!isInForeground) {
        if (idleTime >= displaySleepSeconds) {
          if (displaySleepSeconds !== 0 && !isNaN(displaySleepSeconds)) {
            // mainWindow.hide();
            // idleMinimize = true;
            let system_profiler_output = childProcess.execSync("system_profiler SPDisplaysDataType").toString();
            if (system_profiler_output.includes("Asleep")) {
              console.log("DISPLAY ASLEEP");
              mainWindow.webContents.send("IDLE-TIMEOUT");
            }
          }
        }
      }
    }, 30000);
  }
};

const sendIPCToMainWindow = (obj) => {
  console.log("Sending IPC to MAIN WINDOW", obj);
  mainWindow.webContents.send("FOR-MAINWINDOW", obj);
};
const sendIPCToTitleBar = (obj) => {
  console.log("Sending IPC to TITLE BAR", obj);
  mainWindow.webContents.send("FOR-TITLEBAR", obj);
};

const sendIPCToBgWindow = (obj) => {
  console.log("Sending IPC to BG WINDOW", obj);
  bgWindow.webContents.send("FOR-BGWINDOW", obj);
};

ipcMain.on("PRODUCTION-LOGOUT", () => {
  console.log("LOGOUT CALLEDDDD");
  mainWindow.reload();
});
ipcMain.on("DEVELOPMENT-LOGOUT", () => {
  console.log("LOGOUT CALLEDDDD");
  mainWindow.reload();
});
ipcMain.on("TEST-LOGOUT", () => {
  console.log("LOGOUT CALLEDDDD");
  mainWindow.reload();
});

ipcMain.on("RELAUNCH", () => {
  app.relaunch();
  app.exit();
});

ipcMain.on("HIDEME", () => {
  console.error("HIDEME CALLED");
  mainWindow.hide();
});

ipcMain.on("SHOW-PATCH-WINDOW", (evt, display_id, name) => {
  console.log("IPC Received SHOW-PATCH-WINDOW", display_id, name);
  displayMonitorPatch(display_id, name);
});

ipcMain.on("HIDE-PATCH-WINDOW", (evt, screenId) => {
  console.log("IPC Received HIDE-PATCH-WINDOW");
  hideMonitorPatch();
});

// ==========
// Electron Client Height/Width
//
const HEIGHT_DEFAULT = 642;
const WIDTH_DEFAULT = 410;

// num is the amount of people inside of the call
ipcMain.on("MULTI-PARTY-CALL", (evt, num) => {
  console.log("MULTI-PARTY-CALL");
  if (num === 2) {
    mainWindow.setContentSize(WIDTH_DEFAULT * 2, HEIGHT_DEFAULT, true);
  } else if (num === 3) {
    mainWindow.setContentSize(WIDTH_DEFAULT * 3, HEIGHT_DEFAULT, true);
  } else {
    mainWindow.setContentSize(WIDTH_DEFAULT * 3, HEIGHT_DEFAULT, true);
  }
});

ipcMain.on("SINGLE-PERSON-CALL", () => {
  console.log("SINGLE-PERSON-CALL");
  mainWindow.setContentSize(WIDTH_DEFAULT, HEIGHT_DEFAULT, true);
});
ipcMain.on("EXIT", () => {
  app.exit();
});

ipcMain.on("FOR-MAINPROCESS", (event, obj) => {
  console.error("FOR-MAINPROCESS", obj);
  switch (obj.type) {
    case "BRING-TO-FRONT":
      bringToFront();
      break;
    case "INVISIBLE-MODE":
      invisibleMode();
      break;
    case "VISIBLE-MODE":
      visibleMode();
      break;
    case "SWITCH-TO-SHARE-SCREEN":
      setTimeout(() => {
        const dimensions = screen.getPrimaryDisplay().size;
        mainWindow.hide();
        mainWindow.setPosition(0, 0, true);
        mainWindow.setSize(dimensions.width, dimensions.height, true);
        mainWindow.setFocusable(true);
        mainWindow.setFullScreen(true);
        mainWindow.show();
      }, 200);
      mainWindow.setFocusable(false);
      mainWindow.setAlwaysOnTop(true, "screen");
      break;
    case "SHARE-CONTROL-DROP-DOWN":
      if (obj.cameraDropdown) {
        mainWindow.setSize(550, 350, true);
      } else {
        mainWindow.setSize(550, 100, true);
      }
      break;
    case "SWITCH-TO-SHAREE-SCREEN":
      let display = getDisplay(obj.source);
      let width = display.bounds.width;
      let x = width / 2 - 275 + display.bounds.x;
      let y = display.bounds.y;
      console.log("x y", x, y);
      // Mark - jiggle happens here
      mainWindow.setPosition(x, y, true);
      mainWindow.hide();
      mainWindow.setSize(550, 100, true);
      mainWindow.setAlwaysOnTop(true);
      mainWindow.setFocusable(true);
      mainWindow.show();
      break;
    // Mark: Animation start point. Commented out code are just functions that I tried to use for the animation.
    case "SWITCH-TO-DASHBOARD-SCREEN":
      // mainWindow.setContentSize(410, 636, true);
      //mainWindow.setSize(410, 636, true);
      mainWindow.setAlwaysOnTop(false);
      mainWindow.setFocusable(true);
      mainWindow.setFullScreen(false);
      //mainWindow.setPosition(mainWindowPreviousPosition[0], mainWindowPreviousPosition[1], true);
      mainWindow.setBounds(mainWindowPreviousPosition, true);
      // mainWindow.setSize(410, 636, true);
      // mainWindow.setPosition(mainWindowPreviousPosition[0], mainWindowPreviousPosition[1], true);
      //mainWindow.show();
      // setTimeout(() => {
      //   mainWindow.show();
      // }, 700);
      break;
    case "MINIMIZE":
      mainWindow.minimize();
      break;
    case "CLOSE":
      sendIPCToMainWindow({ type: "CLOSE" });
      break;
    case "CALL_HANG_UP_BEFORE_CLOSE_WINDOW":
      mainWindow.hide();
      break;
    default:
      break;
  }
});

app.on("open-url", function (event, data) {
  event.preventDefault();
  console.log("Open-URL called with ", data);
});

app.setAsDefaultProtocolClient("nearly");

function setMainMenu() {
  const template = [
    {
      label: "Nearly",
      submenu: [
        {
          label: "About Nearly",
          click() {
            showAbout();
          },
        },
        {
          label: "Profile...",
          click() {
            mainWindow.send("profile-open", {});
          },
        },
        {
          label: "Quit Nearly",
          accelerator: "Cmd+Q",
          click() {
            invisibleMode();
          },
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
        { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
        { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
        {
          label: "Select All",
          accelerator: "CmdOrCtrl+A",
          selector: "selectAll:",
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

const invisibleMode = () => {
  forceQuit = true;
  app.quit();
  return;
  console.log("Entering Invisible Mode");
  sendIPCToMainWindow({ type: "TO-OUT", quit: true });
  if (process.platform === "darwin") {
    app.dock.hide();
  }
  mainWindow.hide();
};

const visibleMode = () => {
  console.log("Entering VISIBLE Mode");
  if (process.platform === "darwin") {
    app.dock.show();
  }
  mainWindow.show();
  mainWindow.focus();
  if (displaySleepSeconds === null) {
    getSleepSettings();
  }
};

const bringToFront = () => {
  mainWindow.show();
};

function showAbout() {
  // aboutWindow.webContents.openDevTools();
  aboutWindow.show();
}

function hideAbout() {
  aboutWindow.hide();
}
const quitApp = () => {
  try {
    // bgWindow.close();
    // bgWindow = null;
    aboutWindow.close();
    aboutWindow = null;
    mainWindow.close();
    mainWindow = null;
    app.quit();
  } catch (e) {}
};

const openBgWindow = () => {
  return;
  bgWindow = new BrowserWindow({
    width: 410,
    height: 636,
    closable: true,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
      preload: "./preload.js",
    },
  });

  bgWindow.on("close", (event) => {
    if (updateQuit) return true;
    event.preventDefault();
    invisibleMode();
    return false;
  });
  let bgURL;
  console.log("ENV", ENV, "|");
  switch (ENV) {
    case "DEV":
      console.log("SETTING DEV MODE bgURL");
      bgURL = url.format({
        slashes: true,
        hash: "/Background",
        protocol: "http",
        pathname: "localhost:3000/",
      });
      break;
    case "PROD":
      console.log("SETTING PROD MODE bgURL");

      bgURL = url.format({
        slashes: true,
        hash: "/Background",
        protocol: "file",
        pathname: path.join(__dirname, "/../build/index.html"),
      });
      break;
    default:
      break;
  }

  console.log("bgURL", bgURL);
  bgWindow.loadURL(bgURL);
  ipcMain.on("FOR-MAINWINDOW", (event, obj) => {
    console.log(obj);
    mainWindow.webContents.send("FOR-MAINWINDOW", obj);
  });

  ipcMain.on("FOR-BGWINDOW", (event, obj) => {
    console.log(obj);
    bgWindow.webContents.send("FOR-BGWINDOW", obj);
  });
  bgWindow.hide();

  if (ENV === "DEV") {
    bgWindow.webContents.openDevTools();
    bgWindow.show();
  }
};

function createWindow() {
  openBgWindow();
  aboutWindow = new BrowserWindow({
    parent: mainWindow,
    width: 310,
    height: 220,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    closable: true,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
      preload: "./preload.js",
    },
  });
  aboutWindow.hide();
  aboutWindow.loadFile(`${path.join(__dirname, "../build/about.html")}`);
  aboutWindow.on("close", (event) => {
    if (updateQuit) return true;
    if (!forceQuit) {
      event.preventDefault();
      try {
        aboutWindow.hide();
      } catch (e) {}
    }
  });
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 410,
    height: 636,
    resizable: false,
    fullscreenable: true,
    transparent: true,
    movable: true,
    hasShadow: true,
    frame: false,
    closable: true,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
      preload: "./preload.js",
    },
  });
  mainWindowPreviousPosition = mainWindow.getBounds();
  if (ENV === "DEV") {
    installExtension(REACT_DEVELOPER_TOOLS)
      .then((name) => {
        mainWindow.webContents.openDevTools();
        console.log(`Added Extension:  ${name}`);
      })
      .catch((err) => {
        console.log("An error occurred: ", err);
      });
  }

  // and load the index.html of the app.
  let mainURL;

  switch (ENV) {
    case "DEV":
      mainURL = "http://localhost:3000/";
      break;
    case "PROD":
      mainURL = url.format({
        slashes: true,
        protocol: "file",
        pathname: path.join(__dirname, "/../build/index.html"),
      });
      break;
    default:
      break;
  }
  console.log("mainURL", mainURL);
  mainWindow.loadURL(mainURL);
  trackEvent("App start");
  // mainWindow.webContents.executeJavaScript(
  //   "window.location ='file://" + mainURL + "#/Background';"
  // );

  // Open the DevTools.
  setMainMenu();

  // Function to update mainWindowPreviousPosition variable for animations
  mainWindow.on("move", () => {
    // Normal window dimensions width: 410, height: 636,
    let screenSize = mainWindow.getSize();
    if (screenSize[0] == 410 && screenSize[1] == 636) {
      mainWindowPreviousPosition = mainWindow.getBounds();
    }
  });
  mainWindow.on("resize", () => {
    console.log("RESIZE");
  });
  mainWindow.on("blur", () => {
    //Title Bar Changes
    sendIPCToTitleBar({ type: "BLUR" });
    isInForeground = false;
  });
  mainWindow.on("focus", () => {
    //Title Bar Changes
    sendIPCToTitleBar({ type: "FOCUS" });
    isInForeground = true;
  });
  mainWindow.on("close", function (event) {
    console.error("close called");
    if (updateQuit) {
      return true;
    }
    if (!forceQuit) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", function (event) {
    log.warn("Main Window Closed");
    try {
      aboutWindow.close();
      aboutWindow = null;
    } catch (e) {}
    app.quit();
  });
  aboutWindow.on("closed", function (event) {
    log.warn("About Window Closed");
  });
  ipcMain.on("AUTO-UPDATE", function (event) {
    if (ENV === "DEV") return;
    if (!processing) processing = true;
    log.info("AUTO-UPDATE CALLED");
    console.error("Auto Updating App");
    updateQuit = true;
    forceQuit = true;
    app.relaunch();
    app.exit();
  });

  ipcMain.on("CHECK-AUTO-UPDATE", function (event) {
    if (ENV === "DEV") return;
    log.info("CHECK-AUTO-UPDATE CALLED");
    console.error("Checking for Auto Updating App");
    checkForUpdates();
  });

  ipcMain.on("NO-INTERNET", () => {
    console.error("NO-INTERNET IPC Received");
    showNoInternetDialog();
  });

  ipcMain.on("REMOVE-DIALOG-NO-INTERNET", () => {
    console.error("REMOVE-DIALOG-NO-INTERNET IPC Received");
    hideNoInternetDialog();
  });
}

const enableHooks = () => {
  powerMonitor.on("lock-screen", () => {
    console.log("Screen Locked");
    mainWindow.send("LOCK-SCREEN");
  });

  powerMonitor.on("unlock-screen", () => {
    console.log("Screen Unlocked");
    if (idleMinimize === true) {
      visibleMode();
      idleMinimize = false;
    }
    isIdle();
    mainWindow.send("UNLOCK-SCREEN");
  });

  powerMonitor.on("suspend", () => {
    console.log("Suspended");
    mainWindow.send("LOCK-SCREEN");
  });

  powerMonitor.on("resume", () => {
    console.log("Resumed");
    mainWindow.send("UNLOCK-SCREEN");
  });
};

const hideNoInternetDialog = () => {
  try {
    noInternetResponse.close();
  } catch (e) {
    console.error(e);
  }
};
const showNoInternetDialog = () => {
  const iconImage = nativeImage.createFromPath(
    path.join(__dirname, "Favicon.png")
  );
  console.error("iconImage", iconImage);
  const options = {
    buttons: ["Cancel", "System Preferences"],
    defaultId: 1,
    cancelId: 0,
    title: "Question",
    message: "Cannot access Nearly Servers",
    icon: iconImage,
    detail:
      "Please make sure your Internet connection is active.\nIf you continue to see this message, please email support@nearlylabs.com.",
  };

  noInternetResponse = dialog.showMessageBox(mainWindow, options);
  noInternetResponse.then((res) => {
    console.log("res", res.response);
    if (res.response === 1) {
      console.log("Opening System Preferences");
      shell.openExternal(
        "x-apple.systempreferences:com.apple.preference.network"
      );
    }
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  isIdle();

  enableHooks();

  const ret = globalShortcut.register("CommandOrControl+Shift+N", () => {
    console.log("CommandOrControl+Shift+N is pressed");
    firstToggleKey = true;
    secondToggleKey = false;
    setTimeout(() => {
      firstToggleKey = false;
      secondToggleKey = false;
    }, 2000);
  });

  const ret2 = globalShortcut.register("CommandOrControl+Shift+L", () => {
    console.log("CommandOrControl+Shift+L is pressed");
    secondToggleKey = false;
    if (firstToggleKey) {
      secondToggleKey = true;
      console.log("SECONDTOGGLE SUCCESS");
    }
    setTimeout(() => {
      firstToggleKey = false;
      secondToggleKey = false;
    }, 2000);
  });

  const ret3 = globalShortcut.register("CommandOrControl+Shift+D", () => {
    if (secondToggleKey) {
      console.log("SWITCHING TO DEVELOPMENT MODE");
      firstToggleKey = false;
      secondToggleKey = false;
      //SWITCH TO DEV MODE
      mainWindow.send("switch-to-dev", {});
    }
  });

  const ret4 = globalShortcut.register("CommandOrControl+Shift+P", () => {
    if (secondToggleKey) {
      firstToggleKey = false;
      secondToggleKey = false;
      //SWITCH TO DEV MODE
      console.log("SWITCHING TO PRODUCTION MODE");
      mainWindow.send("switch-to-prod", {});
    }
  });

  const ret5 = globalShortcut.register("CommandOrControl+Shift+A", () => {
    if (secondToggleKey) {
      firstToggleKey = false;
      secondToggleKey = false;

      //Show developer console
      console.log("OPENING DEV TOOLS");
      mainWindow.openDevTools();
    }
  });

  const ret6 = globalShortcut.register("CommandOrControl+Shift+T", () => {
    if (secondToggleKey) {
      firstToggleKey = false;
      secondToggleKey = false;
      //SWITCH TO Test MODE
      console.log("SWITCHING TO TEST MODE");
      mainWindow.send("switch-to-test", {});
    }
  });

  if (!ret) {
    console.log("registration failed for ret");
  }

  if (!ret2) {
    console.log("registration failed for ret2");
  }
  if (!ret3) {
    console.log("registration failed for ret3");
  }
  if (!ret4) {
    console.log("registration failed for ret4");
  }
  if (!ret5) {
    console.log("registration failed for ret5");
  }
  if (!ret6) {
    console.log("registration failed for ret6");
  }
  createWindow();

  app.on("activate", function () {
    try {
      if (mainWindow) visibleMode();
    } catch (e) {
      log.info("activate", e);
    }
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    //mainWindowPreviousPosition = mainWindow.getNormalBounds();
  });
});
app.on("will-quit", (event) => {
  trackEvent("App Closed");
  // event.preventDefault();
  invisibleMode();
  // Unregister all shortcuts.
  // globalShortcut.unregisterAll();
});
// Quit when all windows are closed.
app.on("window-all-closed", function () {
  log.warn("window-all-closed");
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") quitApp();
});
app.on("before-quit", function (event) {
  console.error("before-quit called");
  if (updateQuit) return true;
  if (forceQuit) {
    console.log("ForceQuit is true");
    // try {
    //   if (aboutWindow) aboutWindow.close();
    //   aboutWindow = null;
    //   if (mainWindow) mainWindow.close();
    //   mainWindow = null;
    // } catch (e) {
    //   console.error(e);
    // }
    return true;
  } else {
    //app.relaunch();
  }
  event.preventDefault();
  invisibleMode();
  return false;
});

const checkForUpdates = () => {
  if (ENV === "DEV") return;
  log.info("checkForUpdates() CALLED");
  autoUpdater.setFeedURL("https://www.nearlylabs.com/release/");
  autoUpdater.on("before-quit-for-update", () => {
    log.info("before-quit-for-update");
  });
  autoUpdater.on("update-not-available", () => {
    log.info("update-not-available");
  });
  autoUpdater.on("update-available", () => {
    log.info("update-available");
  });
  autoUpdater.on("checking-for-update", () => {
    log.info("checking-for-update");
  });
  autoUpdater.on("error", (err) => {
    log.info("error", err);
  });
  autoUpdater.on("update", () => {
    log.info("");
  });

  autoUpdater.on("update-downloaded", () => {
    log.info("update-downloaded CALLED");

    console.log("update_downloaded");
    setTimeout(() => {
      log.info("UPDATE-AVAILABLE sent to renderer");
      mainWindow.send("UPDATE-AVAILABLE", {});
    }, 3000);
  });
  autoUpdater.checkForUpdates();
};
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
