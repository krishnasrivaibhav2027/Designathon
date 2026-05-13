import React from 'react';
import Navigation from '../components/Navigation';
import '../styles/Pages.css';

function Feedback() {
  return (
    <>
      <Navigation />
      <div className="page-wrapper">
        <div className="page-header">
          <h1>Feedback Management</h1>
        </div>

        <div className="card">
          <h2>Trigger Feedback Collection</h2>
          <form>
            <div className="form-group">
              <label>Select Batch</label>
              <select required>
                <option value="">-- Select Batch --</option>
              </select>
            </div>
            <div className="form-group">
              <label>Feedback Window (Days)</label>
              <input type="number" min="1" placeholder="Number of days" required />
            </div>
            <div className="form-group">
              <label>Email Subject</label>
              <input type="text" placeholder="Email subject" required />
            </div>
            <button type="submit" className="btn-primary">Send Feedback Request</button>
          </form>
        </div>
      </div>
    </>
  );
}

export default Feedback;
