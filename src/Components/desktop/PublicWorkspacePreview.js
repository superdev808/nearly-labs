import React from 'react';
import {inject, observer} from 'mobx-react';
import UserThumbnail from "./UserThumbnail";

class PublicWorkspace extends React.Component {
  constructor(props) {
    super(props);
    this.openedImage = require("./../../assets/images/space_opened.jpg");
    this.closedImage = require("./../../assets/images/space_closed.jpg");

    this.state = {
      update: 0,
    };
  }

  clickOpenCloseIcon = (spaceId) => {
    const { workspaceStore } = this.props;
    let previousValue = workspaceStore.workspaceOpenings.get(spaceId);
    workspaceStore.workspaceOpenings.set(spaceId, !previousValue);
    this.setState({update: this.state.update + 1});
  }

  isOpen = (spaceId) => {
    const { workspaceStore } = this.props;
    return workspaceStore.workspaceOpenings.get(spaceId);
  }

  getImage = (spaceId) => {
    return this.isOpen(spaceId) ? this.openedImage : this.closedImage;
  }

  render() {
    const { workspaceStore, myData, publicWorkspace, joinToWorkSpace } = this.props;
    const thumbs = [];
    const usersInPublicWorkspace = workspaceStore.usersInPublicWorkspace(publicWorkspace.id);

    for (let i=0; i<usersInPublicWorkspace.length; i++) {
      // this is a tuple in format [id, user]
      const id = usersInPublicWorkspace[i];

      if (id !== myData.userId) {
        thumbs.push(
          <UserThumbnail key={id} id={id} clickable={false}/>
        );
      }
    }

    if (!workspaceStore.workspaceOpenings.has(publicWorkspace.id)) {
      workspaceStore.workspaceOpenings.set(publicWorkspace.id, false);
    }

    return (
        <div
          style={
            this.isOpen(publicWorkspace.id) ? {
              marginBottom: -10
            } : {}
          }
        >
          <div class="public-workspace-title" onClick={() => this.clickOpenCloseIcon(publicWorkspace.id)}>
            <img 
              src={ this.getImage(publicWorkspace.id)}
              style={ this.isOpen(publicWorkspace.id) ? {
                width: 11,
                height: 8,
                marginRight: 5,
              } : {
                width: 7,
                height: 10,
                marginRight: 9,
              }}
            />
            {publicWorkspace.name} {`(${workspaceStore.usersInPublicWorkspace(publicWorkspace.id).length})`}
          </div>
          {
            this.isOpen(publicWorkspace.id) && <div class="user-container">
              {thumbs}
              {
                usersInPublicWorkspace.length < 6 && <button
                  className="user-video add-to-public-workspace-btn"
                  readOnly
                  onDrop={() => {joinToWorkSpace(publicWorkspace.id);}}
                  onDragOver={(ev) => {
                    ev.preventDefault();
                  }}
                  onDragOver={(ev) => {
                    ev.preventDefault();
                    ev.target.style.border="2px solid #000062";
                  }}
                  onDragLeave={(ev) => {
                    ev.preventDefault();
                    ev.target.style.border="none";
                  }}
                  onClick={() => {joinToWorkSpace(publicWorkspace.id);}}
                >
                  Join
                </button>
              }
            </div>
          }
          {
            !this.isOpen(publicWorkspace.id) && <div
              style={{
                marginBottom: 15,
              }}
            >
            </div>
          }
        </div>
    );
  }
};

export default inject('myData', 'workspaceStore')(observer(PublicWorkspace));