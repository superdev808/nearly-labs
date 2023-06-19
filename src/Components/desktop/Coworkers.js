import React from 'react';
import {inject, observer} from 'mobx-react';
import InviteButton from './InviteButton';
import UserThumbnail from "./UserThumbnail";

const Coworkers = ({ workspaceStore, myData }) => {
  const thumbs = [];

  for (let i=0; i<workspaceStore.coworkers.length; i++) {
    // this is a tuple in format [id, user]
    const id = workspaceStore.coworkers[i][0];

    thumbs.push(
      <UserThumbnail key={id} id={id} clickable={true}/>
    );
  }

  return (
      <>
          {thumbs}
          {
            workspaceStore.coworkers.length < 12 && <InviteButton />
          }
      </>
  );
};

export default inject('myData', 'workspaceStore')(observer(Coworkers));