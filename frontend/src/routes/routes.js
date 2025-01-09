import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import VerifyPhone from './pages/VerifyPhone';
// Other page imports...

const AppRoutes = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/verify-phone" element={<VerifyPhone />} />
      {/* Other routes */}
    </Routes>
  </Router>
);

export default AppRoutes;
