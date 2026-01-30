import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SelectionPage from './components/SelectionPage';
import GitHubCallback from './components/GitHubCallback';
import MyBoards from './components/MyBoards';
import MyCollabs from './components/MyCollabs';
import Board from './components/Board';

const AppRouter = () => {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}  
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/:boardId" element={<Dashboard />} />
        <Route path="/github/callback" element={<GitHubCallback />} />
        <Route path="/myboards" element={<MyBoards />} />
        <Route path="/board" element={<Board />} />
        <Route path="/board/:boardId" element={<Board />} />
        <Route path="/collaborations" element={<MyCollabs />} />
        <Route path="/" element={<SelectionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;

