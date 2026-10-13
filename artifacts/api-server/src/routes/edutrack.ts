import { and, asc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  AddStudentBody,
  AddStudentResponse,
  GetAttendanceRosterResponse,
  GetGradeRosterResponse,
  GetAdminOverviewResponse,
  GetAttendanceRosterQueryParams,
  GetGradeRosterQueryParams,
  GetQuoteOfTheDayResponse,
  GetReportCardParams,
  GetReportCardResponse,
  GetStudentDashboardParams,
  GetStudentDashboardResponse,
  ListStudentsResponse,
  ListCoursesResponse,
  SaveAttendanceBody,
  SaveAttendanceResponse,
  SaveGradesBody,
  SaveGradesResponse,
} from "@workspace/api-zod";
import {
  attendanceTable,
  coursesTable,
  db,
  facultyCoursesTable,
  facultyTable,
  gradesTable,
  studentsTable,
} from "@workspace/db";
import { ensureEduTrackSeeded } from "../lib/edutrack-seed";

const router: IRouter = Router();
const fallbackQuote = {
  quote: "The beautiful thing about learning is that no one can take it away from you.",
  author: "B.B. King",
};

let cachedQuote: { value: typeof fallbackQuote; date: string } | undefined;

function parseCalendarDate(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? date
    : value;
}

function gradeFor(percentage: number): "A+" | "A" | "B" | "C" | "F" {
  if (percentage >= 90) return "A+";
  if (percentage >= 75) return "A";
  if (percentage >= 60) return "B";
  if (percentage >= 40) return "C";
  return "F";
}

function percentage(present: number, total: number): number {
  return total === 0 ? 0 : Math.round((present / total) * 1000) / 10;
}

async function getCourseReports(studentId: number) {
  const courses = await db
    .select({ id: coursesTable.id, name: coursesTable.name })
    .from(coursesTable)
    .orderBy(asc(coursesTable.name));
  const grades = await db
    .select()
    .from(gradesTable)
    .where(eq(gradesTable.studentId, studentId));
  const gradeMap = new Map(
    grades.map((grade) => [`${grade.courseId}:${grade.exam}`, grade.marks]),
  );

  return courses.map((course) => {
    const midterm = gradeMap.get(`${course.id}:Midterm`) ?? null;
    const final = gradeMap.get(`${course.id}:Final`) ?? null;
    const enteredMarks = [midterm, final].filter(
      (mark): mark is number => mark !== null,
    );
    const total = enteredMarks.reduce((sum, mark) => sum + mark, 0);
    const coursePercentage =
      enteredMarks.length === 0 ? 0 : Math.round((total / enteredMarks.length) * 10) / 10;
    const grade = gradeFor(coursePercentage);

    return {
      courseId: course.id,
      courseName: course.name,
      midterm,
      final,
      total,
      percentage: coursePercentage,
      grade,
      result: coursePercentage >= 40 ? "Pass" as const : "Fail" as const,
    };
  });
}

async function getStudentAttendance(studentId: number) {
  const attendanceRows = await db
    .select({
      courseId: attendanceTable.courseId,
      courseName: coursesTable.name,
      present: attendanceTable.present,
    })
    .from(attendanceTable)
    .innerJoin(coursesTable, eq(coursesTable.id, attendanceTable.courseId))
    .where(eq(attendanceTable.studentId, studentId));
  const attendanceByCourse = new Map<
    number,
    { courseName: string; present: number; total: number }
  >();

  for (const row of attendanceRows) {
    const current = attendanceByCourse.get(row.courseId) ?? {
      courseName: row.courseName,
      present: 0,
      total: 0,
    };
    current.total += 1;
    if (row.present) current.present += 1;
    attendanceByCourse.set(row.courseId, current);
  }

  const courses = await db
    .select({ id: coursesTable.id, name: coursesTable.name })
    .from(coursesTable)
    .orderBy(asc(coursesTable.name));

  return courses.map((course) => {
    const row = attendanceByCourse.get(course.id) ?? {
      courseName: course.name,
      present: 0,
      total: 0,
    };
    const coursePercentage = percentage(row.present, row.total);
    const classesToRecover =
      row.total === 0 || coursePercentage >= 75
        ? 0
        : Math.max(1, Math.ceil((3 * row.total) - (4 * row.present)));
    return {
      courseId: course.id,
      courseName: row.courseName,
      present: row.present,
      total: row.total,
      percentage: coursePercentage,
      classesToRecover,
    };
  });
}

