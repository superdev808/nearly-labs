import CallStore from './Call';

beforeEach(() => {
  CallStore.onHangupCall();
})

describe('Call state :: Multi Party Call', () => {
  describe('I add another person to the call', () => {

    // they accept
    
    // they decline
    describe('user accepts invite to multi-party call', () => {
        it('should update the state to reflect the fact we are in a call with a user', () => {
          const callId = 123;
          CallStore.onStartCall(null, callId);
    
          expect(CallStore.callId).toBe(callId);
    
          CallStore.onCallJoined(null, callId, 1, null, null, 'remoteStream', null);
          CallStore.onCallRejected(null, callId, 2);
    
          expect(CallStore.callId).toBe(callId);
          expect(CallStore.userCount).toBe(1);
          expect(CallStore.knocking.outbound).toBe(false);
        });
      });

  });

  describe('Another person added to the call by someone else', () => {
    describe('user accepts invite to multi-party call', () => {
        it('should update the state to reflect the fact we are in a call with a user', () => {
          const callId = 123;
          CallStore.onStartCall(null, callId);
    
          expect(CallStore.callId).toBe(callId);
    
          CallStore.onCallJoined(null, callId, 1, null, null, 'remoteStream', null);
          CallStore.onCallJoined(null, callId, 2, null, null, 'remoteStream', null);
    
          expect(CallStore.callId).toBe(callId);
          expect(CallStore.userCount).toBe(2);
          expect(CallStore.knocking.outbound).toBe(false);
        });
      });
    // they decline

  });

  describe('Multiple people are in a call and someone leaves', () => {

    // they hang up

  });
  
    // describe('hangupCall()', () => {
    //   it('onHangupCall() callback should reset values back to their original states', () => {
    //     const callId = 123;
    //     CallStore.onStartCall(null, callId);
  
    //     expect(CallStore.callId).toBe(callId);
    //     expect(CallStore.knocking.outbound).toBe(true);
        
    //     CallStore.onHangupCall();
    //     expect(CallStore.callId).toBe(null);
    //     expect(CallStore.knocking.outbound).toBe(false);

    //     // user count is still 0 because we hung up
    //     expect(CallStore.userCount).toBe(0);
    //   });
    // });
  
    // describe('onCallRejected()', () => {
    //   it('should reset the UI (not in a call) if there are no other people in the call', () => {
    //     const callId = 123;
    //     CallStore.onStartCall(null, callId);
  
    //     expect(CallStore.callId).toBe(callId);
  
    //     CallStore.onCallRejected();
  
    //     expect(CallStore.callId).toBe(null);
    //     expect(CallStore.knocking.outbound).toBe(false);

    //     // user count is still 0 because they rejected the call
    //     expect(CallStore.userCount).toBe(0);
    //   });
    // });
});