import CallStore from './Call';

beforeEach(() => {
  CallStore.onHangupCall();
})

describe('Call state', () => {
  it('should have default values', () => {
    expect(CallStore.callId).toBe(null);
    expect(CallStore.userCount).toBe(0);

    expect(CallStore.knocking.inbound).toBe(false);
    expect(CallStore.knocking.outbound).toBe(false);
  });

  it('should reject incoming calls if I\'m already in a call', () => {
    expect(CallStore.callId).toBe(null);
    expect(CallStore.knocking.outbound).toBe(false);

    const callId = 123;
    CallStore.onStartCall(null, callId);

    expect(CallStore.callId).toBe(callId);
    expect(CallStore.knocking.inbound).toBe(false);

    CallStore.onCallIncoming(null, 3456);
    expect(CallStore.callId).toBe(callId);
    expect(CallStore.knocking.inbound).toBe(false);
  });

  describe('Single Party Call :: I call someone else', () => {
    describe('startCall()', () => {
      it('should set the user ID when starting an outbound call', () => {
        expect(CallStore.beingKnocked.calleeId).toBe(null);
        
        const userId = 123;
        CallStore.startCall(userId);
    
        expect(CallStore.beingKnocked.calleeId).toBe(userId);
        
        // expect(CallStore.onStartCall).toHaveBeenCalled();
      });
  
      it('onStartCall() callback should set values correctly', () => {
        const callId = 123;
        expect(CallStore.callId).toBe(null);
        expect(CallStore.knocking.outbound).toBe(false);
  
        CallStore.onStartCall(null, callId);
  
        expect(CallStore.callId).toBe(callId);
        expect(CallStore.knocking.outbound).toBe(true);

        // user count is still 0 because they have not accepted the call yet
        expect(CallStore.userCount).toBe(0);
      });
    });
  
    describe('hangupCall()', () => {
      it('onHangupCall() callback should reset values back to their original states', () => {
        const callId = 123;
        CallStore.onStartCall(null, callId);
  
        expect(CallStore.callId).toBe(callId);
        expect(CallStore.knocking.outbound).toBe(true);
        
        CallStore.onHangupCall();
        expect(CallStore.callId).toBe(null);
        expect(CallStore.knocking.outbound).toBe(false);

        // user count is still 0 because we hung up
        expect(CallStore.userCount).toBe(0);
      });
    });
  
    describe('onCallRejected()', () => {
      it('should reset the UI (not in a call) if there are no other people in the call', () => {
        const callId = 123;
        CallStore.onStartCall(null, callId);
  
        expect(CallStore.callId).toBe(callId);
  
        CallStore.onCallRejected();
  
        expect(CallStore.beingKnocked.calleeId).toBe(null);
        expect(CallStore.knocking.outbound).toBe(false);
        // expect(CallStore.emitUserCount).toHaveBeenCalled();

        // user count is still 0 because they rejected the call
        expect(CallStore.userCount).toBe(0);
      });
    });

    describe('user accepts my call', () => {
      it('should update the state to reflect the fact we are in a call with a user', () => {
        const callId = 123;
        CallStore.onStartCall(null, callId);
  
        expect(CallStore.callId).toBe(callId);
  
        CallStore.onCallJoined(null, callId, 1, null, null, 'remoteStream', null);
  
        expect(CallStore.callId).toBe(callId);
        expect(CallStore.userCount).toBe(1);
        expect(CallStore.knocking.outbound).toBe(false);
      });
    });
  });
});