import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Pages/Home";
import Preferences from "./Pages/Preferences";
import Login from "./Pages/Login";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/Preferences" element={<Preferences />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
