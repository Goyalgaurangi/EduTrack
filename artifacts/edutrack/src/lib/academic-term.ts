export function getAcademicTerm(date = new Date()) {
  const month = date.getMonth();
  const year = date.getFullYear();
  const season = month >= 7 ? 'Fall' : month >= 5 ? 'Summer' : 'Spring';
  const startYear = month >= 7 ? year : year - 1;

  return {
    season,
    label: `${season.toUpperCase()} · ${year}`,
    academicYear: `${startYear} — ${startYear + 1}`,
    shortAcademicYear: `${startYear}–${String(startYear + 1).slice(-2)}`,
  };
}
