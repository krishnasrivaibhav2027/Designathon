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
  { name: 'Passed', value: 635, color: 'var(--powder-blue)' },
  { name: 'Failed', value: 135, color: 'var(--pale-orange)' },
];

const batchPerformance = [
  { name: 'React Cohort', target: 80, reality: 85 },
  { name: 'Python Basics', target: 80, reality: 72 },
  { name: 'DevOps Intro', target: 80, reality: 78 },
  { name: 'Cloud Arch', target: 80, reality: 90 },
];

export default function AdminDashboard() {
  const stats = [
    { title: 'Total Candidates', value: '1,240', change: '+8% from last month', icon: Users, colorClass: 'card-glow-orange', iconColor: 'var(--pale-orange)' },
    { title: 'Total Active Batches', value: '34', change: '+5% from last month', icon: BookOpen, colorClass: 'card-glow-blue', iconColor: 'var(--powder-blue)' },
    { title: 'Total Cleared', value: '856', change: '+12% from last month', icon: Award, colorClass: 'card-glow-yellow', iconColor: 'var(--yellow)' },
    { title: 'At Risk Candidates', value: '54', change: '0.5% from last month', icon: AlertTriangle, colorClass: 'card-glow-orange', iconColor: '#ff6b6b' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
      {/* Row 1: Global Stats + Overall Attendance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card card-glow-blue">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Global Platform Overview</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>System-wide metrics</p>
            </div>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border-color)',
              background: 'var(--bg-card)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer',
              boxShadow: 'var(--shadow-card)', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--powder-blue)'; e.currentTarget.style.boxShadow = '0 0 8px var(--powder-blue-glow)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
            >
              <Download size={14} /> Export Report
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {stats.map((s) => (
              <div key={s.title} className={s.colorClass} style={{ borderRadius: 14, padding: 16, border: '1px solid var(--border-color)', background: 'var(--bg-main)', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', marginBottom: 10,
                  background: 'var(--border-color)',
                }}>
                  <s.icon size={16} color={s.iconColor} />
                </div>
                <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</p>
                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 2 }}>{s.title}</p>
                <p style={{ fontSize: 10, color: '#10b981', marginTop: 4, fontWeight: 600 }}>{s.change}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-glow-orange">
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Platform Attendance Trends</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10, boxShadow: 'var(--shadow-card)', color: 'var(--text-primary)' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: 'var(--text-primary)' }} />
              <Line type="monotone" dataKey="present" stroke="var(--powder-blue)" strokeWidth={2.5} dot={{ r: 3 }} name="Present" />
              <Line type="monotone" dataKey="late" stroke="var(--yellow)" strokeWidth={2.5} dot={{ r: 3 }} name="Late" />
              <Line type="monotone" dataKey="absent" stroke="#ff6b6b" strokeWidth={2.5} dot={{ r: 3 }} name="Absent" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
        {/* Pass vs Fail Pie */}
        <div className="card card-glow-blue">
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Global Pass/Fail Ratio</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value">
                {pieData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10, boxShadow: 'var(--shadow-card)', color: 'var(--text-primary)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 8 }}>
            {pieData.map((d) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.name}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginLeft: 4 }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Target vs Reality */}
        <div className="card card-glow-yellow">
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Batch Performance Targets</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={batchPerformance} barGap={2}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10, boxShadow: 'var(--shadow-card)', color: 'var(--text-primary)' }} />
              <Bar dataKey="reality" fill="var(--powder-blue)" radius={[4, 4, 0, 0]} name="Actual Score" />
              <Bar dataKey="target" fill="var(--pale-orange)" radius={[4, 4, 0, 0]} name="Target Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Geographic Distribution */}
        <div className="card card-glow-orange" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Geographic Distribution</h3>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--powder-blue-glow) 0%, rgba(255,255,255,0.02) 100%)', borderRadius: 12,
            minHeight: 200,
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }} className="float-animated">🌍</div>
              <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 700 }}>Active Training Centers</p>
              <div style={{ display: 'flex', gap: 12, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap', padding: '0 16px' }}>
                {['Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Delhi'].map((city) => (
                  <span key={city} style={{
                    padding: '6px 12px', borderRadius: 8,
                    background: 'var(--bg-card)', fontSize: 11, color: 'var(--pale-orange)', fontWeight: 700,
                    boxShadow: 'var(--shadow-card)', border: '1px solid var(--border-color)',
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
