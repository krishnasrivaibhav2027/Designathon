import React, { useState } from 'react';
import Navigation from '../components/Navigation';
import '../styles/Pages.css';

function AttendanceTracker() {
  const [uploadMode, setUploadMode] = useState('manual');

  return (
    <>
      <Navigation />
      <div className="page-wrapper">
        <div className="page-header">
          <h1>Attendance Tracker</h1>
        </div>

        <div className="card">
          <h2>Select Upload Mode</h2>
          <div className="upload-mode-selector">
            <button 
              className={uploadMode === 'manual' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setUploadMode('manual')}
            >
              Manual Entry
            </button>
            <button 
              className={uploadMode === 'excel' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setUploadMode('excel')}
            >
              Excel Upload
            </button>
          </div>
        </div>

        {uploadMode === 'manual' && (
          <div className="card">
            <h2>Manual Attendance Entry</h2>
            <form>
              <div className="form-group">
                <label>Select Batch</label>
                <select required>
                  <option value="">-- Select Batch --</option>
                  <option value="batch1">Batch 1</option>
                </select>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" required />
              </div>
              <div className="form-group">
                <label>Candidate Details</label>
                <textarea placeholder="Enter candidate IDs and attendance status"></textarea>
              </div>
              <button type="submit" className="btn-primary">Submit Attendance</button>
            </form>
          </div>
        )}

        {uploadMode === 'excel' && (
          <div className="card">
            <h2>Upload Attendance Excel</h2>
            <form>
              <div className="form-group">
                <label>Select Batch</label>
                <select required>
                  <option value="">-- Select Batch --</option>
                  <option value="batch1">Batch 1</option>
                </select>
              </div>
              <div className="form-group">
                <label>Upload File</label>
                <input type="file" accept=".xlsx,.xls,.csv" required />
              </div>
              <button type="submit" className="btn-primary">Upload</button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

export default AttendanceTracker;
