import { useAuth } from '@/context/AuthContext';
import AdminDashboard from './dashboards/AdminDashboard';
import CoordinatorDashboard from './dashboards/CoordinatorDashboard';
import TrainerDashboard from './dashboards/TrainerDashboard';
import TraineeDashboard from './dashboards/TraineeDashboard';
import MorphLoader from '@/components/MorphLoader';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <MorphLoader minHeight="60vh" text="Loading dashboard..." />;
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
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Welcome, {user.fullName}!</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>We are preparing your dashboard experience.</p>
        </div>
      );
  }
}
