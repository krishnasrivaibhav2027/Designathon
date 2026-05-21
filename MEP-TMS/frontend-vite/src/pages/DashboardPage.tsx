import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

import AdminDashboard from './dashboards/AdminDashboard';
import CoordinatorDashboard from './dashboards/CoordinatorDashboard';
import TrainerDashboard from './dashboards/TrainerDashboard';
import TraineeDashboard from './dashboards/TraineeDashboard';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '60vh' }}>
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <div>Please log in to view the dashboard.</div>;
  }

  // Render specific dashboard based on role
  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'COORDINATOR':
      return <CoordinatorDashboard />;
    case 'TRAINER':
      return <TrainerDashboard />;
    case 'TRAINEE':
      return <TraineeDashboard />;
    default:
      // Fallback in case of an unknown role, though ideally this shouldn't happen
      return (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, color: '#2d3436' }}>Welcome, {user.fullName}!</h2>
          <p style={{ color: '#636e72', marginTop: 8 }}>We are preparing your dashboard experience.</p>
        </div>
      );
  }
}
