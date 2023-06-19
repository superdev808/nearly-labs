const dev = {
  frontendURL: "https://dev.nearlylabs.com/",
  backendURL: "https://dev.nearlylabs.com:8000/",
  videoQuality: {
    width: 15,
    height: 15,
    frameRate: 5,
  },
  inTime: {
    minute: 0,
    hour: 10,
  },
  outTime: {
    minute: 0,
    hour: 16,
  },
};

const prod = {
  frontendURL: "https://www.nearlylabs.com/",
  backendURL: "https://www.nearlylabs.com:8000/",
  videoQuality: {
    width: 15,
    height: 15,
    frameRate: 5,
  },
  inTime: {
    minute: 0,
    hour: 10,
  },
  outTime: {
    minute: 0,
    hour: 16,
  },
};
const test = {
  frontendURL: "https://dev.nearlylabs.com/",
  backendURL: "https://dev.nearlylabs.com:8000/",
  videoQuality: {
    width: 15,
    height: 15,
    frameRate: 5,
  },
  inTime: {
    minute: 0,
    hour: 10,
  },
  outTime: {
    minute: 0,
    hour: 16,
  },
};

export const SIGNAL_SERVER = {
  DEVELOPMENT: 'https://devsignal.nearlylabs.com:8890/',
  TEST: 'https://testsignal.nearlylabs.com:8890/',
  PRODUCTION: 'https://signal.nearlylabs.com:443/'
};

let config = [];
config["PRODUCTION"] = prod;
config["DEVELOPMENT"] = dev;
config["TEST"] = test;

let myEnv = "PRODUCTION";
if (localStorage.getItem("ENV") !== null) {
  myEnv = localStorage.getItem("ENV");
}

console.log(myEnv);
export default config[myEnv];
