import React from 'react';
import {inject, observer} from 'mobx-react';

class ShareVideo extends React.Component {
    constructor(props) {
        super(props);
        this.sharerVideo = React.createRef();
    }

    componentDidMount() {
        this.updateVideoStream();

        const {callStore} = this.props;

        let selfie = document.getElementById("screen_video");
            if (selfie) {
                selfie.onloadedmetadata = function() {
                callStore.screenShareWidth = this.videoWidth;
                callStore.screenShareHeight = this.videoHeight;
            }
        }
    }
    
    componentDidUpdate() {
        this.updateVideoStream();
    }
    
    updateVideoStream = () => {
        const {callStore} = this.props;
    
        if (callStore.screenShareStream 
            && this.sharerVideo 
            && this.sharerVideo.current 
            && this.sharerVideo.current.srcObject !== callStore.screenShareStream) {
          this.sharerVideo.current.srcObject = callStore.screenShareStream;
        }
    }

    render() {
        const {callStore, width, height} = this.props;

        if (callStore.isMyScreenShared) {
            return null;
        }
    
        let style = {
            WebkitTransform: "rotateY(0deg)",
            backgroundColor: "#000",
            width: width ? width : "100%",
        };

        if (height) style = {...style, height: height};

        return (
            <div className="share-video-container">
                <video
                    id="screen_video"
                    style={style}
                    ref={this.sharerVideo}
                    autoPlay={true}
                    muted={true}
                />
            </div>
        );
    }
}

export default inject('callStore')(observer(ShareVideo));