import { useState, useEffect } from 'react';
import { 
  Settings, RefreshCw, Check, Eye, EyeOff, 
  Server, Activity, Database
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import MorphLoader from '@/components/MorphLoader';

export default function SettingsDiagnosticsPage() {
  const [activeTab, setActiveTab] = useState<'settings' | 'diagnostics'>('settings');

  // --- Settings State ---
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [topperPercentage, setTopperPercentage] = useState(10);
  const [attendanceCutoffTime, setAttendanceCutoffTime] = useState('10:00');
  const [absentAlertDays, setAbsentAlertDays] = useState(3);
  const [minBatchSizeLimit, setMinBatchSizeLimit] = useState(30);
  const [azureOpenaiApiKey, setAzureOpenaiApiKey] = useState('');
  const [azureOpenaiEndpoint, setAzureOpenaiEndpoint] = useState('');
  const [azureOpenaiDeployment, setAzureOpenaiDeployment] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // --- Diagnostics State ---
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);

  // Fetch Settings Function
  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await api.get('/users/system-settings/all');
      setTopperPercentage(res.data.topperPercentage);
      setAttendanceCutoffTime(res.data.attendanceCutoffTime);
      setAbsentAlertDays(res.data.absentAlertDays);
      setMinBatchSizeLimit(res.data.minBatchSizeLimit || 30);
      setAzureOpenaiApiKey(res.data.azureOpenaiApiKey || '');
      setAzureOpenaiEndpoint(res.data.azureOpenaiEndpoint || '');
      setAzureOpenaiDeployment(res.data.azureOpenaiDeployment || '');
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

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/users/system-settings/all', {
        topperPercentage: Number(topperPercentage),
        attendanceCutoffTime,
        absentAlertDays: Number(absentAlertDays),
        minBatchSizeLimit: Number(minBatchSizeLimit),
        azureOpenaiApiKey,
        azureOpenaiEndpoint,
        azureOpenaiDeployment
      });
      toast.success('System settings saved successfully');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to save settings');
    }
  };

  // Initialize both datasets on mount
  useEffect(() => {
    fetchSettings();
    fetchDiagnostics();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
      {/* Title Header */}
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>
          Platform Governance & Diagnostics
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          System-level settings, database integrity audits, and API connection metrics.
        </p>
      </div>

      {/* Tabs Row (Matches SettingsPage.tsx Design) */}
      <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            background: activeTab === 'settings' ? 'var(--powder-blue-glow)' : 'transparent',
            color: activeTab === 'settings' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: activeTab === 'settings' ? '1px solid var(--powder-blue)' : '1px solid transparent',
            padding: '10px 20px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s'
          }}
        >
          <Settings size={16} />
          System Settings
        </button>

        <button
          onClick={() => setActiveTab('diagnostics')}
          style={{
            background: activeTab === 'diagnostics' ? 'var(--powder-blue-glow)' : 'transparent',
            color: activeTab === 'diagnostics' ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: activeTab === 'diagnostics' ? '1px solid var(--powder-blue)' : '1px solid transparent',
            padding: '10px 20px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s'
          }}
        >
          <Activity size={16} />
          System Diagnostics
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'settings' && (
        <div style={{ maxWidth: '720px' }} className="fade-in">
          {/* Governance & System Settings Form */}
          <div className="card card-glow-blue" style={{ padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
              <Settings size={22} color="var(--powder-blue)" />
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>System Settings & Thresholds</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Configure global criteria and scheduler cutoff intervals</p>
              </div>
            </div>

            {settingsLoading ? (
              <MorphLoader minHeight="auto" text="Loading configurations..." />
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
                      style={{ flex: 1, accentColor: 'var(--powder-blue)', cursor: 'pointer' }}
                    />
                    <span style={{
                      width: 50, textAlign: 'center', padding: '6px 10px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)',
                      fontSize: 13, fontWeight: 700, color: 'var(--powder-blue)'
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
                    style={{ width: '100%', maxWidth: 200, padding: 12, borderRadius: 12, fontSize: 14 }}
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
                    style={{ width: '100%', maxWidth: 200, padding: 12, borderRadius: 12, fontSize: 14 }}
                    required
                  />
                  <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 6 }}>
                    Trigger an automated coordinator warning if a candidate is consecutively absent for this many days.
                  </p>
                </div>

                {/* Minimum Batch Size Threshold */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                    Batch Size Limit Threshold (Minimum Trainees)
                  </label>
                  <input 
                    type="number" 
                    min="1"
                    max="100"
                    value={minBatchSizeLimit}
                    onChange={(e) => setMinBatchSizeLimit(Number(e.target.value))}
                    className="glass-input"
                    style={{ width: '100%', maxWidth: 200, padding: 12, borderRadius: 12, fontSize: 14 }}
                    required
                  />
                  <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 6 }}>
                    Defines the platform-wide minimum trainees required to form or create a cohort (defaults to 30).
                  </p>
                </div>

                {/* Azure OpenAI Key */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                    Azure OpenAI API Key
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="Enter Azure OpenAI API Key"
                      value={azureOpenaiApiKey}
                      onChange={(e) => setAzureOpenaiApiKey(e.target.value)}
                      className="glass-input"
                      style={{ width: '100%', padding: '12px 42px 12px 12px', borderRadius: 12, fontSize: 14 }}
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
                </div>

                {/* Azure OpenAI Endpoint */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                    Azure OpenAI Endpoint
                  </label>
                  <input 
                    type="text"
                    placeholder="Enter Azure OpenAI Endpoint (e.g. https://...)"
                    value={azureOpenaiEndpoint}
                    onChange={(e) => setAzureOpenaiEndpoint(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 14 }}
                  />
                </div>

                {/* Azure OpenAI Deployment */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                    Azure OpenAI Deployment Name
                  </label>
                  <input 
                    type="text"
                    placeholder="Enter Azure OpenAI Deployment Name (e.g. gpt-5.4-mini)"
                    value={azureOpenaiDeployment}
                    onChange={(e) => setAzureOpenaiDeployment(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 14 }}
                  />
                  <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 6 }}>
                    Required for automated AI agents curriculum generation and candidate reports generation.
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: 20, marginTop: 8 }}>
                  <button 
                    type="submit" 
                    className="btn-primary" 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8, 
                      padding: '10px 24px',
                      background: 'linear-gradient(135deg, var(--powder-blue) 0%, #47a0ff 100%)',
                      color: '#121824',
                      border: 'none',
                      boxShadow: '0 4px 15px var(--powder-blue-glow)',
                      transition: 'all 0.25s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.filter = 'brightness(1.08)';
                      e.currentTarget.style.boxShadow = '0 6px 20px var(--powder-blue-glow), 0 0 10px rgba(112, 214, 255, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.filter = 'none';
                      e.currentTarget.style.boxShadow = '0 4px 15px var(--powder-blue-glow)';
                    }}
                  >
                    <Check size={16} /> Save Settings
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {activeTab === 'diagnostics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
          {/* Header Action Row */}
          <div className="card card-glow-yellow" style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Integrity diagnostics</h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>Connection latency and table row inspection</p>
            </div>
            <button 
              onClick={fetchDiagnostics} 
              disabled={diagnosticsLoading}
              className="btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 12.5 }}
            >
              <RefreshCw size={14} className={diagnosticsLoading ? 'animate-spin' : ''} /> Run Scan
            </button>
          </div>

          {diagnosticsLoading || !diagnosticsData ? (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: 16 }}>
              <MorphLoader text="Scanning environment metrics..." />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'start' }}>
              
              {/* Latency & Integrity */}
              <div className="card card-glow-blue" style={{ padding: 20, height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <Activity size={18} color="var(--powder-blue)" />
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Connection Health</h4>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ padding: 14, background: 'var(--bg-main)', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Supabase Database</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {diagnosticsData.databaseHealthy ? (
                        <>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#10b981' }}>Connected</span>
                        </>
                      ) : (
                        <>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#ef4444' }}>Disconnected</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ padding: 14, background: 'var(--bg-main)', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>API Latency (Ping)</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--powder-blue)' }}>
                      {diagnosticsData.apiLatency}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rows Count */}
              <div className="card card-glow-yellow" style={{ padding: 24, height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <Database size={18} color="var(--yellow)" />
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Database Row Inspector</h4>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {Object.entries(diagnosticsData.tableCounts).map(([tableName, count]: [string, any]) => (
                    <div key={tableName}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                        <span style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>{tableName}</span>
                        <span style={{ color: 'var(--yellow)' }}>{count} rows</span>
                      </div>
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

              {/* Diagnostic Environment */}
              <div className="card card-glow-orange" style={{ padding: 24, height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <Server size={18} color="var(--pale-orange)" />
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Diagnostic Environment</h4>
                </div>
                
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
    </div>
  );
}
