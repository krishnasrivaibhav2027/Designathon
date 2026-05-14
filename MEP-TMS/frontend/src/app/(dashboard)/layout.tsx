"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
        <Sidebar />
        <main className="flex-1 overflow-y-auto relative">
          {/* Subtle background blob */}
          <div className="fixed top-0 right-0 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
