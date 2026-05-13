import React from 'react';
import Navigation from '../components/Navigation';
import '../styles/Pages.css';

function UserManagement() {
  return (
    <>
      <Navigation />
      <div className="page-wrapper">
        <div className="page-header">
          <h1>User Management</h1>
          <button className="btn-primary">Add New User</button>
        </div>

        <div className="card">
          <h2>Users</h2>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="5" style={{ textAlign: 'center' }}>No users found</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export default UserManagement;