async function getStudentRecord(studentId: number) {
  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, studentId))
    .limit(1);
  return student;
}

router.get("/edutrack/students", async (req, res): Promise<void> => {
  await ensureEduTrackSeeded();
  const students = await db.select().from(studentsTable).orderBy(asc(studentsTable.rollNumber));
  res.json(ListStudentsResponse.parse(students));
});

router.post("/edutrack/students", async (req, res): Promise<void> => {
  const parsed = AddStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [student] = await db
      .insert(studentsTable)
      .values({
        name: parsed.data.name.trim(),
        rollNumber: parsed.data.rollNumber.trim().toUpperCase(),
        className: parsed.data.className,
      })
      .returning();
    res.status(201).json(AddStudentResponse.parse(student));
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      res.status(400).json({ error: "That roll number is already in use." });
      return;
    }
    throw error;
  }
});

router.get("/edutrack/courses", async (_req, res): Promise<void> => {
  await ensureEduTrackSeeded();
  const courses = await db
    .select({
      id: coursesTable.id,
      name: coursesTable.name,
      courseCode: coursesTable.courseCode,
      facultyId: facultyTable.id,
      facultyName: facultyTable.name,
    })
    .from(coursesTable)
    .innerJoin(facultyCoursesTable, eq(facultyCoursesTable.courseId, coursesTable.id))
    .innerJoin(facultyTable, eq(facultyTable.id, facultyCoursesTable.facultyId))
    .orderBy(asc(coursesTable.name));
  res.json(ListCoursesResponse.parse(courses));
});

router.get("/edutrack/attendance", async (req, res): Promise<void> => {
  await ensureEduTrackSeeded();
  const query = GetAttendanceRosterQueryParams.safeParse({
    ...req.query,
    date: parseCalendarDate(req.query.date),
  });
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const [course] = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.id, query.data.courseId))
    .limit(1);
  if (!course) {
    res.status(404).json({ error: "Course not found." });
    return;
  }

  const [students, rows] = await Promise.all([
    db.select().from(studentsTable).orderBy(asc(studentsTable.rollNumber)),
    db
      .select()
      .from(attendanceTable)
      .where(
        and(
          eq(attendanceTable.courseId, query.data.courseId),
          eq(attendanceTable.date, query.data.date.toISOString().slice(0, 10)),
        ),
      ),
  ]);
  const statusByStudent = new Map(rows.map((row) => [row.studentId, row.present]));
  const response = GetAttendanceRosterResponse.parse({
    courseId: course.id,
    courseName: course.name,
    date: query.data.date,
    students: students.map((student) => ({
      studentId: student.id,
      name: student.name,
      rollNumber: student.rollNumber,
      present: statusByStudent.get(student.id) ?? false,
    })),
  });
  res.json({ ...response, date: query.data.date.toISOString().slice(0, 10) });
});

router.put("/edutrack/attendance", async (req, res): Promise<void> => {
  await ensureEduTrackSeeded();
  const body =
    req.body !== null && typeof req.body === "object" && !Array.isArray(req.body)
      ? { ...req.body, date: parseCalendarDate(req.body.date) }
      : req.body;
  const parsed = SaveAttendanceBody.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { courseId, records } = parsed.data;
  const date = parsed.data.date.toISOString().slice(0, 10);
  if (records.length > 0) {
    await db.transaction(async (tx) => {
      for (const record of records) {
        await tx
          .insert(attendanceTable)
          .values({ courseId, date, studentId: record.studentId, present: record.present })
          .onConflictDoUpdate({
            target: [
              attendanceTable.courseId,
              attendanceTable.studentId,
              attendanceTable.date,
            ],
            set: { present: record.present },
          });
      }
    });
  }
  const presentCount = records.filter((record) => record.present).length;
  res.json(
    SaveAttendanceResponse.parse({
      savedCount: records.length,
      presentCount,
      absentCount: records.length - presentCount,
    }),
  );
});

