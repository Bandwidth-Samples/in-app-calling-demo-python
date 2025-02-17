import React from 'react';
import '../css/CallControlButton.css';

export default function CallControlButton({type, onClick, disabled, Icon, iconColor='var(--white)', fontSize='large'}) {
  const color = disabled ? 'var(--grey65)' : iconColor;
  return (
    <button className={`${type}-button`} onClick={onClick} disabled={disabled}>
      <Icon sx={{ color: color }} fontSize={fontSize}/>
    </button>
  );
}
