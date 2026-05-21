import { motion } from 'framer-motion';
import { Download, Filter, FileSpreadsheet, Trophy } from 'lucide-react';

export default function ReportsPage() {
  const reports = [
    { title: 'Batch-wise Attendance', description: 'Consolidated attendance report across all selected batches.', icon: FileSpreadsheet, color: '#5b5fc7', bg: '#e8eaf6' },
    { title: 'Assessment Scores', description: 'Detailed view of sprint, API, and project evaluation scores.', icon: FileSpreadsheet, color: '#42a5f5', bg: '#e3f2fd' },
    { title: 'Topper List', description: 'Automatically generated top performers based on config.', icon: Trophy, color: '#ffa726', bg: '#fff3e0' },
    { title: 'Consolidated Batch Report', description: 'Overall metrics including discontinued and offered status.', icon: FileSpreadsheet, color: '#66bb6a', bg: '#e8f5e9' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#2d3436' }}>Reports & Downloads</h1>
          <p style={{ fontSize: 14, color: '#b2bec3', marginTop: 4 }}>Generate and export platform analytics</p>
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 12, border: '1px solid #e0e0e0',
          background: '#fff', color: '#636e72', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <Filter size={18} /><span>Global Filters</span>
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 24 }}>
        {reports.map((report, idx) => (
          <motion.div key={report.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
            className="card" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ padding: 16, borderRadius: 16, background: report.bg }}>
              <report.icon size={24} color={report.color} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2d3436', marginBottom: 4 }}>{report.title}</h3>
              <p style={{ fontSize: 13, color: '#636e72', lineHeight: 1.5, marginBottom: 16 }}>{report.description}</p>
              <div style={{ display: 'flex', gap: 16 }}>
                <button style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', color: '#5b5fc7', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}><Download size={16} /> Export Excel</button>
                <button style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', color: '#b2bec3', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}><Download size={16} /> Export PDF</button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
