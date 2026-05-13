import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Navigation.css';

function Navigation() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/dashboard">MEP-TMS</Link>
      </div>

      <ul className="navbar-menu">
        <li><Link to="/dashboard">Dashboard</Link></li>
        {user?.role === 'COORDINATOR' || user?.role === 'ADMIN' ? (
          <>
            <li><Link to="/batches">Batches</Link></li>
            <li><Link to="/users">Users</Link></li>
            <li><Link to="/reports">Reports</Link></li>
          </>
        ) : null}
        {user?.role !== 'ADMIN' ? (
          <>
            <li><Link to="/attendance">Attendance</Link></li>
            <li><Link to="/assessments">Assessments</Link></li>
          </>
        ) : null}
        <li><Link to="/toppers">Toppers</Link></li>
      </ul>

      <div className="navbar-user">
        <span>{user?.email}</span>
        <button className="btn-secondary" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navigation;
