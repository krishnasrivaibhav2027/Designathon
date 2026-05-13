import React from 'react';
import Navigation from '../components/Navigation';
import '../styles/Pages.css';

function AssessmentTracker() {
  return (
    <>
      <Navigation />
      <div className="page-wrapper">
        <div className="page-header">
          <h1>Assessment Tracker</h1>
        </div>

        <div className="card">
          <h2>Upload Assessment Scores</h2>
          <form>
            <div className="form-group">
              <label>Assessment Type</label>
              <select required>
                <option value="">-- Select Type --</option>
                <option value="sprint_review">Sprint Review</option>
                <option value="api_coding">API & Coding</option>
                <option value="project">Project Evaluation</option>
              </select>
            </div>
            <div className="form-group">
              <label>Select Batch</label>
              <select required>
                <option value="">-- Select Batch --</option>
              </select>
            </div>
            <div className="form-group">
              <label>Upload Score File</label>
              <input type="file" accept=".xlsx,.xls,.csv" required />
            </div>
            <button type="submit" className="btn-primary">Upload Scores</button>
          </form>
        </div>
      </div>
    </>
  );
}

export default AssessmentTracker;
