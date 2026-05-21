import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'

// Pages
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DashboardPage from '@/pages/DashboardPage'
import BatchesPage from '@/pages/BatchesPage'
import AttendancePage from '@/pages/AttendancePage'
import AssessmentsPage from '@/pages/AssessmentsPage'
import FeedbackPage from '@/pages/FeedbackPage'
import ReportsPage from '@/pages/ReportsPage'
import UsersPage from '@/pages/UsersPage'
import LeaderboardPage from '@/pages/LeaderboardPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import ChatPage from '@/pages/ChatPage'

function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      
      {/* Dashboard routes — wrapped in DashboardLayout with sidebar + protected route */}
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/batches" element={<BatchesPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/assessments" element={<AssessmentsPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Route>
    </Routes>
  );
}

export default App
