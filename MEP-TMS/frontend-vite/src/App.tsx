import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useEffect } from 'react'
import MorphLoader from '@/components/MorphLoader'

// Pages
import LoginPage from '@/pages/LoginPage'
import TraineeLoginPage from '@/pages/TraineeLoginPage'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DashboardPage from '@/pages/DashboardPage'
import BatchesPage from '@/pages/BatchesPage'
import AttendancePage from '@/pages/AttendancePage'
import AssessmentsPage from '@/pages/AssessmentsPage'
import FeedbackPage from '@/pages/FeedbackPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import ReportsPage from '@/pages/ReportsPage'
import UsersPage from '@/pages/UsersPage'
import LeaderboardPage from '@/pages/LeaderboardPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import ChatPage from '@/pages/ChatPage'
import AssistantChatPage from '@/pages/AssistantChatPage'
import SettingsPage from '@/pages/SettingsPage'
import SettingsDiagnosticsPage from '@/pages/SettingsDiagnosticsPage'
import MyAgentsPage from '@/pages/MyAgentsPage'
import MyTrainingsPage from '@/pages/MyTrainingsPage'
import OnboardingPage from '@/pages/OnboardingPage'
import FeedbackFormPage from '@/pages/FeedbackFormPage'
import FeedbackSubmitPage from '@/pages/FeedbackSubmitPage'

function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <MorphLoader fullPage text="Loading Maverick One..." />;
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

function App() {
  useEffect(() => {
    try {
      const theme = localStorage.getItem('mep-theme') || 'dark';
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    } catch {}
  }, []);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage initialFlipped={false} />} />
      <Route path="/signup" element={<Navigate to="/login" replace />} />
      <Route path="/trainee-login" element={<Navigate to="/login" replace />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/feedback/submit" element={<FeedbackSubmitPage />} />
      
      {/* Dashboard routes — wrapped in DashboardLayout with sidebar + protected route */}
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/batches" element={<BatchesPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/assessments" element={<AssessmentsPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/feedback/form" element={<FeedbackFormPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/assistant-chat" element={<AssistantChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings-diagnostics" element={<SettingsDiagnosticsPage />} />
        <Route path="/my-agents" element={<MyAgentsPage />} />
        <Route path="/my-trainings" element={<MyTrainingsPage />} />
      </Route>
    </Routes>
  );
}

export default App
