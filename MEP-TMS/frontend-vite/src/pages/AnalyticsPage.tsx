import React from 'react';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <BarChart3 size={28} color="#f9a51b" />
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#131313', fontFamily: 'Outfit, sans-serif' }}>Analytics</h2>
      </div>
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <h3 style={{ fontSize: 18, color: '#131313', fontWeight: 700 }}>In-depth Analytics coming soon!</h3>
        <p style={{ color: '#919a9f', marginTop: 8 }}>Dive deeper into your learning metrics and cohort insights.</p>
      </div>
    </div>
  );
}