router.get("/edutrack/grades", async (req, res): Promise<void> => {
  await ensureEduTrackSeeded();
  const query = GetGradeRosterQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const [course] = await db
    .select()
    .from(coursesTable)
    .where(eq(coursesTable.id, query.data.courseId))
    .limit(1);
  if (!course) {
    res.status(404).json({ error: "Course not found." });
    return;
  }
  const [students, grades] = await Promise.all([
    db.select().from(studentsTable).orderBy(asc(studentsTable.rollNumber)),
    db
      .select()
      .from(gradesTable)
      .where(
        and(
          eq(gradesTable.courseId, query.data.courseId),
          eq(gradesTable.exam, query.data.exam),
        ),
      ),
  ]);
  const marksByStudent = new Map(grades.map((grade) => [grade.studentId, grade.marks]));
  res.json(
    GetGradeRosterResponse.parse({
      courseId: course.id,
      courseName: course.name,
      exam: query.data.exam,
      students: students.map((student) => ({
        studentId: student.id,
        name: student.name,
        rollNumber: student.rollNumber,
        marks: marksByStudent.get(student.id) ?? null,
      })),
    }),
  );
});

router.put("/edutrack/grades", async (req, res): Promise<void> => {
  await ensureEduTrackSeeded();
  const parsed = SaveGradesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { courseId, exam, records } = parsed.data;
  if (records.length > 0) {
    await db.transaction(async (tx) => {
      for (const record of records) {
        await tx
          .insert(gradesTable)
          .values({ courseId, exam, studentId: record.studentId, marks: record.marks })
          .onConflictDoUpdate({
            target: [gradesTable.courseId, gradesTable.studentId, gradesTable.exam],
            set: { marks: record.marks },
          });
      }
    });
  }
  res.json(SaveGradesResponse.parse({ savedCount: records.length }));
});

router.get("/edutrack/reports/:studentId", async (req, res): Promise<void> => {
  await ensureEduTrackSeeded();
  const params = GetReportCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const student = await getStudentRecord(params.data.studentId);
  if (!student) {
    res.status(404).json({ error: "Student not found." });
    return;
  }
  const [courses, attendance] = await Promise.all([
    getCourseReports(student.id),
    getStudentAttendance(student.id),
  ]);
  const gradeRows = courses.filter((course) => course.midterm !== null || course.final !== null);
  const averagePercentage =
    gradeRows.length === 0
      ? 0
      : Math.round(
          (gradeRows.reduce((sum, course) => sum + course.percentage, 0) / gradeRows.length) * 10,
        ) / 10;
  const attendancePresent = attendance.reduce((sum, course) => sum + course.present, 0);
  const attendanceTotal = attendance.reduce((sum, course) => sum + course.total, 0);
  res.json(
    GetReportCardResponse.parse({
      student,
      courses,
      averagePercentage,
      cgpa: Math.round((averagePercentage / 10) * 100) / 100,
      overallAttendance: percentage(attendancePresent, attendanceTotal),
    }),
  );
});

