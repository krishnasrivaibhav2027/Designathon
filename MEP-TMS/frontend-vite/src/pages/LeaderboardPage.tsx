import React from 'react';
import { Trophy } from 'lucide-react';

export default function LeaderboardPage() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Trophy size={28} color="#f9a51b" />
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#131313', fontFamily: 'Outfit, sans-serif' }}>Leaderboard</h2>
      </div>
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <h3 style={{ fontSize: 18, color: '#131313', fontWeight: 700 }}>Rankings coming soon!</h3>
        <p style={{ color: '#919a9f', marginTop: 8 }}>Compete with your peers and see your standing here.</p>
      </div>
    </div>
  );
}
