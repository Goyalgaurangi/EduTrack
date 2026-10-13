import { count } from "drizzle-orm";
import {
  attendanceTable,
  coursesTable,
  db,
  facultyCoursesTable,
  facultyTable,
  gradesTable,
  studentsTable,
} from "@workspace/db";

const seedStudents = [
  "Aarav Mehta",
  "Ananya Rao",
  "Kabir Shah",
  "Diya Nair",
  "Arjun Iyer",
  "Sara Khan",
  "Ishaan Das",
  "Mira Kapoor",
  "Vivaan Patel",
  "Aditi Menon",
  "Reyansh Bose",
  "Kiara Joshi",
];

const seedFaculty = [
  { name: "Dr. Asha Iyer", email: "asha.iyer@edutrack.demo" },
  { name: "Prof. Rohan Desai", email: "rohan.desai@edutrack.demo" },
  { name: "Dr. Meera Nair", email: "meera.nair@edutrack.demo" },
];

const seedCourses = [
  { name: "Data Structures", courseCode: "CS201", facultyIndex: 0 },
  { name: "DBMS", courseCode: "CS202", facultyIndex: 1 },
  { name: "Operating Systems", courseCode: "CS203", facultyIndex: 0 },
  { name: "Maths", courseCode: "MA204", facultyIndex: 2 },
  { name: "English", courseCode: "HU205", facultyIndex: 1 },
];

function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function recentDates(days: number): string[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (days - index - 1));
    return date.toISOString().slice(0, 10);
  });
}

export async function ensureEduTrackSeeded(): Promise<void> {
  await db.transaction(async (tx) => {
    const [existing] = await tx.select({ count: count() }).from(studentsTable);
    if (Number(existing?.count ?? 0) > 0) return;

    const faculty = await tx.insert(facultyTable).values(seedFaculty).returning();
    const courses = await tx.insert(coursesTable).values(
      seedCourses.map(({ name, courseCode }) => ({ name, courseCode })),
    ).returning();
    const students = await tx.insert(studentsTable).values(
      seedStudents.map((name, index) => ({
        name,
        rollNumber: `CSE-${String(index + 1).padStart(3, "0")}`,
        className: "CSE-A",
      })),
    ).returning();

    await tx.insert(facultyCoursesTable).values(
      seedCourses.map((course, index) => ({
        facultyId: faculty[course.facultyIndex].id,
        courseId: courses[index].id,
      })),
    );

    const dates = recentDates(20);
    const attendanceRows = students.flatMap((student, studentIndex) => {
      const attendanceTarget = [70, 73, 74, 82, 84, 86, 88, 90, 92, 94, 95, 85][studentIndex];
      const presentSlots = new Set(
        Array.from({ length: 100 }, (_, slot) => slot)
          .sort((left, right) => {
            const leftScore = pseudoRandom((studentIndex + 1) * 1000 + left);
            const rightScore = pseudoRandom((studentIndex + 1) * 1000 + right);
            return rightScore - leftScore;
          })
          .slice(0, attendanceTarget),
      );

      return courses.flatMap((course, courseIndex) =>
        dates.map((date, dateIndex) => {
          const slot = courseIndex * dates.length + dateIndex;
          return {
            courseId: course.id,
            studentId: student.id,
            date,
            present: presentSlots.has(slot),
          };
        }),
      );
    });
    await tx.insert(attendanceTable).values(attendanceRows);

    const gradeRows = students.flatMap((student, studentIndex) =>
      courses.flatMap((course, courseIndex) =>
        ["Midterm", "Final"].map((exam, examIndex) => ({
          courseId: course.id,
          studentId: student.id,
          exam,
          marks: 54 + Math.floor(
            pseudoRandom((studentIndex + 1) * 311 + (courseIndex + 1) * 47 + examIndex) * 45,
          ),
        })),
      ),
    );
    await tx.insert(gradesTable).values(gradeRows);
  });
}
