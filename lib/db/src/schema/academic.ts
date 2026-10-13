import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  date,
  integer,
  pgTable,
  serial,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const studentsTable = pgTable(
  "edutrack_students",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    rollNumber: text("roll_number").notNull(),
    className: text("class_name").notNull().default("CSE-A"),
  },
  (table) => [uniqueIndex("edutrack_students_roll_number_idx").on(table.rollNumber)],
);

export const coursesTable = pgTable(
  "edutrack_courses",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    courseCode: text("course_code").notNull(),
  },
  (table) => [uniqueIndex("edutrack_courses_code_idx").on(table.courseCode)],
);

export const facultyTable = pgTable(
  "edutrack_faculty",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
  },
  (table) => [uniqueIndex("edutrack_faculty_email_idx").on(table.email)],
);

export const facultyCoursesTable = pgTable(
  "edutrack_faculty_courses",
  {
    id: serial("id").primaryKey(),
    facultyId: integer("faculty_id")
      .notNull()
      .references(() => facultyTable.id, { onDelete: "cascade" }),
    courseId: integer("course_id")
      .notNull()
      .references(() => coursesTable.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("edutrack_faculty_courses_pair_idx").on(
      table.facultyId,
      table.courseId,
    ),
  ],
);

export const attendanceTable = pgTable(
  "edutrack_attendance",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id")
      .notNull()
      .references(() => coursesTable.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    present: boolean("present").notNull(),
  },
  (table) => [
    uniqueIndex("edutrack_attendance_course_student_date_idx").on(
      table.courseId,
      table.studentId,
      table.date,
    ),
  ],
);

export const gradesTable = pgTable(
  "edutrack_grades",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id")
      .notNull()
      .references(() => coursesTable.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    exam: text("exam").notNull(),
    marks: integer("marks").notNull(),
  },
  (table) => [
    uniqueIndex("edutrack_grades_course_student_exam_idx").on(
      table.courseId,
      table.studentId,
      table.exam,
    ),
  ],
);

export const insertStudentSchema = createInsertSchema(studentsTable).omit({ id: true });
export const insertCourseSchema = createInsertSchema(coursesTable).omit({ id: true });
export const insertFacultySchema = createInsertSchema(facultyTable).omit({ id: true });
export const insertFacultyCourseSchema = createInsertSchema(facultyCoursesTable).omit({
  id: true,
});
export const insertAttendanceSchema = createInsertSchema(attendanceTable).omit({ id: true });
export const insertGradeSchema = createInsertSchema(gradesTable).omit({ id: true });

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof coursesTable.$inferSelect;
export type InsertFaculty = z.infer<typeof insertFacultySchema>;
export type Faculty = typeof facultyTable.$inferSelect;
export type InsertFacultyCourse = z.infer<typeof insertFacultyCourseSchema>;
export type FacultyCourse = typeof facultyCoursesTable.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendanceTable.$inferSelect;
export type InsertGrade = z.infer<typeof insertGradeSchema>;
export type Grade = typeof gradesTable.$inferSelect;
