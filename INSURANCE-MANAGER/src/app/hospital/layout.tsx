'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function HospitalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Allow access to login and register pages without auth
      const isAuthPage = window.location.pathname.includes('/hospital/login') || 
                         window.location.pathname.includes('/hospital/register');
      
      if (!isAuthPage && !user) {
        router.push('/hospital/login');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <div className="hospital-layout">{children}</div>;
}