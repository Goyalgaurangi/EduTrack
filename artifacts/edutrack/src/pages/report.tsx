import { Link, useParams } from 'wouter';
import { useGetReportCard, getGetReportCardQueryKey } from '@workspace/api-client-react';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { EmptyPanel, ErrorPanel, LoadingPanel, PageHeading } from '@/components/page-parts';

export function ReportPage() {
  const params = useParams<{ studentId: string }>();
  const parsedStudentId = Number(params.studentId);
  const validId = Number.isInteger(parsedStudentId) && parsedStudentId > 0;
  const reportQuery = useGetReportCard(validId ? parsedStudentId : 0, {
    query: {
      enabled: validId,
      queryKey: getGetReportCardQueryKey(validId ? parsedStudentId : 0),
    },
  });
  const report = reportQuery.data;

  return (
    <div className="page-stack report-page">
      <PageHeading
        eyebrow="OFFICIAL ACADEMIC RECORD · 2024—25"
        title="Report card."
        description="A complete summary of course results and attendance."
        action={<button className="button button-primary print-action" onClick={() => window.print()} disabled={!report} data-testid="button-print-report"><Printer size={16} /> Print / save PDF</button>}
      />
      <div className="report-backline"><Link className="text-link" href="/student-dashboard"><ArrowLeft size={14} /> Back to student view</Link><span>Shared academic record <i /> Updated as marks are saved</span></div>
      {reportQuery.isLoading && validId && <LoadingPanel label="Preparing the report card" />}
      {reportQuery.isError && <ErrorPanel label="The report card could not be loaded for this student." onRetry={() => reportQuery.refetch()} />}
      {!validId && <EmptyPanel title="This student record is not available" description="The report link needs a valid student record." />}
      {report && (
        <article className="report-card" data-testid="report-card">
          <div className="report-card-header">
            <div className="report-mark"><span className="brand-symbol"><span>ET</span></span><span><strong>EduTrack</strong><small>SHARED ACADEMIC WORKSPACE</small></span></div>
            <div className="report-period"><span>ACADEMIC SESSION</span><strong>2024 — 2025</strong><small>OFFICIAL REPORT CARD</small></div>
            <div className="report-seal">ET<span>ACADEMIC<br />RECORD</span></div>
          </div>
          <div className="report-student-block">
            <div><span className="eyebrow">STUDENT</span><h2>{report.student.name}</h2><p>{report.student.className || 'Class not specified'} <i /> Roll no. {report.student.rollNumber}</p></div>
            <div className="report-student-status"><span>RECORD STATUS</span><strong>{report.courses.length ? 'COMPLETE' : 'IN PROGRESS'}</strong></div>
          </div>
          {report.courses.length === 0 ? <EmptyPanel title="Course results are not recorded yet" description="Once marks are saved, this report card will fill in automatically." /> : (
            <>
              <div className="report-table-wrap">
                <table className="report-table">
                  <thead><tr><th>COURSE</th><th>MIDTERM</th><th>FINAL</th><th>TOTAL</th><th>RESULT</th><th>GRADE</th></tr></thead>
                  <tbody>
                    {report.courses.map((course) => <tr key={course.courseId} data-testid={`row-report-course-${course.courseId}`}><th><strong>{course.courseName}</strong><span>Course record {course.courseId}</span></th><td>{course.midterm === null ? '—' : course.midterm}</td><td>{course.final === null ? '—' : course.final}</td><td><strong>{course.total}</strong><small> / 200</small></td><td><span className={`result-tag ${course.result === 'Pass' ? 'result-pass' : 'result-fail'}`}>{course.result}</span></td><td><span className={`report-grade grade-${course.grade.replace('+', 'plus')}`}>{course.grade}</span></td></tr>)}
                  </tbody>
                </table>
              </div>
              <div className="report-summary-grid">
                <div className="report-summary-score"><span>AVERAGE PERCENTAGE</span><strong>{report.averagePercentage.toFixed(1)}<small>%</small></strong><i><b style={{ width: `${Math.max(0, Math.min(100, report.averagePercentage))}%` }} /></i></div>
                <div><span>CGPA</span><strong>{report.cgpa.toFixed(2)}<small> / 10</small></strong></div>
                <div><span>OVERALL ATTENDANCE</span><strong>{report.overallAttendance.toFixed(1)}<small>%</small></strong></div>
              </div>
            </>
          )}
          <div className="report-card-footer">
            <div><span className="signature-line" /><span>Academic office</span></div>
            <div className="report-footer-copy">This report reflects the latest records saved<br />in the shared EduTrack workspace.</div>
            <div><span className="signature-line" /><span>Faculty review</span></div>
          </div>
        </article>
      )}
      {report && <div className="report-bottom-actions"><span>For a portable copy, select <strong>Save as PDF</strong> in your print dialog.</span><button className="button button-soft print-secondary" onClick={() => window.print()} data-testid="button-save-report"><Download size={15} /> Print or save</button></div>}
    </div>
  );
}
