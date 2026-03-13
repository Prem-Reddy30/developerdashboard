import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Explore from './Explore';
import Auth from './Auth';
import Profile from './Profile';
import ChatBot from './ChatBot';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      <ChatBot />
    </BrowserRouter>
  );
}

export default App;
