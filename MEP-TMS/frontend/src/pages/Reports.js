import React from 'react';
import Navigation from '../components/Navigation';
import '../styles/Pages.css';

function Reports() {
  const [reportType, setReportType] = React.useState('attendance');

  return (
    <>
      <Navigation />
      <div className="page-wrapper">
        <div className="page-header">
          <h1>Reports</h1>
        </div>

        <div className="card">
          <h2>Select Report Type</h2>
          <div className="report-selector">
            <button 
              className={reportType === 'attendance' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setReportType('attendance')}
            >
              Attendance Report
            </button>
            <button 
              className={reportType === 'assessment' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setReportType('assessment')}
            >
              Assessment Report
            </button>
            <button 
              className={reportType === 'consolidated' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setReportType('consolidated')}
            >
              Consolidated Report
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Download Report</h2>
          <form>
            <div className="form-group">
              <label>Select Batch</label>
              <select required>
                <option value="">-- Select Batch --</option>
              </select>
            </div>
            <div className="form-group">
              <label>Export Format</label>
              <select required>
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            <button type="submit" className="btn-primary">Download Report</button>
          </form>
        </div>
      </div>
    </>
  );
}

export default Reports;