router.get("/edutrack/student-dashboard/:studentId", async (req, res): Promise<void> => {
  await ensureEduTrackSeeded();
  const params = GetStudentDashboardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const student = await getStudentRecord(params.data.studentId);
  if (!student) {
    res.status(404).json({ error: "Student not found." });
    return;
  }
  const [attendance, marks] = await Promise.all([
    getStudentAttendance(student.id),
    getCourseReports(student.id),
  ]);
  const attendancePresent = attendance.reduce((sum, course) => sum + course.present, 0);
  const attendanceTotal = attendance.reduce((sum, course) => sum + course.total, 0);
  const gradedCourses = marks.filter((course) => course.midterm !== null || course.final !== null);
  const averagePercentage =
    gradedCourses.length === 0
      ? 0
      : Math.round(
          (gradedCourses.reduce((sum, course) => sum + course.percentage, 0) /
            gradedCourses.length) *
            10,
        ) / 10;
  res.json(
    GetStudentDashboardResponse.parse({
      student,
      attendance,
      marks,
      averagePercentage,
      overallAttendance: percentage(attendancePresent, attendanceTotal),
    }),
  );
});

router.get("/edutrack/admin/overview", async (_req, res): Promise<void> => {
  await ensureEduTrackSeeded();
  const [students, courses, faculty, attendanceRows, gradeRows] = await Promise.all([
    db.select().from(studentsTable),
    db.select().from(coursesTable),
    db.select().from(facultyTable),
    db.select().from(attendanceTable),
    db.select().from(gradesTable).where(eq(gradesTable.exam, "Final")),
  ]);
  const attendanceByStudent = new Map<number, { present: number; total: number }>();
  for (const row of attendanceRows) {
    const current = attendanceByStudent.get(row.studentId) ?? { present: 0, total: 0 };
    current.total += 1;
    if (row.present) current.present += 1;
    attendanceByStudent.set(row.studentId, current);
  }
  const atRiskStudents = students
    .map((student) => {
      const attendance = attendanceByStudent.get(student.id) ?? { present: 0, total: 0 };
      return {
        studentId: student.id,
        name: student.name,
        rollNumber: student.rollNumber,
        attendancePercentage: percentage(attendance.present, attendance.total),
      };
    })
    .filter(
      (student) =>
        (attendanceByStudent.get(student.studentId)?.total ?? 0) > 0 &&
        student.attendancePercentage < 75,
    )
    .sort((left, right) => left.attendancePercentage - right.attendancePercentage);
  const presentTotal = attendanceRows.filter((row) => row.present).length;
  const gradeCounts = new Map<"A+" | "A" | "B" | "C" | "F", number>([
    ["A+", 0],
    ["A", 0],
    ["B", 0],
    ["C", 0],
    ["F", 0],
  ]);
  for (const row of gradeRows) {
    const grade = gradeFor(row.marks);
    gradeCounts.set(grade, (gradeCounts.get(grade) ?? 0) + 1);
  }
  res.json(
    GetAdminOverviewResponse.parse({
      totalStudents: students.length,
      totalCourses: courses.length,
      totalFaculty: faculty.length,
      averageAttendance: percentage(presentTotal, attendanceRows.length),
      atRiskStudents,
      gradeDistribution: Array.from(gradeCounts, ([grade, gradeCount]) => ({
        grade,
        count: gradeCount,
      })),
    }),
  );
});

router.get("/edutrack/quote", async (req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);
  if (cachedQuote?.date === today) {
    res.json(GetQuoteOfTheDayResponse.parse(cachedQuote.value));
    return;
  }

  try {
    const response = await fetch("https://zenquotes.io/api/random", {
      signal: AbortSignal.timeout(3500),
    });
    if (!response.ok) throw new Error(`Quote service returned ${response.status}`);
    const body: unknown = await response.json();
    if (!Array.isArray(body) || typeof body[0]?.q !== "string" || typeof body[0]?.a !== "string") {
      throw new Error("Quote service returned an invalid response");
    }
    cachedQuote = { value: { quote: body[0].q, author: body[0].a }, date: today };
  } catch (error) {
    req.log.warn({ err: error }, "Quote service unavailable; using fallback quote");
    cachedQuote = { value: fallbackQuote, date: today };
  }
  res.json(GetQuoteOfTheDayResponse.parse(cachedQuote.value));
});

export default router;
