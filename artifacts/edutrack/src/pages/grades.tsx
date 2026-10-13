import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BookOpenCheck, ChevronDown, Save } from 'lucide-react';
import {
  getGetAdminOverviewQueryKey,
  getGetGradeRosterQueryKey,
  getGetReportCardQueryKey,
  getGetStudentDashboardQueryKey,
  useGetGradeRoster,
  useListCourses,
  useListStudents,
  useSaveGrades,
} from '@workspace/api-client-react';
import { EmptyPanel, ErrorPanel, LoadingPanel, PageHeading, SectionHeading } from '@/components/page-parts';

type ExamName = 'Midterm' | 'Final';

export function GradesPage() {
  const queryClient = useQueryClient();
  const coursesQuery = useListCourses();
  const studentsQuery = useListStudents();
  const courses = coursesQuery.data ?? [];
  const allStudents = studentsQuery.data ?? [];
  const [courseId, setCourseId] = useState<number | null>(null);
  const [exam, setExam] = useState<ExamName>('Midterm');
  const [marksByStudent, setMarksByStudent] = useState<Record<number, string>>({});
  const [notice, setNotice] = useState('');
  const chosenCourseId = courses.some((course) => course.id === courseId) ? courseId : courses[0]?.id ?? null;
  const params = { courseId: chosenCourseId ?? 0, exam };
  const rosterQuery = useGetGradeRoster(params, {
    query: {
      enabled: chosenCourseId !== null,
      queryKey: getGetGradeRosterQueryKey(params),
    },
  });
  const saveGrades = useSaveGrades();
  const roster = rosterQuery.data;
  const entries = roster?.students ?? [];
  const enteredCount = entries.filter((student) => {
    const value = marksByStudent[student.studentId];
    return value !== undefined ? value !== '' : student.marks !== null;
  }).length;
  const average = useMemo(() => {
    const values = entries.map((student) => marksByStudent[student.studentId] !== undefined
      ? Number(marksByStudent[student.studentId])
      : student.marks).filter((value): value is number => value !== null && Number.isFinite(value));
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }, [entries, marksByStudent]);

  useEffect(() => {
    if (roster) {
      setMarksByStudent(Object.fromEntries(roster.students.map((student) => [student.studentId, student.marks === null ? '' : String(student.marks)])));
    }
  }, [roster]);

  const save = () => {
    if (!roster) return;
    const records = entries.flatMap((student) => {
      const rawValue = marksByStudent[student.studentId] ?? '';
      if (rawValue === '') return [];
      return [{ studentId: student.studentId, marks: Number(rawValue) }];
    });
    if (!records.length) {
      setNotice('Enter at least one mark before saving this exam.');
      return;
    }
    saveGrades.mutate({
      data: {
        courseId: roster.courseId,
        exam,
        records,
      },
    }, {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: getGetGradeRosterQueryKey(params) });
        queryClient.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() });
        allStudents.forEach((student) => {
          queryClient.invalidateQueries({ queryKey: getGetReportCardQueryKey(student.id) });
          queryClient.invalidateQueries({ queryKey: getGetStudentDashboardQueryKey(student.id) });
        });
        setNotice(`${result.savedCount} ${exam.toLowerCase()} marks saved. Students and administrators can now see the update.`);
      },
      onError: () => setNotice('Marks could not be saved. Your entries are still here to try again.'),
    });
  };

  const chartData = entries.filter((student) => student.marks !== null).map((student) => ({
    name: student.name.split(' ')[0],
    marks: student.marks,
  }));

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="FACULTY DESK · GRADEBOOK"
        title="Make progress count."
        description="Record exam marks once. They flow into the shared report card."
        action={<div className="gradebook-mark"><BookOpenCheck size={17} /><span>GRADEBOOK<br /><strong>LIVE RECORDS</strong></span></div>}
      />
      <section className="grades-toolbar panel">
        <div className="toolbar-selects">
          <label className="field compact-field"><span>COURSE</span><div className="select-with-icon"><select value={chosenCourseId ?? ''} onChange={(event) => setCourseId(Number(event.target.value))} disabled={courses.length === 0} data-testid="select-grade-course">{courses.length === 0 && <option value="">No courses</option>}{courses.map((course) => <option key={course.id} value={course.id}>{course.courseCode} — {course.name}</option>)}</select><ChevronDown size={15} /></div></label>
          <label className="field compact-field"><span>EXAM PERIOD</span><div className="exam-toggle" role="group" aria-label="Select exam period"><button type="button" className={exam === 'Midterm' ? 'selected' : ''} onClick={() => { setExam('Midterm'); setNotice(''); }} data-testid="button-exam-midterm">Midterm</button><button type="button" className={exam === 'Final' ? 'selected' : ''} onClick={() => { setExam('Final'); setNotice(''); }} data-testid="button-exam-final">Final</button></div></label>
        </div>
        <div className="toolbar-actions"><div className="attendance-stat"><strong>{enteredCount}<small> / {entries.length}</small></strong><span>marks entered</span></div><button className="button button-primary" onClick={save} disabled={!roster || saveGrades.isPending || enteredCount === 0} data-testid="button-save-grades"><Save size={16} /> {saveGrades.isPending ? 'Saving…' : `Save ${exam.toLowerCase()}`}</button></div>
      </section>
      {notice && <div className={notice.includes('could not') ? 'error-banner' : 'success-banner'} role="status" data-testid="status-grade-save">{notice}</div>}
      {coursesQuery.isLoading && <LoadingPanel label="Loading course options" />}
      {coursesQuery.isError && <ErrorPanel label="Course options are unavailable." onRetry={() => coursesQuery.refetch()} />}
      {!coursesQuery.isLoading && !coursesQuery.isError && courses.length === 0 && <EmptyPanel title="No course gradebooks are available" description="Assigned courses will appear here when they are set up." />}
      {rosterQuery.isLoading && chosenCourseId !== null && <LoadingPanel label="Opening the exam register" />}
      {rosterQuery.isError && <ErrorPanel label="Marks could not be loaded for this exam." onRetry={() => rosterQuery.refetch()} />}
      {roster && (
        <div className="grades-content">
          <section className="panel grade-entry-panel">
            <div className="grade-entry-top"><div><div className="eyebrow">{exam.toUpperCase()} RESULTS</div><h2>{roster.courseName}</h2><p>Marks out of 100 · Leave blank if not yet assessed.</p></div><div className="average-pill"><span>CLASS MEAN</span><strong>{average.toFixed(1)}<small>%</small></strong></div></div>
            {entries.length === 0 ? <EmptyPanel title="No students in this course" description="The grade register will populate once students are assigned." /> : (
              <div className="grade-table-wrap">
                <div className="table-heading grade-table-heading"><span>STUDENT</span><span>ROLL NUMBER</span><span>MARKS / 100</span></div>
                {entries.map((student, index) => (
                  <div className="grade-row" key={student.studentId} data-testid={`row-grade-${student.studentId}`}>
                    <div className="attendance-student"><span className={`student-avatar avatar-color-${index % 5}`}>{student.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><div><strong>{student.name}</strong><span className="mobile-roll">Roll {student.rollNumber}</span></div></div>
                    <span className="roll-number">{student.rollNumber}</span>
                    <label className="marks-input-wrap"><input aria-label={`${exam} marks for ${student.name}`} type="number" min="0" max="100" step="1" inputMode="numeric" value={marksByStudent[student.studentId] ?? ''} onChange={(event) => { setMarksByStudent((current) => ({ ...current, [student.studentId]: event.target.value })); setNotice(''); }} placeholder="—" data-testid={`input-grade-${student.studentId}`} /><span>/100</span></label>
                  </div>
                ))}
                <div className="grade-table-footer"><span>Marks entered are saved to the student’s academic record.</span><span>{entries.length - enteredCount} awaiting marks</span></div>
              </div>
            )}
          </section>
          <aside className="panel grade-distribution-card">
            <SectionHeading title="Marks at a glance" detail={`${exam} entries already saved`} />
            {chartData.length === 0 ? <div className="mini-empty-chart"><span className="mini-chart-lines" /><strong>No saved marks yet</strong><p>Class marks will take shape here as they’re saved.</p></div> : (
              <>
                <div className="grade-chart-stat"><strong>{chartData.length}</strong><span>marks saved</span></div>
                <div className="chart-box class-marks-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 4, left: -25, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e8e2d6" strokeDasharray="3 5" /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#797c79', fontSize: 10 }} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: '#96958f', fontSize: 10 }} /><Tooltip contentStyle={{ border: '1px solid #e2ddd1', borderRadius: 12, background: '#fffdf8' }} /><Bar dataKey="marks" name="Marks" fill="#337f69" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
                <div className="chart-caption">Each bar represents a student’s saved result.</div>
              </>
            )}
          </aside>
        </div>
      )}
      {!roster && !rosterQuery.isLoading && !rosterQuery.isError && chosenCourseId !== null && <div className="register-placeholder"><BookOpenCheck size={18} /> Choose a course and exam to open its mark register.</div>}
      <div className="bottom-note"><span className="note-rule" />Saved marks become visible to the student and administration right away.</div>
    </div>
  );
}
