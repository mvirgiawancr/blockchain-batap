import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import UPPSDashboard from './pages/UPPSDashboard';
import SekretariatDashboard from './pages/SekretariatDashboard';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<UPPSDashboard />} />
          <Route path="/sekretariat" element={<SekretariatDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
