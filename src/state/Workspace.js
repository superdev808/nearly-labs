import { action, observable, makeObservable, computed, toJS } from 'mobx';
import config from "../config/default";
import { core as WebRTC } from "../assets/js/webrtc";
import Me from './Me';
import { faLessThanEqual } from '@fortawesome/free-solid-svg-icons';

const LOCAL_workspaceId = 'me.workspace_id';
const LOCAL_workspaceName = 'me.workspaceName';

const MAX_WORKSPACE_USERS = 12;

class Workspace {
    workspaceId = null;
    workspaceName = null;
    audioDevices = null;
    videoDevices = null;

    startedWithVideo = null;

    streams = null;
    userList = null;

    streamCounter = 0;

    _publicWorkspaces = null;
    usersInPublicWorkspaces = null;

    workspaceOpenings = null;

    constructor() {
        makeObservable(this, {
            workspaceId: observable,
            workspaceName: observable,

            startedWithVideo: observable,

            streams: observable,
            userList: observable,

            streamCounter: observable,

            _publicWorkspaces: observable,
            usersInPublicWorkspaces: observable,

            workspaceOpenings: observable,

            coworkers: computed,
            activeUsers: computed,

            incrementCounter: action,

            setWorkspaceData: action,
            loadWorkspaceData: action,

            setUserStream: action,
            deleteUserStream: action,

            setUser: action,
            deleteUser: action,
        });

        this.streams = new Map();
        this.userList = new Map();

        this._publicWorkspaces = [];
        this.usersInPublicWorkspaces = new Map();

        this.workspaceOpenings = new Map();

        WebRTC.onWorkspaceUserAdded(this.onWorkspaceUserAdded);
        WebRTC.onWorkspaceUserRemoved(this.onWorkspaceUserRemoved);
        WebRTC.onUserListUpdated(this.onUserListUpdated);
        WebRTC.onSpaceUsers(this.onSpaceUsers);
        WebRTC.onUserDataUpdated(this.onUserDataUpdated);
        WebRTC.onUserStatusUpdated(this.onUserStatusUpdated);
    }

    get coworkers() {
        return Array.from(this.userList);
    }

    get activeUsers() {
        return Array.from(this.userList)
            .filter(([id, u]) => {
                console.log(id, u);
                const user = this.getUser(id);
                console.log(user);
                return user.status?.status === 'online'
            });
    }

    get publicWorkspaces() {
        return Array.from(this._publicWorkspaces);
    }

    usersInPublicWorkspace(publicWorkspaceId) {
        let users = this.usersInPublicWorkspaces.get(publicWorkspaceId);
        return users ? Array.from(users) : [];
    }

    isUserInPublicWorkspace(userId) {
        let publicSpaces = Array.from(this._publicWorkspaces), found = false;
        publicSpaces.forEach((space, id) => {
            let usersInSpace = this.usersInPublicWorkspace(space.id);
            if (usersInSpace.indexOf(userId) >= 0) found = true;
        })
        return found;
    }

    incrementCounter = () => {
        this.streamCounter++;
    }

    setUserStream = (id, stream) => {
        const s = this.streams.get(id);

        if (s || (!s && this.streams.size <= MAX_WORKSPACE_USERS)) {
            this.streams.set(id, stream);
            this.streamCounter++;
        }
    }

    getUserStream = (id) => {
        return this.streams.get(id);
    }

    deleteUserStream = (id) => {
        this.streamCounter++;
        return this.streams.delete(id);
    }

    setUser = (id, user) => {
        const u = this.userList.get(id);

        if (u || (!u && this.userList.size <= MAX_WORKSPACE_USERS)) {
            this.userList.set(id, user);
            this.streamCounter++;
        }
    }

    getUser = (id) => {
        return toJS(this.userList.get(id));
    }

    deleteUser = (id) => {
        this.streamCounter++;
        return this.userList.delete(id);
    }

    joinWorkspace = () => {
        console.warn('WorkspaceStore.joinWorkspace()');
        // const startWithVideo = Me.defaultCamera !== null; // Commented out to be replaced with new logic
        let startWithVideo = Me.cameraStatus === 'In';
        this.startedWithVideo = startWithVideo;

        WebRTC.videoWidth = config.videoQuality.width;
        WebRTC.videoHeight = config.videoQuality.height;
        WebRTC.videoFps = config.videoQuality.frameRate;

        WebRTC.joinWorkspace(
            this.workspaceId,
            startWithVideo,
            (err) => {
                if (err) {
                    return alert(err);
                }
            }
        );
    }

    leaveWorkspace = () => {
        console.warn('WorkspaceStore.leaveWorkspace()');
        WebRTC.leaveWorkspace(this.workspaceId);
        this.startedWithVideo = false;
    }

