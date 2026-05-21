import React from 'react';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <BarChart3 size={28} color="var(--pale-orange)" />
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>Analytics</h2>
      </div>
      <div className="card card-glow-orange" style={{ padding: 40, textAlign: 'center' }}>
        <h3 style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 700 }}>In-depth Analytics coming soon!</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Dive deeper into your learning metrics and cohort insights.</p>
      </div>
    </div>
  );
}

