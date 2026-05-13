import React from 'react';
import Navigation from '../components/Navigation';
import '../styles/Pages.css';

function Toppers() {
  return (
    <>
      <Navigation />
      <div className="page-wrapper">
        <div className="page-header">
          <h1>Toppers</h1>
        </div>

        <div className="card">
          <h2>Select Batch for Toppers</h2>
          <form>
            <div className="form-group">
              <label>Batch</label>
              <select required>
                <option value="">-- Select Batch --</option>
              </select>
            </div>
            <button type="submit" className="btn-primary">View Toppers</button>
          </form>
        </div>
      </div>
    </>
  );
}

export default Toppers;
