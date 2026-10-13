import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, CheckCheck, ChevronDown, CircleCheck, CircleX, ClipboardCheck, Save } from 'lucide-react';
import {
  getGetAdminOverviewQueryKey,
  getGetAttendanceRosterQueryKey,
  getGetStudentDashboardQueryKey,
  useGetAttendanceRoster,
  useListCourses,
  useListStudents,
  useSaveAttendance,
} from '@workspace/api-client-react';
import { EmptyPanel, ErrorPanel, LoadingPanel, PageHeading, SectionHeading } from '@/components/page-parts';

function todayString() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export function AttendancePage() {
  const queryClient = useQueryClient();
  const coursesQuery = useListCourses();
  const studentsQuery = useListStudents();
  const courses = coursesQuery.data ?? [];
  const [courseId, setCourseId] = useState<number | null>(null);
  const [date, setDate] = useState(todayString);
  const [presence, setPresence] = useState<Record<number, boolean>>({});
  const [notice, setNotice] = useState('');
  const chosenCourseId = courses.some((course) => course.id === courseId) ? courseId : courses[0]?.id ?? null;
  const params = { courseId: chosenCourseId ?? 0, date };
  const rosterQuery = useGetAttendanceRoster(params, {
    query: {
      enabled: chosenCourseId !== null,
      queryKey: getGetAttendanceRosterQueryKey(params),
    },
  });
  const saveAttendance = useSaveAttendance();
  const roster = rosterQuery.data;
  const students = roster?.students ?? [];
  const presentCount = students.filter((item) => presence[item.studentId] ?? item.present).length;
  const allPresent = students.length > 0 && presentCount === students.length;

  useEffect(() => {
    if (roster) {
      setPresence(Object.fromEntries(roster.students.map((item) => [item.studentId, item.present])));
    }
  }, [roster]);

  const togglePresence = (studentId: number, present: boolean) => {
    setPresence((previous) => ({ ...previous, [studentId]: present }));
    setNotice('');
  };

  const setEveryonePresent = () => {
    setPresence(Object.fromEntries(students.map((item) => [item.studentId, true])));
    setNotice('');
  };

  const save = () => {
    if (!roster) return;
    saveAttendance.mutate({
      data: {
        courseId: roster.courseId,
        date,
        records: roster.students.map((student) => ({
          studentId: student.studentId,
          present: presence[student.studentId] ?? student.present,
        })),
      },
    }, {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: getGetAttendanceRosterQueryKey(params) });
        queryClient.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() });
        studentsQuery.data?.forEach((student) => queryClient.invalidateQueries({ queryKey: getGetStudentDashboardQueryKey(student.id) }));
        setNotice(`${result.savedCount} attendance records saved for ${date}.`);
      },
      onError: () => setNotice('Attendance could not be saved. Your changes are still here to try again.'),
    });
  };

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="FACULTY DESK · ATTENDANCE"
        title="Mark the day, together."
        description="A paper-register routine, made clear and saved for everyone."
        action={<div className="attendance-count-chip"><span className="count-live" /> {students.length} students on roll</div>}
      />
      <section className="attendance-toolbar panel">
        <div className="toolbar-selects">
          <label className="field compact-field"><span>COURSE</span><div className="select-with-icon"><select value={chosenCourseId ?? ''} onChange={(event) => setCourseId(Number(event.target.value))} disabled={courses.length === 0} data-testid="select-attendance-course">{courses.length === 0 && <option value="">No courses</option>}{courses.map((course) => <option key={course.id} value={course.id}>{course.courseCode} — {course.name}</option>)}</select><ChevronDown size={15} /></div></label>
          <label className="field compact-field"><span>CLASS DATE</span><input type="date" value={date} onChange={(event) => { setDate(event.target.value); setNotice(''); }} data-testid="input-attendance-date" /></label>
        </div>
        <div className="toolbar-actions">
          <div className="attendance-stat"><strong>{presentCount}<small> / {students.length}</small></strong><span>present today</span></div>
          <button className="button button-soft" onClick={setEveryonePresent} disabled={students.length === 0 || allPresent} data-testid="button-mark-all-present"><CheckCheck size={16} /> Mark all present</button>
          <button className="button button-primary" onClick={save} disabled={!roster || saveAttendance.isPending || students.length === 0} data-testid="button-save-attendance"><Save size={16} /> {saveAttendance.isPending ? 'Saving…' : 'Save attendance'}</button>
        </div>
      </section>
      {notice && <div className={notice.startsWith('Attendance could') ? 'error-banner' : 'success-banner'} role="status" data-testid="status-attendance-save">{notice}</div>}
      {coursesQuery.isLoading && <LoadingPanel label="Loading course options" />}
      {coursesQuery.isError && <ErrorPanel label="Course options are unavailable." onRetry={() => coursesQuery.refetch()} />}
      {!coursesQuery.isLoading && !coursesQuery.isError && courses.length === 0 && <EmptyPanel title="No courses to take attendance for" description="Course assignments need to be added to the workspace first." />}
      {rosterQuery.isLoading && chosenCourseId !== null && <LoadingPanel label="Opening the class register" />}
      {rosterQuery.isError && <ErrorPanel label="The roster could not be opened for this course and date." onRetry={() => rosterQuery.refetch()} />}
      {roster && (
        <section className="panel roster-panel">
          <div className="roster-header">
            <div><div className="eyebrow">TODAY’S REGISTER</div><h2>{roster.courseName}</h2><p>{new Date(`${roster.date}T12:00:00`).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p></div>
            <div className={`attendance-progress ${presentCount === students.length && students.length ? 'is-complete' : ''}`}><span className="progress-ring"><CircleCheck size={19} /></span><strong>{students.length ? Math.round((presentCount / students.length) * 100) : 0}<small>%</small></strong><span>marked present</span></div>
          </div>
          {students.length === 0 ? <EmptyPanel title="This class has no students on its roster" description="Add student records to see them in the attendance register." /> : (
            <div className="attendance-table-wrap">
              <div className="table-heading attendance-table-heading"><span>STUDENT</span><span>ROLL NUMBER</span><span>ATTENDANCE</span></div>
              <div className="attendance-rows">
                {students.map((student, index) => {
                  const present = presence[student.studentId] ?? student.present;
                  return (
                    <div className={`attendance-row ${present ? '' : 'marked-absent'}`} key={student.studentId} data-testid={`row-attendance-${student.studentId}`}>
                      <div className="attendance-student"><span className={`student-avatar avatar-color-${index % 5}`}>{student.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><div><strong>{student.name}</strong><span className="mobile-roll">Roll {student.rollNumber}</span></div></div>
                      <span className="roll-number">{student.rollNumber}</span>
                      <div className="presence-controls" role="group" aria-label={`Attendance for ${student.name}`}>
                        <button type="button" className={`presence-button present-button ${present ? 'selected' : ''}`} onClick={() => togglePresence(student.studentId, true)} aria-pressed={present} data-testid={`button-present-${student.studentId}`}><Check size={14} /> Present</button>
                        <button type="button" className={`presence-button absent-button ${!present ? 'selected' : ''}`} onClick={() => togglePresence(student.studentId, false)} aria-pressed={!present} data-testid={`button-absent-${student.studentId}`}><CircleX size={14} /> Absent</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="roster-foot"><span><span className="count-live" /> Draft changes stay here until saved.</span><span>{students.length - presentCount} absent today</span></div>
            </div>
          )}
        </section>
      )}
      {!roster && !rosterQuery.isLoading && !rosterQuery.isError && chosenCourseId !== null && <div className="register-placeholder"><ClipboardCheck size={18} /> Choose a course and date to open its register.</div>}
      <div className="bottom-note"><span className="note-rule" />Attendance saved here is visible in student and administration views.</div>
    </div>
  );
}
