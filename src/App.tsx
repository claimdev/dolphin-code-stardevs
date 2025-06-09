import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import OverlayAPI from './components/OverlayAPI';
import Home from './pages/Home';
import ScamLogs from './pages/ScamLogs';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/scamlogs" element={<ScamLogs />} />
        </Routes>
        <OverlayAPI />
      </div>
    </Router>
  );
}

export default App;