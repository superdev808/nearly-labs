This project is simplest form of Electron + React + Electron Builder

In the project directory, you can run:

### `npm install && yarn`

Installs all the dependencies <br />

### `npm start`

Launches react in browser at http://localhost:3000<br />
This is similar to `react-scripts start`

### `npm run dev`

Runs React and waits for it to load using wait-on package.<br />
Further it starts Electron app with http://localhost:3000

Any changes done in react reflects automatically (almost instantly) in electron and browser both.


**Note: When you wan to build electron app, you should change public/dev.js to public/main.js in package.json file**
### `npm run electron-build`
### `npm run electron-dist`

**Note: This command should run one after the other**

This creates react build using `react-scripts build` and further creates distribution in dist folder.

**Note from previous developer**
So, everything is working just looks pretty ugly as I didn’t have time to adjust where things go, sizes of people when they’re inside of a call, etc.

All of these things are easy fixes, it’s just very tedious and time consuming and I do not have time to finish it. But, here are some notes that you can pass on to the next developer, or maybe add to a Trello card.

For multi-party calling there are 5 files that are important; CallScreen.js, CallControls.js, Video.js, main.js, and style.css. CallScreen, CallControls, and Video are all React components. CallControls is also a child to CallScreen.

Inside of CallScreen.css inside of the return statement for the render function, you’ll see that it uses the class “main-video-container” which is pulled from style.css. It definitely needs some touching up to make sure that everything looks nice.

CallControls are just the buttons that show up inside of CallScreen while you’re in a call, and they have div called “knocker-btn-container” which gets really screwed up as soon as the animations start happening, so it is in need of a fix.

main.js is where the animations happen, as that’s where screen size is controlled using ipc calls. There are two important ones for when you’re inside of a call: MULTI-PARTY-CALL , and SINGLE-PERSON-CALL. The single person call simply returns the screen to normal dimensions (all of which can be found in Zeplin), MULTI-PARTY-CALL however, takes an argument “num”. Num is just how many other users in the call there are, this is used to control what size the screen should be at any given time. For animations, use setContentSize and make sure that after the dimensions you add ‘true’, this makes electron use macOS’s animation kit.

Most of what this is is just changing numbers and css values around to make everything fit, the core functionality is all present.

There is also an issue where the person being knocked shows up before they're in the call. You can handle this by either stretching the screen when knocking using the knocking prop in
CallScreen, or by wrapping the div in the Video component in a ternary that will return null if it's a knocking screen.