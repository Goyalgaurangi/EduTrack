import { Link } from 'wouter';
import { useGetStudentDashboard, getGetStudentDashboardQueryKey, useGetQuoteOfTheDay } from '@workspace/api-client-react';
import { AlertTriangle, ArrowRight, BookOpenCheck, CalendarCheck2, ClipboardList, FileText, Sparkles } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { usePortal } from '@/App';
import { EmptyPanel, ErrorPanel, LoadingPanel, Metric, PageHeading, SectionHeading } from '@/components/page-parts';
import { getAcademicTerm } from '@/lib/academic-term';

export function StudentDashboardPage() {
  const { selectedStudentId, studentsLoading, students } = usePortal();
  const quoteQuery = useGetQuoteOfTheDay();
  const dashboardQuery = useGetStudentDashboard(selectedStudentId ?? 0, {
    query: {
      enabled: selectedStudentId !== null,
      queryKey: getGetStudentDashboardQueryKey(selectedStudentId ?? 0),
    },
  });
  const dashboard = dashboardQuery.data;
  const academicTerm = getAcademicTerm();
  const attendanceRecorded = dashboard?.attendance.some((course) => course.total > 0) ?? false;
  const gradedCourses = dashboard?.marks.filter((course) => course.midterm !== null || course.final !== null) ?? [];
  const attentionNeeded = dashboard?.attendance.filter((course) => course.total > 0 && course.percentage < 75) ?? [];

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="STUDENT RECORD · PROGRESS"
        title={dashboard ? `${dashboard.student.name.split(' ')[0]}’s semester.` : 'A semester in view.'}
        description={dashboard ? `${dashboard.student.className || 'Student'} · Roll ${dashboard.student.rollNumber}` : 'Attendance and results together, always up to date.'}
        action={dashboard && <Link className="button button-primary" href={`/report/${dashboard.student.id}`} data-testid="link-open-report"><FileText size={16} /> Report card</Link>}
      />
      {studentsLoading && <LoadingPanel label="Loading student selection" />}
      {!studentsLoading && students.length === 0 && <EmptyPanel title="No student records yet" description="An administrator can add students to begin the shared academic register." />}
      {dashboardQuery.isLoading && selectedStudentId !== null && <LoadingPanel label="Gathering attendance and marks" />}
      {dashboardQuery.isError && <ErrorPanel label="This student’s academic summary could not be loaded." onRetry={() => dashboardQuery.refetch()} />}
      {dashboard && (
        <>
          <div className="student-welcome dashboard-welcome">
            <div><span className="ribbon-index">ACADEMIC SUMMARY / {academicTerm.shortAcademicYear}</span><h2>Progress in one picture.</h2><p>Every saved mark and class meeting contributes to this view.</p></div>
            <div className="student-profile-stamp"><span>{dashboard.student.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><small>{dashboard.student.rollNumber}</small></div>
            <div className="student-welcome-decoration">ET <span>STUDENT RECORD</span></div>
          </div>
          <div className="metric-grid three-metrics">
            <Metric label="Average marks" value={dashboard.averagePercentage.toFixed(1)} suffix="%" detail="Across recorded course results" icon={<BookOpenCheck size={16} />} />
            <Metric label="Overall attendance" value={attendanceRecorded ? dashboard.overallAttendance.toFixed(1) : '—'} suffix={attendanceRecorded ? '%' : ''} detail={!attendanceRecorded ? 'No attendance recorded yet' : attentionNeeded.length ? `${attentionNeeded.length} course${attentionNeeded.length === 1 ? '' : 's'} need attention` : 'Attendance is steady'} tone={!attendanceRecorded ? undefined : dashboard.overallAttendance < 75 ? 'coral' : 'sage'} icon={<CalendarCheck2 size={16} />} />
            <Metric label="Courses" value={dashboard.attendance.length} detail="Courses on the register" tone="amber" icon={<ClipboardList size={16} />} />
          </div>
          <div className="student-dashboard-grid">
            <section className="panel course-attendance-panel">
              <SectionHeading title="Attendance by course" detail="Recovery estimate helps you plan the way back." />
              {dashboard.attendance.length === 0 ? <EmptyPanel title="No attendance recorded yet" description="Course attendance will appear as faculty save each register." /> : (
                <div className="attendance-course-list">
                  {dashboard.attendance.map((course) => (
                    <div className="attendance-course-row" key={course.courseId} data-testid={`attendance-course-${course.courseId}`}>
                      <div className="course-progress-copy"><strong>{course.courseName}</strong><span>{course.total > 0 ? `${course.present} of ${course.total} classes attended` : 'No attendance recorded yet'}</span>{course.total > 0 && course.percentage < 75 && <span className="low-attendance-badge"><AlertTriangle size={11} /> Low Attendance</span>}</div>
                      <div className={`course-progress-track ${course.total === 0 ? 'no-data' : course.percentage >= 85 ? 'above-target' : course.percentage >= 75 ? 'watch-target' : 'below-target'}`}><span style={{ width: `${Math.max(0, Math.min(100, course.percentage))}%` }} /></div>
                      <div className={`course-attendance-percent ${course.total === 0 ? 'no-data' : course.percentage >= 85 ? 'above-target' : course.percentage >= 75 ? 'watch-target' : 'below-target'}`}>{course.total > 0 ? <>{course.percentage.toFixed(1)}<small>%</small></> : '—'}</div>
                      <div className={`recovery-label ${course.classesToRecover > 0 ? 'needs-recovery' : ''}`}>{course.total === 0 ? 'No classes recorded yet' : course.classesToRecover > 0 ? <><strong>{course.classesToRecover}</strong> classes to recover</> : 'In good standing'}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="attendance-threshold"><span className="threshold-rule" />75% attendance is the campus follow-up threshold.</div>
            </section>
            <section className="panel student-marks-panel">
              <SectionHeading title="Course results" detail="Latest saved course totals." />
              {gradedCourses.length === 0 ? <EmptyPanel title="No marks saved yet" description="Your course results will show here as soon as they are recorded." /> : (
                <>
                  <div className="chart-box student-performance-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={gradedCourses} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e8e2d6" strokeDasharray="3 5" /><XAxis dataKey="courseName" tickLine={false} axisLine={false} tick={{ fill: '#797c79', fontSize: 10 }} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: '#96958f', fontSize: 10 }} /><Tooltip contentStyle={{ border: '1px solid #e2ddd1', borderRadius: 12, background: '#fffdf8' }} /><Bar dataKey="percentage" name="Percentage" fill="#337f69" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
                  <div className="marks-course-rows">
                    {gradedCourses.map((course) => <div className="marks-course-row" key={course.courseId}><div><strong>{course.courseName}</strong><span>{course.midterm === null ? 'Midterm pending' : `Midterm ${course.midterm}`}<i />{course.final === null ? 'Final pending' : `Final ${course.final}`}</span></div><strong className={`grade-letter grade-${course.grade.replace('+', 'plus')}`}>{course.grade}</strong></div>)}
                  </div>
                </>
              )}
              <Link className="panel-bottom-link" href={`/report/${dashboard.student.id}`}>Open printable report card <ArrowRight size={14} /></Link>
            </section>
          </div>
          <section className="quote-panel student-quote-panel" data-testid="card-quote-of-the-day">
            <div className="quote-heading"><Sparkles size={15} /> QUOTE OF THE DAY</div>
            {quoteQuery.isLoading ? (
              <div className="quote-skeleton"><i /><i /></div>
            ) : quoteQuery.isError ? (
              <p className="quote-copy">Today’s note isn’t available.</p>
            ) : (
              <p className="quote-copy">“{quoteQuery.data?.quote}”</p>
            )}
            {!quoteQuery.isError && <div className="quote-author">{quoteQuery.data?.author}</div>}
            <div className="quote-lines"><i /><i /><i /><i /><i /></div>
          </section>
          <div className={`attendance-guidance ${attentionNeeded.length ? 'guidance-warning' : ''}`}>
            <span className="guidance-icon">{attentionNeeded.length ? '!' : 'OK'}</span>
            <div><strong>{attentionNeeded.length ? 'A small attendance reset can help.' : 'You’re building a steady record.'}</strong><p>{attentionNeeded.length ? `Speak with faculty about ${attentionNeeded.map((course) => course.courseName).join(', ')} and plan for the estimated recovery classes.` : 'Keep this rhythm and your attendance record stays in good standing.'}</p></div>
            <Link href="/attendance" className="text-link">Attendance desk <ArrowRight size={14} /></Link>
          </div>
        </>
      )}
    </div>
  );
}
