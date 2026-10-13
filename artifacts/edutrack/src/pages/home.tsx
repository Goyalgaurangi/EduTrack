import { Link } from 'wouter';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, BookOpenCheck, CalendarDays, ClipboardCheck, GraduationCap, Sparkles } from 'lucide-react';
import { getGetStudentDashboardQueryKey, useGetAdminOverview, useGetQuoteOfTheDay, useGetStudentDashboard, useListCourses } from '@workspace/api-client-react';
import { usePortal } from '@/App';
import { EmptyPanel, ErrorPanel, LoadingPanel, Metric, PageHeading, SectionHeading } from '@/components/page-parts';
import { getAcademicTerm } from '@/lib/academic-term';

export function HomePage() {
  const { role, selectedStudentId, students } = usePortal();
  const coursesQuery = useListCourses();
  const quoteQuery = useGetQuoteOfTheDay();
  const adminQuery = useGetAdminOverview();
  const studentQuery = useGetStudentDashboard(selectedStudentId ?? 0, {
    query: {
      enabled: role === 'Student' && selectedStudentId !== null,
      queryKey: getGetStudentDashboardQueryKey(selectedStudentId ?? 0),
    },
  });
  const student = studentQuery.data;
  const academicTerm = getAcademicTerm();
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const greetingName = role === 'Student'
    ? student?.student.name.split(' ')[0] ?? 'student'
    : role === 'Faculty' ? 'faculty' : 'campus';
  const courseCount = coursesQuery.data?.length ?? 0;

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow={`GOOD TO SEE YOU · ${role.toUpperCase()} VIEW`}
        title={role === 'Student' ? `Your semester, ${greetingName}.` : `${timeGreeting}, ${greetingName}.`}
        description={role === 'Student' ? 'One place to keep an eye on the work you have put in.' : 'Your shared academic workspace is up to date.'}
        action={<span className="date-stamp"><CalendarDays size={15} /> {academicTerm.label}</span>}
      />
      {role === 'Admin' && (
        <>
          {adminQuery.isLoading && <LoadingPanel label="Gathering the latest campus pulse" />}
          {adminQuery.isError && <ErrorPanel onRetry={() => adminQuery.refetch()} />}
          {adminQuery.data && (
            <>
              <div className="overview-ribbon">
                <div className="ribbon-copy"><span className="ribbon-index">01 / CAMPUS PULSE</span><h2>Progress looks better<br />when it’s shared.</h2><p>Here’s the current shape of your academic community.</p></div>
                <div className="ribbon-stats">
                  <div><strong>{adminQuery.data.totalStudents}</strong><span>students</span></div>
                  <div><strong>{adminQuery.data.averageAttendance.toFixed(1)}<small>%</small></strong><span>attendance</span></div>
                  <div><strong>{adminQuery.data.atRiskStudents.length.toString().padStart(2, '0')}</strong><span>need attention</span></div>
                </div>
                <div className="ribbon-decoration"><span>ET</span><i /><i /><i /></div>
              </div>
              <div className="metric-grid three-metrics">
                <Metric label="Student records" value={adminQuery.data.totalStudents} detail="Enrolled across the campus" icon={<GraduationCap size={16} />} />
                <Metric label="Courses in session" value={adminQuery.data.totalCourses} detail="Shared with assigned faculty" tone="sage" icon={<BookOpenCheck size={16} />} />
                <Metric label="Average attendance" value={adminQuery.data.averageAttendance.toFixed(1)} suffix="%" detail={adminQuery.data.atRiskStudents.length ? `${adminQuery.data.atRiskStudents.length} students below 75%` : 'Everyone is above the follow-up mark'} tone={adminQuery.data.averageAttendance < 75 ? 'coral' : 'amber'} />
              </div>
              <div className="home-lower-grid">
                <section className="panel home-attendance-panel">
                  <SectionHeading title="Students needing a check-in" detail="The earliest signal is often the most useful." action={<Link className="text-link" href="/admin">Open overview <ArrowRight size={14} /></Link>} />
                  {adminQuery.data.atRiskStudents.length === 0 ? (
                    <div className="affirmation"><span className="affirmation-mark">OK</span><div><strong>Attendance is steady.</strong><p>No students currently sit below the 75% threshold.</p></div></div>
                  ) : (
                    <div className="compact-risk-list">
                      {adminQuery.data.atRiskStudents.slice(0, 3).map((item) => <Link key={item.studentId} className="compact-risk-row" href={`/report/${item.studentId}`}><span className="compact-initial">{item.name.slice(0, 1)}</span><span className="compact-name">{item.name}<small>Roll {item.rollNumber}</small></span><strong>{item.attendancePercentage.toFixed(1)}%</strong><ArrowRight size={14} /></Link>)}
                    </div>
                  )}
                  <Link className="panel-bottom-link" href="/admin">Review all campus signals <ArrowRight size={14} /></Link>
                </section>
                <aside className="quote-panel">
                  <div className="quote-heading"><Sparkles size={15} /> A THOUGHT FOR TODAY</div>
                  {quoteQuery.isLoading ? <div className="quote-skeleton"><i /><i /></div> : quoteQuery.isError ? <p className="quote-copy">Today’s note isn’t available.</p> : <p className="quote-copy">“{quoteQuery.data?.quote}”</p>}
                  {!quoteQuery.isError && <div className="quote-author">{quoteQuery.data?.author}</div>}
                  <div className="quote-lines"><i /><i /><i /><i /><i /></div>
                </aside>
              </div>
            </>
          )}
        </>
      )}
      {role === 'Faculty' && (
        <>
          <div className="faculty-banner">
            <div className="faculty-banner-copy"><span className="ribbon-index">FACULTY DESK / {academicTerm.label}</span><h2>Every mark made visible.</h2><p>Take attendance and keep course results moving in one shared record.</p><div className="faculty-quick-links"><Link className="button button-light" href="/attendance"><ClipboardCheck size={16} /> Take attendance</Link><Link className="button button-outline-light" href="/grades"><BookOpenCheck size={16} /> Enter grades</Link></div></div>
            <div className="faculty-tally"><strong>{courseCount.toString().padStart(2, '0')}</strong><span>courses<br />on the register</span><div className="faculty-orbit"><i /><i /><i /></div></div>
          </div>
          <div className="home-lower-grid faculty-lower">
            <section className="panel">
              <SectionHeading title="Course register" detail="Courses and faculty assigned this term." />
              {coursesQuery.isLoading && <LoadingPanel label="Loading course register" />}
              {coursesQuery.isError && <ErrorPanel onRetry={() => coursesQuery.refetch()} />}
              {coursesQuery.data?.length === 0 && <EmptyPanel title="No courses assigned yet" description="Course assignments will appear in this shared register." />}
              {coursesQuery.data && coursesQuery.data.length > 0 && <div className="course-list">{coursesQuery.data.map((course, index) => <div className="course-row" key={course.id}><span className={`course-index course-tone-${index % 4}`}>{String(index + 1).padStart(2, '0')}</span><div className="course-details"><strong>{course.name}</strong><span>{course.courseCode} <i /> {course.facultyName}</span></div><Link className="course-arrow" href="/attendance" aria-label={`Take attendance for ${course.name}`}><ArrowRight size={17} /></Link></div>)}</div>}
            </section>
            <section className="faculty-note">
              <div className="faculty-note-mark">RECORD<br />IT ONCE</div>
              <p>Attendance and marks saved here are visible to the student and administration right away.</p>
              <Link className="text-link" href="/grades">Open gradebook <ArrowRight size={14} /></Link>
            </section>
          </div>
        </>
      )}
      {role === 'Student' && (
        <>
          {students.length === 0 && <EmptyPanel title="Your student record is not ready" description="Ask an administrator to add a student record to this workspace." />}
          {studentQuery.isLoading && <LoadingPanel label="Loading your academic summary" />}
          {studentQuery.isError && <ErrorPanel onRetry={() => studentQuery.refetch()} />}
          {student && (
            <>
              <div className="student-welcome">
                <div><span className="ribbon-index">STUDENT VIEW · {student.student.className || 'CURRENT COHORT'}</span><h2>Your work adds up.</h2><p>Course progress, attendance, and marks — all in the same place.</p></div>
                <Link className="button button-light" href={`/report/${student.student.id}`}>View report card <ArrowRight size={16} /></Link>
                <div className="student-welcome-decoration">ET <span>STUDENT RECORD</span></div>
              </div>
              <div className="metric-grid three-metrics">
                <Metric label="Average marks" value={student.averagePercentage.toFixed(1)} suffix="%" detail="Across courses with grades" icon={<BookOpenCheck size={16} />} />
                <Metric label="Overall attendance" value={student.overallAttendance.toFixed(1)} suffix="%" detail="Your attendance to date" tone={student.overallAttendance < 75 ? 'coral' : 'sage'} icon={<ClipboardCheck size={16} />} />
                <Metric label="Courses" value={student.marks.length} detail="Progress reports available" tone="amber" />
              </div>
              <div className="home-lower-grid student-lower">
                <section className="panel">
                  <SectionHeading title="Your course marks" detail="A glance at results recorded so far." action={<Link className="text-link" href="/student-dashboard">Details <ArrowRight size={14} /></Link>} />
                  {student.marks.length === 0 ? <EmptyPanel title="Results are on their way" description="As faculty save marks, your progress will appear here." /> : <div className="chart-box mini-marks-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={student.marks} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e8e2d6" strokeDasharray="3 5" /><XAxis dataKey="courseName" tickLine={false} axisLine={false} tick={{ fill: '#797c79', fontSize: 10 }} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: '#96958f', fontSize: 10 }} /><Tooltip contentStyle={{ border: '1px solid #e2ddd1', borderRadius: 12, background: '#fffdf8' }} /><Bar dataKey="percentage" name="Percentage" fill="#4b8b72" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>}
                </section>
                <section className="attendance-snapshot">
                  <div className="snapshot-topline"><span>ATTENDANCE NOTE</span><span className={student.overallAttendance < 75 ? 'status-risk' : 'status-good'}>{student.overallAttendance < 75 ? 'FOLLOW UP' : 'ON TRACK'}</span></div>
                  <div className="snapshot-number">{student.overallAttendance.toFixed(1)}<small>%</small></div>
                  <p>{student.overallAttendance < 75 ? 'A few more classes now can bring your overall attendance back in range.' : 'You’re keeping a consistent rhythm. Keep showing up.'}</p>
                  <Link className="text-link" href="/student-dashboard">See attendance detail <ArrowRight size={14} /></Link>
                </section>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
