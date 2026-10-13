import { type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Activity, BookOpenCheck, ChartNoAxesCombined, ClipboardCheck, GraduationCap, LayoutDashboard, Menu, School, UsersRound } from 'lucide-react';
import { useListCourses } from '@workspace/api-client-react';
import { usePortal } from '@/App';
import { getAcademicTerm } from '@/lib/academic-term';

const navigation = [
  { href: '/', label: 'Overview', icon: LayoutDashboard, section: 'Workspace' },
  { href: '/attendance', label: 'Attendance', icon: ClipboardCheck, section: 'Workspace' },
  { href: '/grades', label: 'Gradebook', icon: BookOpenCheck, section: 'Workspace' },
  { href: '/student-dashboard', label: 'Student view', icon: GraduationCap, section: 'People' },
  { href: '/admin', label: 'Administration', icon: ChartNoAxesCombined, section: 'People' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { role, setRole, students, selectedStudentId, setSelectedStudentId, studentsLoading } = usePortal();
  const coursesQuery = useListCourses();
  const courseCount = coursesQuery.data?.length ?? 0;
  const academicTerm = getAcademicTerm();

  return (
    <div className="portal-frame">
      <aside className="sidebar">
        <Link href="/" className="brand-lockup" data-testid="link-brand-home">
          <span className="brand-symbol"><School size={20} strokeWidth={1.8} /></span>
          <span className="brand-word">EduTrack<span className="brand-period">.</span></span>
        </Link>
        <div className="sidebar-caption">ACADEMIC WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <div className="nav-section-label">Workspace</div>
          {navigation.filter((item) => item.section === 'Workspace').map((item) => {
            const Icon = item.icon;
            const active = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={`nav-link ${active ? 'active' : ''}`} data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`}>
                <Icon size={17} strokeWidth={1.8} />
                <span>{item.label}</span>
                {item.href === '/attendance' && <span className="nav-pip" />}
              </Link>
            );
          })}
          <div className="nav-section-label people-label">People</div>
          {navigation.filter((item) => item.section === 'People').map((item) => {
            const Icon = item.icon;
            const active = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={`nav-link ${active ? 'active' : ''}`} data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`}>
                <Icon size={17} strokeWidth={1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="term-card">
            <div className="term-mark"><Activity size={16} /></div>
            <div>
              <span className="term-label">CURRENT TERM</span>
              <strong>{academicTerm.season} semester</strong>
              <span className="term-sub">{academicTerm.academicYear}</span>
            </div>
          </div>
          <div className="sidebar-profile">
            <div className="profile-avatar">ET</div>
            <div className="profile-copy">
              <strong>Campus workspace</strong>
              <span>Shared academic data</span>
            </div>
            <Menu size={16} className="profile-menu" />
          </div>
        </div>
      </aside>
      <main className="app-main">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-symbol"><School size={18} /></span>
            <span>EduTrack<span className="brand-period">.</span></span>
          </div>
          <div className="breadcrumb">
            <span>Campus</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{navigation.find((item) => item.href === location)?.label ?? (location.startsWith('/report') ? 'Report card' : 'Academic record')}</strong>
          </div>
          <div className="topbar-controls">
            <label className="selector-wrap role-selector">
              <span className="selector-label">VIEW AS</span>
              <select aria-label="Select role" value={role} onChange={(event) => setRole(event.target.value as 'Admin' | 'Faculty' | 'Student')} data-testid="select-role">
                <option>Admin</option>
                <option>Faculty</option>
                <option>Student</option>
              </select>
            </label>
            <span className="controls-divider" />
            {role === 'Student' && (
              <label className="selector-wrap student-selector">
                <span className="selector-label">STUDENT</span>
                <select
                  aria-label="Select student"
                  value={selectedStudentId ?? ''}
                  onChange={(event) => setSelectedStudentId(Number(event.target.value))}
                  disabled={studentsLoading || students.length === 0}
                  data-testid="select-student"
                >
                  {students.length === 0 && <option value="">No students yet</option>}
                  {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
                </select>
              </label>
            )}
            <div className="header-avatar" aria-label="Workspace account"><UsersRound size={16} /></div>
          </div>
        </header>
        <div className="page-canvas">
          {children}
        </div>
        <footer className="page-footer">
          <span>EduTrack <span className="footer-dot">/</span> One clear record, shared by everyone.</span>
          <span>{coursesQuery.isLoading ? 'Loading courses' : `${courseCount} courses in this workspace`}</span>
        </footer>
      </main>
    </div>
  );
}
