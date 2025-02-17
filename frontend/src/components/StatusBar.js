import React from 'react';
import '../css/StatusBar.css';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import CallIcon from '@mui/icons-material/Call';
import PhonePausedIcon from '@mui/icons-material/PhonePaused';

export default function StatusBar({ muteClick, holdClick, webRtcStatus, allowMute, allowHold, onMute, onHold }) {
  const muteText = onMute ? 'Unmute' : 'Mute';
  const holdText = onHold ? 'Resume' : 'Hold';
  const iconStyle = { fontSize: '16px' };
  const muteIcon = onMute ? <MicIcon sx={iconStyle}/> : <MicOffIcon sx={iconStyle}/>;
  const holdIcon = onHold ? <CallIcon sx={iconStyle}/> : <PhonePausedIcon sx={iconStyle}/>;

  const statusBadgeStyleMap = {
    'Idle': 'var(--grey15)',
    'Connected': 'var(--green65)',
    'On Mute': 'var(--red55)',
    'On Hold': 'var(--maroon50)',
    'Ringing': 'var(--yellow65)',
  };

  const statusBadgeStyle = {
    borderRadius: '6px',
    textTransform: 'uppercase',
    color: webRtcStatus === 'Idle' ? 'var(--grey65)' : 'var(--white)',
    fontSize: '16px',
    lineHeight: '16px',
    fontWeight: 400,
    padding: '0 6px',
    backgroundColor: statusBadgeStyleMap[webRtcStatus]
  };

  return (
    <div className='status-bar'>
      <div className='webrtc-status'>Status: <span style={statusBadgeStyle}>{webRtcStatus}</span></div>
      <div className='status-buttons'>
        <div className='left-button'>
          <button className='mute-button' disabled={!allowMute} onClick={() => muteClick()}>{muteIcon}{muteText}</button>
        </div>
        <div className='right-button'>
          <button className='hold-button' disabled={!allowHold} onClick={() => holdClick()}>{holdIcon}{holdText}</button>
        </div>
      </div>
    </div>
  );
}
