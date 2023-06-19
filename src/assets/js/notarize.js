require("dotenv").config();
const { notarize } = require("electron-notarize");

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  //const appleId = "joe@doodlebuddy.co";
  //const password = `@keychain:"Application Loader: ${appleId}"`;

  // Using safe keychain access as detailed here: https://github.com/electron/electron-notarize
  return await notarize({
    appBundleId: "nearlylabs.nearly",
    appPath: `${appOutDir}/${appName}.app`,
    appleId: "joe@doodlebuddy.co", //appleId, /*"joe@doodlebuddy.co:", /*process.env.APPLEID, */
    appleIdPassword: "eomq-pviv-rthz-gjub",//password, /*"eomq-pviv-rthz-gjub", process.env.APPLEIDPASS, */
    ascProvider: "3W759N9V46"
  });
};
