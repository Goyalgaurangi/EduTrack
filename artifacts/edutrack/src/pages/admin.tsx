import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowDownRight, ArrowUpRight, GraduationCap, Plus, UserRoundPlus, UsersRound } from 'lucide-react';
import { getGetAdminOverviewQueryKey, getListStudentsQueryKey, useAddStudent, useGetAdminOverview } from '@workspace/api-client-react';
import { usePortal } from '@/App';
import { EmptyPanel, ErrorPanel, LoadingPanel, Metric, PageHeading, SectionHeading } from '@/components/page-parts';

const gradeColors: Record<string, string> = {
  'A+': '#337f69',
  A: '#72a98d',
  B: '#dfb56a',
  C: '#dd896e',
  F: '#b9534a',
};

export function AdminPage() {
  const queryClient = useQueryClient();
  const overviewQuery = useGetAdminOverview();
  const addStudent = useAddStudent();
  const { students } = usePortal();
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [className, setClassName] = useState('');
  const [formError, setFormError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const overview = overviewQuery.data;

  const submitStudent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setSavedMessage('');
    addStudent.mutate({
      data: {
        name: name.trim(),
        rollNumber: rollNumber.trim(),
        ...(className.trim() ? { className: className.trim() } : {}),
      },
    }, {
      onSuccess: (student) => {
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() });
        setName('');
        setRollNumber('');
        setClassName('');
        setShowStudentForm(false);
        setSavedMessage(`${student.name} was added to the student register.`);
      },
      onError: () => setFormError('We couldn’t save this student. Check the details and try again.'),
    });
  };

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="CAMPUS PULSE · ADMINISTRATION"
        title="A clear view of the whole class."
        description="A shared snapshot of enrolment, attendance, and academic standing."
        action={<button className="button button-primary" onClick={() => { setShowStudentForm((open) => !open); setFormError(''); }} data-testid="button-add-student"><Plus size={16} /> Add student</button>}
      />
      {savedMessage && <div className="success-banner" role="status" data-testid="status-student-added">{savedMessage}</div>}
      {showStudentForm && (
        <form className="student-form-panel" onSubmit={submitStudent}>
          <div className="form-panel-heading">
            <div className="form-icon"><UserRoundPlus size={18} /></div>
            <div><strong>New student record</strong><span>Use the student’s campus register details.</span></div>
            <button type="button" className="text-button" onClick={() => setShowStudentForm(false)}>Close</button>
          </div>
          <div className="form-grid">
            <label className="field"><span>Full name</span><input required minLength={1} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Leila Okafor" data-testid="input-student-name" /></label>
            <label className="field"><span>Roll number</span><input required minLength={1} value={rollNumber} onChange={(event) => setRollNumber(event.target.value)} placeholder="e.g. 24-108" data-testid="input-student-roll" /></label>
            <label className="field"><span>Class / cohort <em>optional</em></span><input value={className} onChange={(event) => setClassName(event.target.value)} placeholder="e.g. Year 2 · Arts" data-testid="input-student-class" /></label>
            <button className="button button-primary form-submit" type="submit" disabled={addStudent.isPending} data-testid="button-save-student">{addStudent.isPending ? 'Adding record…' : 'Save student'}</button>
          </div>
          {formError && <p className="form-error" role="alert">{formError}</p>}
        </form>
      )}
      {overviewQuery.isLoading && <LoadingPanel label="Gathering the campus overview" />}
      {overviewQuery.isError && <ErrorPanel onRetry={() => overviewQuery.refetch()} />}
      {overview && (
        <>
          <div className="metric-grid four-metrics">
            <Metric label="Students" value={overview.totalStudents} detail="Active student records" icon={<UsersRound size={16} />} />
            <Metric label="Courses" value={overview.totalCourses} detail="Across current cohorts" tone="sage" icon={<GraduationCap size={16} />} />
            <Metric label="Faculty" value={overview.totalFaculty} detail="Teaching this term" tone="amber" />
            <Metric label="Attendance" value={overview.averageAttendance.toFixed(1)} suffix="%" detail="Campus-wide average" tone={overview.averageAttendance < 75 ? 'coral' : 'sage'} icon={overview.averageAttendance < 75 ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />} />
          </div>
          <div className="admin-grid">
            <section className="panel risk-panel">
              <SectionHeading title="Students to check in with" detail="Attendance below the steady 75% mark." />
              {overview.atRiskStudents.length === 0 ? (
                <div className="small-empty"><span className="small-empty-mark">✓</span><strong>No students at risk</strong><p>Attendance is holding above the follow-up threshold.</p></div>
              ) : (
                <div className="risk-list">
                  {overview.atRiskStudents.map((student) => (
                    <div className="risk-row" key={student.studentId} data-testid={`row-risk-student-${student.studentId}`}>
                      <div className="student-avatar">{student.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
                      <div className="risk-identity"><strong>{student.name}</strong><span>Roll {student.rollNumber}</span></div>
                      <div className="risk-score"><strong>{student.attendancePercentage.toFixed(1)}%</strong><span>attendance</span></div>
                      <Link className="row-action" href={`/report/${student.studentId}`} aria-label={`Open report for ${student.name}`} data-testid={`link-risk-report-${student.studentId}`}>View</Link>
                    </div>
                  ))}
                </div>
              )}
              <div className="panel-footnote">Student records in workspace <strong>{students.length}</strong></div>
            </section>
            <section className="panel distribution-panel">
              <SectionHeading title="Grade distribution" detail="Course results, grouped by final grade." />
              {overview.gradeDistribution.length === 0 ? (
                <EmptyPanel title="Marks are still taking shape" description="Once faculty save grades, the distribution will appear here." />
              ) : (
                <>
                  <div className="chart-summary"><strong>{overview.gradeDistribution.reduce((total, item) => total + item.count, 0)}</strong><span>grade records in view</span></div>
                  <div className="chart-box grade-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip contentStyle={{ border: '1px solid #e2ddd1', borderRadius: 12, background: '#fffdf8' }} />
                        <Pie data={overview.gradeDistribution} dataKey="count" nameKey="grade" innerRadius={58} outerRadius={91} paddingAngle={3} stroke="none">
                          {overview.gradeDistribution.map((entry) => <Cell key={entry.grade} fill={gradeColors[entry.grade] ?? '#9eaa9e'} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grade-legend">
                    {overview.gradeDistribution.map((item) => <span key={item.grade}><i style={{ background: gradeColors[item.grade] ?? '#9eaa9e' }} />{item.grade}<b>{item.count}</b></span>)}
                  </div>
                </>
              )}
            </section>
          </div>
          <div className="bottom-note"><span className="note-rule" />Numbers reflect the latest saved attendance and grade records.</div>
        </>
      )}
    </div>
  );
}
