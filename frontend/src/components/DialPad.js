import React, { useEffect, useState } from 'react';
import '../css/DialPad.css';
import StatusBar from './StatusBar';
import DigitGrid from './DigitGrid';
import NumberInput from './NumberInput';
import CallControlButton from './CallControlButton';
import CallIcon from '@mui/icons-material/Call';
import CallEndIcon from '@mui/icons-material/CallEnd';
import ShortcutOutlinedIcon from '@mui/icons-material/ShortcutOutlined';
import { BandwidthUA } from '@bandwidth/bw-webrtc-sdk';
import { useStopwatch } from 'react-timer-hook';
import { Button } from '@mui/material';

/**
 * Fetches a new JWT from the backend server
 *
 * @returns {Promise<string>}
 */
async function refreshToken() {
  const tokenUrl = 'http://localhost:3001/bandwidth/authorization/token';

  try {
    const response = await fetch(tokenUrl, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    console.error('Error fetching auth token:', error);
    throw error;
  }
}

/**
 * Checks if the authToken is expired
 *
 * @param jwt
 * @returns {boolean}
 */
function isJwtExpired(jwt) {
    const jwtParts = jwt.split('.');
    if (jwtParts.length !== 3) {
        return true;
    }

    try {
        const payload = JSON.parse(atob(jwtParts[1]));
        if (payload.exp) {
        const expirationTime = payload.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        return expirationTime < currentTime;
        }
    } catch (error) {
        console.error('Error parsing JWT:', error);
        return true;
    }

    return true;
}

export default function DialPad() {
  console.log("Dialpad rendering...");
  const userId = process.env.REACT_APP_BW_FROM_NUMBER;

  const { totalSeconds, seconds, minutes, hours, start, pause, reset } = useStopwatch({ autoStart: false });

  const [destNumber, setDestNumber] = useState('');
  const [webRtcStatus, setWebRtcStatus] = useState('Idle');
  const [callStatus, setCallStatus] = useState('Add Number');
  const [destNumberValid, setDestNumberValid] = useState(false);
  const [allowHangup, setAllowHangup] = useState(false);
  const [phone, setPhone] = useState(new BandwidthUA());
  const [activeCall, setActiveCall] = useState(null);
  const [callConfirmed, setCallConfirmed] = useState(false);
  const [dialedNumber, setDialedNumber] = useState(destNumber);
  const [allowBackspace, setAllowBackspace] = useState(false);
  const [allowMute, setAllowMute] = useState(false);
  const [allowHold, setAllowHold] = useState(false);
  const [onMute, setOnMute] = useState(false);
  const [onHold, setOnHold] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [initiateCall, setCallInitiate] = useState(false);
  const [incomingPayload, setIncomingPayload] = useState({});

  const [callState, setCallState] = useState('Add Number');
  const [userStatus, setUserStatus] = useState('Idle');
  const [backendWebSocket, setBackendWebSocket] = useState(null);
  const [isBackendWebSocketOpen, setIsBackendWebSocketOpen] = useState(false);
  const [authToken, setAuthToken ] = useState('');

  /**
   * Refresh the JWT token if it is null or expired
   */
  useEffect( () => {
    const token = async () => {
      if (!authToken || isJwtExpired(authToken)) {
        console.log("refreshing token...")
        setAuthToken(await refreshToken());
      }
    }
    token();
  }, []);

  /**
   * Connect to the backend WebSocket
   *
   * This websocket publishes messages to the frontend letting us know there is an inbound caller
   */
  useEffect(() => {
    const connectBackendWebSocket = () => {
      const backendWebsocketUrl = 'ws://localhost:3001/bandwidth/notifications/ws';
      console.log('Connecting to backend WebSocket ' + backendWebsocketUrl);
      const ws = new WebSocket(backendWebsocketUrl);
      setBackendWebSocket(ws);

      ws.onopen = () => {
        console.log('Backend WebSocket connected');
        setIsBackendWebSocketOpen(true);
      };

      ws.onmessage = (event) => {
        console.log('WebSocket message received:', event.data); // Log the raw message
        try {
          const msg = JSON.parse(event.data);
          console.log('Parsed message:', msg);

          if (msg.type === 'call') {
            setIncomingPayload(msg.data);
            setIncomingCall(true);
            setCallState('Ringing');
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        console.error('WebSocket readyState:', ws.readyState);
      };

      ws.onclose = (event) => {
        console.log('Backend WebSocket connection closed');
        console.log('Close event:', event);
        setIsBackendWebSocketOpen(false);
        // Attempt to reconnect after a delay
        setTimeout(connectBackendWebSocket, 5000);
      };
    };

    connectBackendWebSocket();

    return () => {
      if (backendWebSocket) {
        backendWebSocket.close();
      }
    };
  }, []);

  useEffect(() => {
    const updateStatus = () => {
      if (isBackendWebSocketOpen && backendWebSocket && backendWebSocket.readyState === WebSocket.OPEN) {
        const payload = {
          userId: userId,
        };
        backendWebSocket.send(JSON.stringify(payload));
      } else {
        console.warn('WebSocket is not open. Cannot send message.');
      }
    };

    updateStatus();
  }, [backendWebSocket, isBackendWebSocketOpen]);

  useEffect(() => {
    const serverConfig = {
      domain: 'gw.webrtc-app.bandwidth.com',
      addresses: ['wss://gw.webrtc-app.bandwidth.com:10081'],
      iceServers: [
        'stun.l.google.com:19302',
        'stun1.l.google.com:19302',
        'stun2.l.google.com:19302',
      ],
    };
    const newPhone = new BandwidthUA();
    newPhone.setWebSocketKeepAlive(5, false, false, 5, true);
    newPhone.setServerConfig(
      serverConfig.addresses,
      serverConfig.domain,
      serverConfig.iceServers
    );
    newPhone.checkAvailableDevices();
    newPhone.setAccount(`${userId}`, 'In-App Calling Sample', '');
    newPhone.setOAuthToken(authToken);
    newPhone.init();
    setPhone(newPhone);
  }, [authToken]);

  useEffect(() => {
    phone.setListeners({
      loginStateChanged: function (isLogin, cause) {
        console.log(cause);
        // eslint-disable-next-line default-case
        switch (cause) {
          case 'connected':
            console.log('phone>>> loginStateChanged: connected');
            break;
          case 'disconnected':
            console.log('phone>>> loginStateChanged: disconnected');
            if (phone.isInitialized())
              // after deinit() phone will disconnect SBC.
              console.log('Cannot connect to SBC server');
            break;
          case 'login failed':
            console.log('phone>>> loginStateChanged: login failed');
            break;
          case 'login':
            console.log('phone>>> loginStateChanged: login');
            break;
          case 'logout':
            console.log('phone>>> loginStateChanged: logout');
            break;
        }
      },

      outgoingCallProgress: function (call, response) {
        setCallState("Call-Initiate");
        console.log('phone>>> outgoing call progress');
      },

      callTerminated: function (call, message, cause) {
        console.log(`phone>>> call terminated callback, cause=${cause}`);
        if (call !== activeCall) {
          console.log('terminated no active call');
        }
        setCallState("Idle");
        setAllowHangup(false);
        setActiveCall(null);
        setCallStatus('Add Number');
        setWebRtcStatus('Idle');
        setAllowBackspace(true);
        setAllowHold(false);
        setAllowMute(false);
        setOnHold(false);
        setOnMute(false);
        setCallConfirmed(false);
        console.log(`Call terminated: ${cause}`);
        console.log('call_terminated_panel');
      },

      callConfirmed: function (call, message, cause) {
        console.log('phone>>> callConfirmed');
        console.log("Call: ", call);
        console.log("Message: ", message);
        console.log("Cause: ", cause);
        setCallState("In-Call");
        setAllowHangup(true);
        setAllowMute(true);
        setAllowHold(true);
        setWebRtcStatus('Connected');
        setCallConfirmed(true);
        activeCall.muteAudio(false);
        start();
      },

      callShowStreams: function (call, localStream, remoteStream) {
        console.log('phone>>> callShowStreams');
        let remoteVideo = document.getElementById('remote-video-container');
        if (remoteVideo != undefined) {
          remoteVideo.srcObject = remoteStream;
        }
      },

      incomingCall: function (call, invite) {
        console.log('phone>>> incomingCall');
        call.reject();
      },

      callHoldStateChanged: function (call, isHold, isRemote) {
        console.log(`phone>>> callHoldStateChanged to ${isHold ? 'hold' : 'unhold'}`);
      }
    });
  }, [phone, activeCall]);

  useEffect(() => {
    destNumber.length > 7 ? setDestNumberValid(true) : setDestNumberValid(false);
    destNumber.length > 0 ? setAllowBackspace(true) : setAllowBackspace(false);
    setDestNumber(destNumber.replace(/\D/g, ''));
  }, [destNumber]);

  useEffect(() => {
    if (activeCall === null) { pause(); }
  }, [activeCall]);

  useEffect(() => {
    if (callConfirmed) {
      const formatTime = (time) => time.toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false });
      setCallStatus(`${formatTime(hours)}:${formatTime(minutes)}:${formatTime(seconds)}`);
    }
  }, [totalSeconds]);

  useEffect(() => {
    if (callConfirmed) {
      if (onHold && onMute) {
        setWebRtcStatus('On Hold');
      } else if (onHold && !onMute) {
        setWebRtcStatus('On Hold');
      } else if (!onHold && onMute) {
        setWebRtcStatus('On Mute');
      } else if (!onHold && !onMute) {
        setWebRtcStatus('Connected');
      }
    }
  }, [onHold, onMute]);

  useEffect(() => {
    const updateStatus = () => {
      // You can send current user status to your backend (if applicable)
      if (backendWebSocket) {
        const payload = {
          status: userStatus,
          userId: userId, // Include the userId if you need to identify the user
        };
        // backendWebSocket.send(JSON.stringify(payload)); // Send status to the backend via WebSocket
      }
    };

    updateStatus();
  }, [userStatus, backendWebSocket]); // Call this whenever userStatus changes

  useEffect(() => {
    if (initiateCall) {
      handleDialClick();
    }
    setCallInitiate(false);
  }, [initiateCall]);

  const handleDigitClick = (value) => {
    console.log("handleDigitClick");
    activeCall ? activeCall.sendDTMF(value) : setDestNumber((destNumber) => destNumber.concat(value));
  }

  const handlePhoneNumber = (e) => {
    console.log("handlePhoneNumber");
    setDestNumber(e.target.value.replace(/\D/g, ''));
  };

  const handleBackspaceClick = () => {
    console.log("handleBackspaceClick");
    setDestNumber((destNumber) => destNumber.slice(0, -1));
  };

  const handleAcceptClick = () => {
    console.log("handleAcceptClick");
    if (incomingPayload.fromNumber) {
      console.log("handleAcceptClick Number: %s", incomingPayload.fromNumber);
      setDestNumber(incomingPayload.fromNumber.replace('+', ''));
      setIncomingCall(false);
      setIncomingPayload({});
      setCallState("In-Call");
      setCallInitiate(true);
    } else {
      console.error("Incoming payload does not contain 'fromNumber'");
    }
  }

  const handleDeclinedClick = () => {
    console.log("handleDeclinedClick");
    setCallState("Idle");
    setIncomingCall(false);
    setIncomingPayload({});
  }

  const handleDialClick = () => {
    console.log("handleDialClick");
    if (phone.isInitialized()) {
      setCallState("Calling");
      setCallStatus('Calling');
      setWebRtcStatus('Ringing');
      let extraHeaders = [`User-to-User:eyJhbGciOiJIUzI1NiJ9.WyJoaSJd.-znkjYyCkgz4djmHUPSXl9YrJ6Nix_XvmlwKGFh5ERM;encoding=jwt;aGVsbG8gd29ybGQ;encoding=base64`];
      console.log("Dialed number: ", destNumber);
      phone.makeCall(`${destNumber}`, extraHeaders).then((value) => {
        setActiveCall(value);
      });
      setDialedNumber(`+${destNumber}`);
      setAllowHangup(true);
      setAllowBackspace(false);
      reset();
    } else {
      console.error("BandwithUA not initialized!");
    }
  };

  const handleHangUpClick = () => {
    if (activeCall) {
      activeCall.terminate();
      setAllowHangup(false);
      pause();
    }
  };

  const handleHoldClick = () => {
    if (activeCall) {
      if (activeCall.isLocalHold()) {
        activeCall.hold(false);
        setOnHold(false);
      } else {
        activeCall.hold(true);
        setOnHold(true);
      }
    }
  };

  const handleMuteClick = () => {
    if (activeCall) {
      if (activeCall.isAudioMuted()) {
        activeCall.muteAudio(false);
        setOnMute(false);
      } else {
        activeCall.muteAudio(true);
        setOnMute(true);
      }
    }
  };

  const statusBarProps = {
    muteClick: handleMuteClick,
    holdClick: handleHoldClick,
    webRtcStatus,
    allowMute,
    allowHold,
    onMute,
    onHold
  };

  const numberInputProps = {
    onChange: handlePhoneNumber,
    value: destNumber
  };

  const endCallButtonProps = {
    type: 'end-call',
    onClick: handleHangUpClick,
    disabled: !allowHangup,
    Icon: CallEndIcon
  };

  const startCallButtonProps = {
    type: 'start-call',
    onClick: handleDialClick,
    disabled: !destNumberValid,
    Icon: CallIcon
  };

  const backspaceButtonProps = {
    type: 'backspace',
    onClick: handleBackspaceClick,
    disabled: !allowBackspace,
    Icon: ShortcutOutlinedIcon,
    iconColor: 'var(--blue65)',
    fontSize: 'small'
  };

  function renderUI() {
    if (incomingCall) {
      return <div style={{ backgroundColor: "black", padding: "80px 40px", borderRadius: "10px", textAlign: "center" }}>
        <h2 style={{ color: "white" }}>Incoming call</h2>
        <h3 style={{ color: "white" }}>Call from: {incomingPayload.fromNumber}...</h3>
        <div style={{ textAlign: "center" }}><Button style={{ backgroundColor: "white", marginRight: "20px" }} onClick={handleAcceptClick}>Accept</Button><Button style={{ backgroundColor: "white" }} color='error' onClick={handleDeclinedClick}>Reject</Button></div>
      </div>;
    } else {
      return <div>
        <StatusBar {...statusBarProps} />
        <div className='dialpad-container'>
          <h2>{callStatus}</h2>
          {!allowHangup ? <NumberInput {...numberInputProps} /> : <div className='dialed-number'>{dialedNumber}</div>}
          <DigitGrid onClick={handleDigitClick} />
          <div className='call-controls'>
            <div className='call-start-end'>
              {!allowHangup ? <CallControlButton {...startCallButtonProps} /> : <CallControlButton {...endCallButtonProps} />}
            </div>
            <CallControlButton {...backspaceButtonProps} />
          </div>
          <video autoPlay id='remote-video-container' style={{ display: 'none' }}></video>
        </div>
      </div>;
    }
  }

  return (
    <div>
      {renderUI()}
    </div>
  )
}
