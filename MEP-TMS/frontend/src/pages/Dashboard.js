import React, { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import batchService from '../services/batchService';
import '../styles/Dashboard.css';

function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      // This would be a comprehensive dashboard metrics endpoint
      setMetrics({
        totalBatches: 12,
        activeBatches: 5,
        completedBatches: 6,
        closedBatches: 1,
        totalCandidates: 450,
        discontinuedCandidates: 23,
        notClearedCandidates: 45,
        offeredCandidates: 382,
        avgAttendance: 94.2,
        avgAssessmentClearance: 87.5,
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <>
      <Navigation />
      <div className="page-wrapper">
        <div className="page-header">
          <h1>Dashboard</h1>
        </div>

        {metrics && (
          <div className="dashboard-grid">
            <div className="metric-card">
              <h3>Total Batches</h3>
              <p className="metric-value">{metrics.totalBatches}</p>
              <p className="metric-subtitle">Active: {metrics.activeBatches}</p>
            </div>
            <div className="metric-card">
              <h3>Total Candidates</h3>
              <p className="metric-value">{metrics.totalCandidates}</p>
              <p className="metric-subtitle">Offered: {metrics.offeredCandidates}</p>
            </div>
            <div className="metric-card">
              <h3>Avg Attendance</h3>
              <p className="metric-value">{metrics.avgAttendance}%</p>
              <p className="metric-subtitle">System-wide</p>
            </div>
            <div className="metric-card">
              <h3>Assessment Clearance</h3>
              <p className="metric-value">{metrics.avgAssessmentClearance}%</p>
              <p className="metric-subtitle">System-wide</p>
            </div>
            <div className="metric-card alert">
              <h3>Not Cleared</h3>
              <p className="metric-value">{metrics.notClearedCandidates}</p>
              <p className="metric-subtitle">Need intervention</p>
            </div>
            <div className="metric-card warning">
              <h3>Discontinued</h3>
              <p className="metric-value">{metrics.discontinuedCandidates}</p>
              <p className="metric-subtitle">Candidates</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Dashboard;
