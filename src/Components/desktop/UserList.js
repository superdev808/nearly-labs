import React from "react";
import { inject, observer } from 'mobx-react';
import UserThumbnail from "./UserThumbnail";

const UserList = ({ workspaceStore, myData, callStore, afterClick }) => {
  const thumbs = [];
  
  for (let i=0; i<workspaceStore.coworkers.length; i++) {
    const id = workspaceStore.coworkers[i][0];

    if (id !== myData.userId && !callStore.peopleInCall.includes(id)) {
      thumbs.push(
        <UserThumbnail key={id} id={id} afterClick={afterClick} clickable={true}/>
      );
    }
  }

  return (
    <>
      <div className="user-container" data-component="UserList">
        {thumbs}
      </div>
    </>
  );
}
export default inject('workspaceStore', 'myData', 'callStore')(observer(UserList));