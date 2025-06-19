
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import AudioFXProcessor from './AudioFXProcessor.jsx';




createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<AudioFXProcessor />} />
    </Routes>
  </BrowserRouter>
);