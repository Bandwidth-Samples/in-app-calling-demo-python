import './css/App.css';
import DialPad from './components/DialPad';
import Navbar from './components/Navbar';


export default function App() {
  return (
    <div className='App'>
      <Navbar/>
      <h1>In-App Calling</h1>
      <DialPad/>
    </div>
  );
}
