import React from 'react';
import '../css/Navbar.css';
import BWLogo from '../img/bw-logo.svg';

export default function Navbar() {
  return (
    <div className='navbar'>
      <img src={BWLogo} className='navbar-img' alt='Bandwidth Logo'/>
      <div className='text'>Bandwidth</div>
    </div>
  );
}
