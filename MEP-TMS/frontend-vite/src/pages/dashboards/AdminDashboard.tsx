import { useState, useEffect } from 'react';
import { 
  Users, BookOpen, Award, AlertTriangle, Download, Plus, Mail, 
  Shield, UserCheck, UserX, Edit2, Trash2, Key, Eye, EyeOff, 
  Check, X, Settings, RefreshCw, Loader2, Search 
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import api from '@/services/api';
import toast from 'react-hot-toast';

/* ── Mock Data for Admin Analytics ── */
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

interface UserItem {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'settings' | 'diagnostics'>('analytics');

  // --- Users State ---
  const [users, setUsers] = useState<UserItem[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userPages, setUserPages] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userActiveFilter, setUserActiveFilter] = useState<string>('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Add User Form
  const [addFullName, setAddFullName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addRole, setAddRole] = useState('TRAINER');
  const [addPassword, setAddPassword] = useState('');
  const [showAddPassword, setShowAddPassword] = useState(false);

  // Edit User Form
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('TRAINER');
  const [editIsActive, setEditIsActive] = useState(true);

  // --- Activity Logs State ---
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // --- Diagnostics State ---
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);

  // --- Settings State ---
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [topperPercentage, setTopperPercentage] = useState(10);
  const [attendanceCutoffTime, setAttendanceCutoffTime] = useState('10:00');
  const [absentAlertDays, setAbsentAlertDays] = useState(3);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Global platform overview cards
  const stats = [
    { title: 'Total Candidates', value: '1,240', change: '+8% from last month', icon: Users, colorClass: 'card-glow-orange', iconColor: 'var(--pale-orange)' },
    { title: 'Total Active Batches', value: '34', change: '+5% from last month', icon: BookOpen, colorClass: 'card-glow-blue', iconColor: 'var(--powder-blue)' },
    { title: 'Total Cleared', value: '856', change: '+12% from last month', icon: Award, colorClass: 'card-glow-yellow', iconColor: 'var(--yellow)' },
    { title: 'At Risk Candidates', value: '54', change: '0.5% from last month', icon: AlertTriangle, colorClass: 'card-glow-orange', iconColor: '#ff6b6b' },
  ];

  // Fetch Users Function
  const fetchUsers = async (page = 1) => {
    setUsersLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (userSearch.trim()) params.search = userSearch.trim();
      if (userRoleFilter) params.role = userRoleFilter;
      if (userActiveFilter !== '') params.isActive = userActiveFilter === 'true';

      const res = await api.get('/users', { params });
      setUsers(res.data.data);
      setUserTotal(res.data.total);
      setUserPage(res.data.page);
      setUserPages(res.data.pages);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch Settings Function
  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await api.get('/users/system-settings/all');
      setTopperPercentage(res.data.topperPercentage);
      setAttendanceCutoffTime(res.data.attendanceCutoffTime);
      setAbsentAlertDays(res.data.absentAlertDays);
      setGeminiApiKey(res.data.geminiApiKey || '');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load system settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  // Fetch Diagnostics Function
  const fetchDiagnostics = async () => {
    setDiagnosticsLoading(true);
    try {
      const res = await api.get('/users/system-diagnostics');
      setDiagnosticsData(res.data);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to run system diagnostics scan');
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  // Fetch Activity Logs Function
  const fetchActivityLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await api.get('/users/activity-logs');
      setActivityLogs(res.data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load activity logs');
    } finally {
      setLogsLoading(false);
    }
  };

  // Handle Add User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFullName.trim() || !addEmail.trim() || !addPassword) {
      toast.error('Name, email, and password are required');
      return;
    }
    try {
      await api.post('/users', {
        email: addEmail.trim(),
        fullName: addFullName.trim(),
        phone: addPhone.trim() || null,
        role: addRole,
        password: addPassword
      });
      toast.success('User created successfully');
      setShowAddModal(false);
      // Reset fields
      setAddFullName('');
      setAddEmail('');
      setAddPhone('');
      setAddPassword('');
      setAddRole('TRAINER');
      fetchUsers(1);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to create user');
    }
  };

  // Handle Edit User
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!editFullName.trim() || !editEmail.trim()) {
      toast.error('Name and email are required');
      return;
    }
    try {
      await api.put(`/users/${selectedUser.id}`, {
        email: editEmail.trim(),
        fullName: editFullName.trim(),
        phone: editPhone.trim() || null,
        role: editRole,
        isActive: editIsActive
      });
      toast.success('User updated successfully');
      setShowEditModal(false);
      fetchUsers(userPage);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to update user');
    }
  };

  // Handle Delete User
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await api.delete(`/users/${selectedUser.id}`);
      toast.success('User deleted successfully');
      setShowDeleteModal(false);
      fetchUsers(1);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to delete user');
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/users/system-settings/all', {
        topperPercentage: Number(topperPercentage),
        attendanceCutoffTime,
        absentAlertDays: Number(absentAlertDays),
        geminiApiKey
      });
      toast.success('System settings saved successfully');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to save settings');
    }
  };

  // Trigger loads
  useEffect(() => {
    if (activeTab === 'settings') {
      fetchSettings();
    } else if (activeTab === 'analytics') {
      fetchActivityLogs();
    } else if (activeTab === 'diagnostics') {
      fetchDiagnostics();
    }
  }, [activeTab]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return '#f59e0b';
      case 'COORDINATOR': return 'var(--powder-blue)';
      case 'TRAINER': return 'var(--pale-orange)';
      case 'TRAINEE': return '#10b981';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto', width: '100%' }} className="fade-in">
      
      {/* Title & Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>
            Platform Governance
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            System-level settings, configuration thresholds, and credential management.
          </p>
        </div>

        {/* Tab Selection */}
        <div style={{
          display: 'flex', gap: 4, background: 'rgba(255, 255, 255, 0.03)', 
          border: '1px solid var(--border-color)', borderRadius: 12, padding: 4
        }}>
          {(['analytics', 'settings', 'diagnostics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                background: activeTab === tab ? 'var(--powder-blue)' : 'transparent',
                color: activeTab === tab ? '#121824' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                textTransform: 'capitalize'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT: ANALYTICS OVERVIEW */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
          {/* Row 1: Global Stats + Overall Attendance */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
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

            {/* Recent Platform Activity Logs */}
            <div className="card card-glow-orange" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 280 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Recent Platform Activity</h3>
                <button 
                  onClick={fetchActivityLogs}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  title="Refresh logs"
                >
                  <RefreshCw size={14} className={logsLoading ? 'animate-spin' : ''} />
                </button>
              </div>
              <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                maxHeight: 220, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 12,
                paddingRight: 4
              }}>
                {logsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                    <Loader2 className="animate-spin" size={20} />
                  </div>
                ) : activityLogs.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 13 }}>
                    No recent activity logged.
                  </div>
                ) : (
                  activityLogs.map((log: any) => (
                    <div 
                      key={log.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: 10, 
                        padding: '8px 10px', 
                        borderRadius: 8, 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        border: '1px solid var(--border-color)',
                        fontSize: 12.5
                      }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${getRoleColor(log.role)} 0%, #121824 100%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 800, fontSize: 10, flexShrink: 0
                      }}>
                        {(log.fullName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          {log.fullName || 'Unknown User'} 
                          <span style={{ 
                            fontSize: 10, 
                            fontWeight: 700, 
                            color: getRoleColor(log.role), 
                            marginLeft: 6,
                            background: `${getRoleColor(log.role)}15`,
                            padding: '2px 6px',
                            borderRadius: 4,
                            textTransform: 'uppercase'
                          }}>
                            {log.role}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', marginTop: 2, fontSize: 12 }}>
                          {log.message}
                        </div>
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center', flexShrink: 0 }}>
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}



      {/* TAB CONTENT: GOVERNANCE & SYSTEM SETTINGS */}
      {activeTab === 'settings' && (
        <div className="card card-glow-orange fade-in" style={{ padding: 28, maxWidth: 680, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
            <Settings size={22} color="var(--pale-orange)" />
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>System Settings & Thresholds</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Configure global criteria and scheduler cutoff intervals</p>
            </div>
          </div>

          {settingsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 12, color: 'var(--text-secondary)' }}>
              <Loader2 className="animate-spin" size={28} />
              <p>Loading configurations...</p>
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Topper Criteria */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Topper Threshold Percentage (%)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <input 
                    type="range" 
                    min="1" 
                    max="50" 
                    value={topperPercentage}
                    onChange={(e) => setTopperPercentage(Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--pale-orange)', cursor: 'pointer' }}
                  />
                  <span style={{
                    width: 50, textAlign: 'center', padding: '6px 10px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)',
                    fontSize: 13, fontWeight: 700, color: 'var(--pale-orange)'
                  }}>
                    {topperPercentage}%
                  </span>
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 6 }}>
                  Defines the top percentage of class performers who qualify as "toppers" (e.g. Top 10% of candidates).
                </p>
              </div>

              {/* Attendance Cutoff Time */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Daily Attendance Cutoff Time (24h format)
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. 10:00"
                  value={attendanceCutoffTime}
                  onChange={(e) => setAttendanceCutoffTime(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', maxWidth: 200 }}
                  required
                />
                <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 6 }}>
                  The cutoff time after which candidates are automatically marked absent if attendance has not been updated.
                </p>
              </div>

              {/* Absent Alert Days */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Absent Alert Consecutive Threshold (Days)
                </label>
                <input 
                  type="number" 
                  min="1"
                  max="14"
                  value={absentAlertDays}
                  onChange={(e) => setAbsentAlertDays(Number(e.target.value))}
                  className="glass-input"
                  style={{ width: '100%', maxWidth: 200 }}
                  required
                />
                <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 6 }}>
                  Trigger an automated coordinator warning if a candidate is consecutively absent for this many days.
                </p>
              </div>

              {/* Gemini Key */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Gemini API Key
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="Enter Google Gemini API Key"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
                    }}
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 6 }}>
                  Required for automated AI agents curriculum generation and candidate reports generation.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: 20, marginTop: 8 }}>
                <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px' }}>
                  <Check size={16} /> Save Settings
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB CONTENT: SYSTEM DIAGNOSTICS & DB INSPECTOR */}
      {activeTab === 'diagnostics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
          
          {/* Header Action Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="card">
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>System Diagnostics Sweep</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Inspect database tables capacity and network connection latency</p>
            </div>
            <button 
              onClick={fetchDiagnostics} 
              disabled={diagnosticsLoading}
              className="btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: 13 }}
            >
              <RefreshCw size={16} className={diagnosticsLoading ? 'animate-spin' : ''} /> Run Diagnostics Scan
            </button>
          </div>

          {diagnosticsLoading || !diagnosticsData ? (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 16, color: 'var(--text-secondary)' }}>
              <Loader2 className="animate-spin" size={36} color="var(--powder-blue)" />
              <p style={{ fontWeight: 600 }}>Executing full diagnostics sweep...</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
              
              {/* Left Column: DB Connection Status + Table Inspector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                
                {/* Connection Health Card */}
                <div className="card card-glow-blue" style={{ padding: 20 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Connection Integrity</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ padding: 14, background: 'var(--bg-main)', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Supabase Database</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {diagnosticsData.databaseHealthy ? (
                          <>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>Connected</span>
                          </>
                        ) : (
                          <>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>Disconnected</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ padding: 14, background: 'var(--bg-main)', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>API Latency (Ping)</span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--powder-blue)' }}>
                        {diagnosticsData.apiLatency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Table Inspector Meter List */}
                <div className="card card-glow-yellow" style={{ padding: 24 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Database Row Inspector</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {Object.entries(diagnosticsData.tableCounts).map(([tableName, count]: [string, any]) => (
                      <div key={tableName}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                          <span style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>{tableName}</span>
                          <span style={{ color: 'var(--yellow)' }}>{count} rows</span>
                        </div>
                        {/* Custom Visual progress bar */}
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, (count / 200) * 100)}%`,
                            background: 'var(--yellow)',
                            borderRadius: 3,
                            transition: 'width 0.8s ease-out'
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Column: Server & Python Environments */}
              <div className="card card-glow-orange" style={{ padding: 24 }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Server Diagnostic Environment</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: 'Python Version', value: diagnosticsData.systemInfo.pythonVersion, color: 'var(--text-primary)' },
                    { label: 'Host Platform', value: diagnosticsData.systemInfo.platform, color: 'var(--text-primary)', style: { textTransform: 'capitalize' } },
                    { label: 'CPU Usage', value: diagnosticsData.systemInfo.cpuUsage, color: 'var(--pale-orange)' },
                    { label: 'Process Memory RSS', value: diagnosticsData.systemInfo.memoryUsage, color: 'var(--pale-orange)' },
                    { label: 'API Uptime Status', value: 'Healthy', color: '#10b981', style: { fontWeight: 700 } },
                  ].map((item, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        padding: '12px 14px', 
                        background: 'var(--bg-main)', 
                        borderRadius: 10,
                        border: '1px solid var(--border-color)',
                        fontSize: 13,
                        fontWeight: 600
                      }}
                    >
                      <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                      <span style={{ color: item.color, ...item.style }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ 
                  marginTop: 20, padding: 14, borderRadius: 10, 
                  background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)',
                  fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5
                }}>
                  💡 <strong>Integrity Tip:</strong> Supabase table sizes represent the actual row counts fetched dynamically from the database. Run scans regularly to monitor platform growth.
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* --- ADD USER MODAL --- */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(10,12,18,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20
        }}>
          <div className="card card-glow-blue fade-in" style={{ width: '100%', maxWidth: 500, padding: 24, position: 'relative' }}>
            <button 
              onClick={() => setShowAddModal(false)}
              style={{ position: 'absolute', right: 20, top: 20, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }}>Add New User Account</h3>
            
            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Full Name</label>
                <input 
                  type="text" 
                  value={addFullName}
                  onChange={(e) => setAddFullName(e.target.value)}
                  className="glass-input" 
                  style={{ width: '100%' }}
                  placeholder="e.g. John Doe"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Email Address</label>
                <input 
                  type="email" 
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="glass-input" 
                  style={{ width: '100%' }}
                  placeholder="e.g. john@example.com"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Phone Number (Optional)</label>
                <input 
                  type="text" 
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  className="glass-input" 
                  style={{ width: '100%' }}
                  placeholder="e.g. +91 9876543210"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>System Role</label>
                  <select 
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%' }}
                  >
                    <option value="TRAINER">Trainer</option>
                    <option value="COORDINATOR">Training Coordinator</option>
                    <option value="ADMIN">System Administrator</option>
                    <option value="TRAINEE">Trainee Candidate</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Account Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showAddPassword ? 'text' : 'password'}
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="glass-input" 
                    style={{ width: '100%', paddingRight: 40 }}
                    placeholder="Enter temporary password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
                    }}
                  >
                    {showAddPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ padding: '10px 20px' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ padding: '10px 20px' }}>Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT USER MODAL --- */}
      {showEditModal && selectedUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(10,12,18,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20
        }}>
          <div className="card card-glow-yellow fade-in" style={{ width: '100%', maxWidth: 500, padding: 24, position: 'relative' }}>
            <button 
              onClick={() => setShowEditModal(false)}
              style={{ position: 'absolute', right: 20, top: 20, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }}>Edit User Account</h3>
            
            <form onSubmit={handleEditUser} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Full Name</label>
                <input 
                  type="text" 
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="glass-input" 
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Email Address</label>
                <input 
                  type="email" 
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="glass-input" 
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Phone Number (Optional)</label>
                <input 
                  type="text" 
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="glass-input" 
                  style={{ width: '100%' }}
                  placeholder="No phone number"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>System Role</label>
                <select 
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%' }}
                >
                  <option value="TRAINER">Trainer</option>
                  <option value="COORDINATOR">Training Coordinator</option>
                  <option value="ADMIN">System Administrator</option>
                  <option value="TRAINEE">Trainee Candidate</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                <input 
                  type="checkbox" 
                  id="editIsActiveCheckbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--pale-orange)', cursor: 'pointer' }}
                />
                <label htmlFor="editIsActiveCheckbox" style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}>
                  Enable Account Access (Active)
                </label>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary" style={{ padding: '10px 20px' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ padding: '10px 20px' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {showDeleteModal && selectedUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(10,12,18,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20
        }}>
          <div className="card card-glow-orange fade-in" style={{ width: '100%', maxWidth: 420, padding: 24, textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              border: '1px solid #ef4444'
            }}>
              <AlertTriangle size={24} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Delete User Account?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 24 }}>
              Are you sure you want to permanently delete the account for <strong style={{ color: 'var(--text-primary)' }}>{selectedUser.fullName}</strong> ({selectedUser.email})? This action is irreversible.
            </p>
            
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setShowDeleteModal(false)} className="btn-secondary" style={{ padding: '10px 20px' }}>Cancel</button>
              <button 
                onClick={handleDeleteUser} 
                className="btn-primary" 
                style={{ padding: '10px 20px', background: '#ef4444', borderColor: '#ef4444' }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
