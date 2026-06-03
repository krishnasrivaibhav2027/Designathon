import { useAuth, UserRole } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import MorphLoader from '@/components/MorphLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate('/login');
      } else if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        navigate('/dashboard');
      } else {
        setIsAuthorized(true);
      }
    }
  }, [isAuthenticated, isLoading, user, navigate, allowedRoles]);

  if (isLoading || !isAuthorized) {
    return <MorphLoader fullPage />;
  }

  return <>{children}</>;
}
