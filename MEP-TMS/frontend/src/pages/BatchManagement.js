import React, { useState } from 'react';
import Navigation from '../components/Navigation';
import '../styles/Pages.css';

function BatchManagement() {
  const [batches, setBatches] = useState([]);
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <Navigation />
      <div className="page-wrapper">
        <div className="page-header">
          <h1>Batch Management</h1>
          <button 
            className="btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            Create New Batch
          </button>
        </div>

        {showForm && (
          <div className="card">
            <h2>Create New Batch</h2>
            <form>
              <div className="form-group">
                <label>Batch Name</label>
                <input type="text" placeholder="Enter batch name" />
              </div>
              <div className="form-group">
                <label>Program</label>
                <input type="text" placeholder="Enter program name" />
              </div>
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input type="date" />
              </div>
              <button type="button" className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Create</button>
            </form>
          </div>
        )}

        <div className="card">
          <h2>Existing Batches</h2>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Batch ID</th>
                  <th>Batch Name</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="6" style={{ textAlign: 'center' }}>No batches found</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export default BatchManagement;
