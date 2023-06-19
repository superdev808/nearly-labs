import React from 'react';
import {inject, observer} from 'mobx-react';
import { UnmutedImages, MutedImages, SignalImages } from '../util/MicrophoneImages';

class MicrophoneLevel extends React.Component {
    render() {
        const { myData, callStore } = this.props;
        const muted = myData.micIsMuted;
        const level = `B${myData.micAudioLevel}`;
        const altText = `${callStore.streamCounter}-${myData.streamCounter}`;
    
        if ((callStore.callId || callStore.currentPublicWorkspaceId) && !callStore.knocking.inbound) {
          return (
            <img
              src={muted ? MutedImages['B4'] : UnmutedImages[level]}
              alt={altText}
              onClick={() => myData.setMicrophoneMuted(!myData.micIsMuted)}
            />
          );
        } else {
          if (myData.isCameraStatusOut) {
            return <img src={SignalImages["B0"]} alt={altText} />;
          }
    
          return (<img src={SignalImages[level]} alt={altText} />);
        }
    }
}

export default inject('callStore', 'myData')(observer(MicrophoneLevel));