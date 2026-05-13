import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Context & Auth
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BatchManagement from './pages/BatchManagement';
import AttendanceTracker from './pages/AttendanceTracker';
import AssessmentTracker from './pages/AssessmentTracker';
import Reports from './pages/Reports';
import Feedback from './pages/Feedback';
import UserManagement from './pages/UserManagement';
import Toppers from './pages/Toppers';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={<PrivateRoute><Dashboard /></PrivateRoute>}
          />
          <Route
            path="/batches"
            element={<PrivateRoute><BatchManagement /></PrivateRoute>}
          />
          <Route
            path="/attendance"
            element={<PrivateRoute><AttendanceTracker /></PrivateRoute>}
          />
          <Route
            path="/assessments"
            element={<PrivateRoute><AssessmentTracker /></PrivateRoute>}
          />
          <Route
            path="/reports"
            element={<PrivateRoute><Reports /></PrivateRoute>}
          />
          <Route
            path="/feedback"
            element={<PrivateRoute><Feedback /></PrivateRoute>}
          />
          <Route
            path="/users"
            element={<PrivateRoute><UserManagement /></PrivateRoute>}
          />
          <Route
            path="/toppers"
            element={<PrivateRoute><Toppers /></PrivateRoute>}
          />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