    setWorkspaceData(id, name) {
        console.warn('WorkspaceStore.setWorkspaceData()');
        this.workspaceId = id;
        this.workspaceName = name;

        localStorage.setItem(LOCAL_workspaceId, id);
        localStorage.setItem(LOCAL_workspaceName, name);
    }

    loadWorkspaceData() {
        console.warn('WorkspaceStore.loadWorkspaceData()');
        this.workspaceId = parseInt(localStorage.getItem(LOCAL_workspaceId));
        this.workspaceName = localStorage.getItem(LOCAL_workspaceName);
    }

    // ========== WebRTC callbacks ==========

    onWorkspaceUserAdded = (err, userId, audio, video, remoteStream) => {
        console.warn('WebRTC :: onWorkspaceUserAdded()');
        if (err) {
          return console.error(err);
        }
  
        this.setUserStream(userId, remoteStream);
    }

    onWorkspaceUserRemoved = (err, userId) => {
        console.warn('WebRTC :: onWorkspaceUserRemoved()');
        if (err) {
          return console.error(err);
        }
        
        this.deleteUserStream(userId);
    }

    onUserListUpdated = (err, users = [], spaces = []) => {
        console.warn('WebRTC :: onUserListUpdated()');
        if (err) {
          return console.error(err);
        }

        for (let i=0; i<users.length; i++) {
            const user = users[i];
            this.setUser(user.id, user);
        }

        for (let i=0; i<spaces.length; i++) {
            if (this._publicWorkspaces.findIndex((workspace) => {
                return workspace.id === spaces[i].id
            }) === -1) {
                this._publicWorkspaces.push({
                    id: spaces[i].id,
                    name: spaces[i].name,
                    sort: spaces[i].sort,
                });
            }
        }

        // this.usersInPublicWorkspaces.clear();
    }

    openSpaceId = (spaceId) => {
        this._publicWorkspaces.forEach((space) => {
          if (spaceId === space.id) {
            this.workspaceOpenings.set(spaceId, true);
          }
        });
      }
      
      closeSpaceId = (spaceId) => {
        this._publicWorkspaces.forEach((space) => {
          if (spaceId === space.id) {
            this.workspaceOpenings.set(spaceId, false);
          }
        });
      }
    
      onSpaceUsers = (err, spaceId, users, streams) => {
          console.warn('WebRTC :: onSpaceUsers() - COMPONENT');
          if (err) {
              return console.error(err);
          }
          let usersInThisPublicWorkspace = [];
          Object.keys(users).forEach(id => {
              usersInThisPublicWorkspace.push(users[id].id);
          });
          this.usersInPublicWorkspaces.set(spaceId, usersInThisPublicWorkspace);
          if (this.usersInPublicWorkspaces !== null) {
            if (this.usersInPublicWorkspaces.get(spaceId).length > 0) {
              this.openSpaceId(spaceId);
            }
            else {
              this.closeSpaceId(spaceId);
            }
          }
      }
    // Old logic, replaced by above. Kept here for historical reasons.
    // onSpaceUsers = (err, spaceId, users, streams) => {
    //     console.warn('WebRTC :: onSpaceUsers()');
    //     if (err) {
    //         return console.error(err);
    //     }

    //     let usersInThisPublicWorkspace = [];
    //     Object.keys(users).forEach(id => {
    //         usersInThisPublicWorkspace.push(users[id].id);
    //     })
    //     this.usersInPublicWorkspaces.set(spaceId, usersInThisPublicWorkspace);
    // }

    onUserDataUpdated = (err, userId, data) => {
        console.warn('WebRTC :: onUserDataUpdated()');
        if (err) {
          return console.error(err);
        }
  
        const user = this.getUser(userId);
          
        if (user) {
            user.status = data.status;
            this.setUser(userId, user);
        } else {
            console.error('WebRTC :: onUserDataUpdated()', 'No user exists? How did we get here?')
        }
    }

    onUserStatusUpdated = (err, userId, status) => {
        // console.warn('WebRTC :: onUserStatusUpdated()', userId, status);
        if (userId === Me.userId) {
            return;
        }

        if (err) {
          return console.error("User`s status update failed: " + err);
        }

        const user = this.getUser(userId);
        
        if (user) {
            let micMuted = null;
            if (user.status) {
                micMuted = user.status.micMuted;
            }
            user.status = status;
            user.status.micMuted = micMuted;
            this.setUser(userId, user);
        } else {
            console.error('WebRTC :: onUserStatusUpdated()', 'No user exists? How did we get here?')
        }
    }
}

const space = new Workspace();

export default space;