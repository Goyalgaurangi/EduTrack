import { type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { AppShell } from '@/components/app-shell';
import { HomePage } from '@/pages/home';
import { AttendancePage } from '@/pages/attendance';
import { GradesPage } from '@/pages/grades';
import { ReportPage } from '@/pages/report';
import { StudentDashboardPage } from '@/pages/student-dashboard';
import { AdminPage } from '@/pages/admin';
import { useListStudents, type Student } from '@workspace/api-client-react';

export type UserRole = 'Admin' | 'Faculty' | 'Student';

type PortalContextValue = {
  role: UserRole;
  setRole: (role: UserRole) => void;
  selectedStudentId: number | null;
  setSelectedStudentId: (id: number) => void;
  students: Student[];
  studentsLoading: boolean;
  studentsError: boolean;
};

const PortalContext = createContext<PortalContextValue | null>(null);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function usePortal() {
  const value = useContext(PortalContext);
  if (!value) {
    throw new Error('usePortal must be used inside the portal shell.');
  }
  return value;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Portal() {
  const [storedRole, setStoredRole] = useState<UserRole>(() => {
    const stored = localStorage.getItem('edutrack-role');
    return stored === 'Faculty' || stored === 'Student' ? stored : 'Admin';
  });
  const [storedStudentId, setStoredStudentId] = useState<number | null>(() => {
    const stored = localStorage.getItem('edutrack-student-id');
    return stored ? Number(stored) : null;
  });
  const studentsQuery = useListStudents();
  const students = studentsQuery.data ?? [];
  const selectedStudentId = students.some((student) => student.id === storedStudentId)
    ? storedStudentId
    : students[0]?.id ?? null;
  useEffect(() => {
    if (selectedStudentId !== null) {
      localStorage.setItem('edutrack-student-id', String(selectedStudentId));
    }
  }, [selectedStudentId]);
  const context = useMemo<PortalContextValue>(() => ({
    role: storedRole,
    setRole: (role) => {
      localStorage.setItem('edutrack-role', role);
      setStoredRole(role);
    },
    selectedStudentId,
    setSelectedStudentId: (id) => {
      localStorage.setItem('edutrack-student-id', String(id));
      setStoredStudentId(id);
    },
    students,
    studentsLoading: studentsQuery.isLoading,
    studentsError: studentsQuery.isError,
  }), [storedRole, selectedStudentId, students, studentsQuery.isLoading, studentsQuery.isError]);

  return (
    <PortalContext.Provider value={context}>
      <AppShell>
        <RoutedErrorBoundary>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/attendance" component={AttendancePage} />
            <Route path="/grades" component={GradesPage} />
            <Route path="/report/:studentId" component={ReportPage} />
            <Route path="/student-dashboard" component={StudentDashboardPage} />
            <Route path="/admin" component={AdminPage} />
            <Route component={NotFound} />
          </Switch>
        </RoutedErrorBoundary>
      </AppShell>
    </PortalContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Portal />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
