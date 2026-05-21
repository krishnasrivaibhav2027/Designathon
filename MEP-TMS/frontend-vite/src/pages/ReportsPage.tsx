import { motion } from 'framer-motion';
import { Download, Filter, FileSpreadsheet, Trophy } from 'lucide-react';

export default function ReportsPage() {
  const reports = [
    { 
      title: 'Batch-wise Attendance', 
      description: 'Consolidated attendance report across all selected batches.', 
      icon: FileSpreadsheet, 
      color: 'var(--powder-blue)', 
      bg: 'var(--powder-blue-glow)',
      glowClass: 'card-glow-blue'
    },
    { 
      title: 'Assessment Scores', 
      description: 'Detailed view of sprint, API, and project evaluation scores.', 
      icon: FileSpreadsheet, 
      color: 'var(--pale-orange)', 
      bg: 'var(--pale-orange-glow)',
      glowClass: 'card-glow-orange'
    },
    { 
      title: 'Topper List', 
      description: 'Automatically generated top performers based on config.', 
      icon: Trophy, 
      color: 'var(--yellow)', 
      bg: 'var(--yellow-glow)',
      glowClass: 'card-glow-yellow'
    },
    { 
      title: 'Consolidated Batch Report', 
      description: 'Overall metrics including discontinued and offered status.', 
      icon: FileSpreadsheet, 
      color: 'var(--powder-blue)', 
      bg: 'var(--powder-blue-glow)',
      glowClass: 'card-glow-blue'
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>Reports & Downloads</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Generate and export platform analytics</p>
        </div>
        <button 
          className="btn-secondary"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', fontSize: 14,
          }}
        >
          <Filter size={18} />
          <span>Global Filters</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 24 }}>
        {reports.map((report, idx) => (
          <motion.div 
            key={report.title} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: idx * 0.1 }}
            className={`card ${report.glowClass}`} 
            style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}
          >
            <div style={{ 
              padding: 16, 
              borderRadius: 16, 
              background: report.bg,
              border: `1px solid ${report.color}`
            }}>
              <report.icon size={24} color={report.color} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{report.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>{report.description}</p>
              <div style={{ display: 'flex', gap: 16 }}>
                <button style={{ 
                  display: 'flex', alignItems: 'center', gap: 6, 
                  border: 'none', background: 'transparent', 
                  color: 'var(--powder-blue)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <Download size={16} /> Export Excel
                </button>
                <button style={{ 
                  display: 'flex', alignItems: 'center', gap: 6, 
                  border: 'none', background: 'transparent', 
                  color: 'var(--text-secondary)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <Download size={16} /> Export PDF
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

