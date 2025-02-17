import React from 'react';
import '../css/NumberInput.css';
import TextField from '@mui/material/TextField';
import { InputAdornment } from '@mui/material';

export default function NumberInput ({ onChange, value }) {
  const phoneNumberNote = 'Enter phone number in E.164 format.';
  const phoneNumberInputStyle = {
    width: '100%',
    '.MuiOutlinedInput-root': { height: '45px', border: '2px solid var(--grey20)', marginTop: '-1px' },
    '.MuiInputBase-input': { lineHeight: '12px', fontFamily: 'var(--overpass)' },
    '& fieldset': { border: 'none' },
    '.MuiInputBase-input::placeholder': { color: 'var(--grey55)', opacity: '1' }
  };

  return (
    <div className='number-input'>
      <TextField
        onChange={onChange}
        value={value}
        sx={phoneNumberInputStyle}
        label=''
        placeholder='Phone Number'
        InputProps={{ startAdornment: <InputAdornment position="start">+</InputAdornment> }}
      />
      <div className='number-note'>{phoneNumberNote}</div>
    </div>
  );
}
