import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, BookOpen, Award, AlertTriangle, Download, Plus, Mail, 
  Shield, UserCheck, UserX, Edit2, Trash2, Key, Eye, EyeOff, 
  Check, X, Settings, RefreshCw, Search 
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import api from '@/services/api';
import toast from 'react-hot-toast';
import CustomSelect from '@/components/CustomSelect';
import MorphLoader from '@/components/MorphLoader';

/* ── Analytics Data fetched dynamically from backend ── */

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

  // Edit User Form
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('TRAINER');
  const [editIsActive, setEditIsActive] = useState(true);

  // --- Activity Logs State ---
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // --- Analytics Overview State ---
  const [analyticsData, setAnalyticsData] = useState<{
    stats: {
      totalCandidates: number;
      totalActiveBatches: number;
      totalCleared: number;
      atRiskCandidates: number;
    };
    attendanceTrend: any[];
    pieData: any[];
    batchPerformance: any[];
  }>({
    stats: {
      totalCandidates: 0,
      totalActiveBatches: 0,
      totalCleared: 0,
      atRiskCandidates: 0,
    },
    attendanceTrend: [],
    pieData: [],
    batchPerformance: [],
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const { stats: analyticsStats, attendanceTrend, pieData, batchPerformance } = analyticsData;

  // Global platform overview cards
  const stats = [
    { title: 'Total Candidates', value: analyticsStats.totalCandidates.toLocaleString(), change: 'Total candidates enrolled', icon: Users, colorClass: 'card-glow-orange', iconColor: 'var(--pale-orange)' },
    { title: 'Total Active Batches', value: analyticsStats.totalActiveBatches.toLocaleString(), change: 'Currently active cohorts', icon: BookOpen, colorClass: 'card-glow-blue', iconColor: 'var(--powder-blue)' },
    { title: 'Total Cleared', value: analyticsStats.totalCleared.toLocaleString(), change: 'Cleared all courses (score >= 60%)', icon: Award, colorClass: 'card-glow-yellow', iconColor: 'var(--yellow)' },
    { title: 'At Risk Candidates', value: analyticsStats.atRiskCandidates.toLocaleString(), change: 'Below performance thresholds (< 50%)', icon: AlertTriangle, colorClass: 'card-glow-orange', iconColor: '#ff6b6b' },
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
    if (!addFullName.trim() || !addEmail.trim()) {
      toast.error('Name and email are required');
      return;
    }
    try {
      await api.post('/users', {
        email: addEmail.trim(),
        fullName: addFullName.trim(),
        phone: addPhone.trim() || null,
        role: addRole
      });
      toast.success('User created successfully');
      setShowAddModal(false);
      // Reset fields
      setAddFullName('');
      setAddEmail('');
      setAddPhone('');
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



  // Fetch Analytics Function
  const fetchDashboardAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await api.get('/users/dashboard-analytics');
      setAnalyticsData(res.data);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load dashboard analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Trigger loads
  useEffect(() => {
    fetchActivityLogs();
    fetchDashboardAnalytics();
  }, []);

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
      
      {/* Title */}
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>
          System Analytics Overview
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Real-time visual metrics, platform attendance, and system logs audit.
        </p>
      </div>

      {/* TAB CONTENT: ANALYTICS OVERVIEW */}
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
              {attendanceTrend.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 220, color: 'var(--text-muted)', fontSize: 13 }}>
                  No attendance records found.
                </div>
              ) : (
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
              )}
            </div>
          </div>

          {/* Row 2: Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {/* Pass vs Fail Pie */}
            <div className="card card-glow-blue">
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Global Pass/Fail Ratio</h3>
              {pieData.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 202, color: 'var(--text-muted)', fontSize: 13 }}>
                  No performance data recorded.
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>

            {/* Target vs Reality */}
            <div className="card card-glow-yellow">
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Batch Performance Targets</h3>
              {batchPerformance.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 180, color: 'var(--text-muted)', fontSize: 13 }}>
                  No batch score averages recorded.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={batchPerformance} barGap={2}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10, boxShadow: 'var(--shadow-card)', color: 'var(--text-primary)' }} />
                    <Bar dataKey="reality" fill="var(--powder-blue)" radius={[4, 4, 0, 0]} name="Actual Score" />
                    <Bar dataKey="target" fill="var(--pale-orange)" radius={[4, 4, 0, 0]} name="Target Score" />
                  </BarChart>
                </ResponsiveContainer>
              )}
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
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <MorphLoader text="Loading activity..." size={32} />
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


      {/* --- ADD USER MODAL --- */}
      {showAddModal && createPortal(
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(10, 12, 18, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 9999, overflowY: 'auto', padding: '40px 20px'
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
                  <CustomSelect 
                    value={addRole}
                    onChange={setAddRole}
                    options={[
                      { value: 'TRAINER', label: 'Trainer' },
                      { value: 'COORDINATOR', label: 'Training Coordinator' },
                      { value: 'ADMIN', label: 'System Administrator' },
                      { value: 'TRAINEE', label: 'Trainee Candidate' },
                    ]}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>



              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ padding: '10px 20px' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ padding: '10px 20px' }}>Create User</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* --- EDIT USER MODAL --- */}
      {showEditModal && selectedUser && createPortal(
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(10, 12, 18, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 9999, overflowY: 'auto', padding: '40px 20px'
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
                <CustomSelect 
                  value={editRole}
                  onChange={setEditRole}
                  options={[
                    { value: 'TRAINER', label: 'Trainer' },
                    { value: 'COORDINATOR', label: 'Training Coordinator' },
                    { value: 'ADMIN', label: 'System Administrator' },
                    { value: 'TRAINEE', label: 'Trainee Candidate' },
                  ]}
                  style={{ width: '100%' }}
                />
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
        </div>,
        document.body
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {showDeleteModal && selectedUser && createPortal(
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(10, 12, 18, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 20
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
        </div>,
        document.body
      )}
    </div>
  );
}
