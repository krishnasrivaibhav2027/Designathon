import { Users, BookOpen, Award, AlertTriangle, Download } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

/* ── Mock Data for Admin ── */
const attendanceTrend = [
  { month: 'Jan', present: 850, late: 120, absent: 80 },
  { month: 'Feb', present: 920, late: 140, absent: 100 },
  { month: 'Mar', present: 880, late: 200, absent: 150 },
  { month: 'Apr', present: 1050, late: 180, absent: 170 },
  { month: 'May', present: 950, late: 250, absent: 220 },
  { month: 'Jun', present: 1120, late: 220, absent: 190 },
];

const pieData = [
  { name: 'Passed', value: 635, color: '#66bb6a' },
  { name: 'Failed', value: 135, color: '#5b5fc7' },
];

const batchPerformance = [
  { name: 'React Cohort', target: 80, reality: 85 },
  { name: 'Python Basics', target: 80, reality: 72 },
  { name: 'DevOps Intro', target: 80, reality: 78 },
  { name: 'Cloud Arch', target: 80, reality: 90 },
];

export default function AdminDashboard() {
  const stats = [
    { title: 'Total Candidates', value: '1,240', change: '+8% from last month', icon: Users, colorClass: 'stat-card-red', iconClass: 'stat-icon-red' },
    { title: 'Total Active Batches', value: '34', change: '+5% from last month', icon: BookOpen, colorClass: 'stat-card-orange', iconClass: 'stat-icon-orange' },
    { title: 'Total Cleared', value: '856', change: '+12% from last month', icon: Award, colorClass: 'stat-card-green', iconClass: 'stat-icon-green' },
    { title: 'At Risk Candidates', value: '54', change: '0.5% from last month', icon: AlertTriangle, colorClass: 'stat-card-blue', iconClass: 'stat-icon-blue' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Row 1: Global Stats + Overall Attendance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2d3436' }}>Global Platform Overview</h2>
              <p style={{ fontSize: 13, color: '#b2bec3', marginTop: 2 }}>System-wide metrics</p>
            </div>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10, border: '1px solid #e0e0e0',
              background: '#fff', fontSize: 13, fontWeight: 500, color: '#636e72', cursor: 'pointer',
            }}>
              <Download size={14} /> Export Report
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {stats.map((s) => (
              <div key={s.title} className={s.colorClass} style={{ borderRadius: 14, padding: 16, position: 'relative' }}>
                <div className={s.iconClass} style={{
                  width: 32, height: 32, borderRadius: 10, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', marginBottom: 10,
                }}>
                  <s.icon size={16} color="#fff" />
                </div>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#2d3436' }}>{s.value}</p>
                <p style={{ fontSize: 12, fontWeight: 500, color: '#636e72', marginTop: 2 }}>{s.title}</p>
                <p style={{ fontSize: 10, color: '#66bb6a', marginTop: 4 }}>{s.change}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2d3436', marginBottom: 16 }}>Platform Attendance Trends</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#b2bec3' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#b2bec3' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="present" stroke="#5b5fc7" strokeWidth={2.5} dot={{ r: 3 }} name="Present" />
              <Line type="monotone" dataKey="late" stroke="#66bb6a" strokeWidth={2.5} dot={{ r: 3 }} name="Late" />
              <Line type="monotone" dataKey="absent" stroke="#ff6b6b" strokeWidth={2.5} dot={{ r: 3 }} name="Absent" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
        {/* Pass vs Fail Pie */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2d3436', marginBottom: 16 }}>Global Pass/Fail Ratio</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value">
                {pieData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 8 }}>
            {pieData.map((d) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
                <span style={{ fontSize: 12, color: '#636e72' }}>{d.name}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#2d3436', marginLeft: 4 }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Target vs Reality */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2d3436', marginBottom: 16 }}>Batch Performance Targets</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={batchPerformance} barGap={2}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#b2bec3' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#b2bec3' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="reality" fill="#5b5fc7" radius={[4, 4, 0, 0]} name="Actual Score" />
              <Bar dataKey="target" fill="#ffa726" radius={[4, 4, 0, 0]} name="Target Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Geographic Distribution */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2d3436', marginBottom: 16 }}>Geographic Distribution</h3>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #e8f5e9, #f1f8e9)', borderRadius: 12,
            minHeight: 200,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🌍</div>
              <p style={{ fontSize: 14, color: '#636e72', fontWeight: 500 }}>Active Training Centers</p>
              <div style={{ display: 'flex', gap: 12, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {['Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Delhi'].map((city) => (
                  <span key={city} style={{
                    padding: '4px 10px', borderRadius: 8,
                    background: '#fff', fontSize: 11, color: '#5b5fc7', fontWeight: 500,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}>{city}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
