/**
 * Check if the student discount is active today based on the configured days.
 * Days are required — if null/empty, discount is NOT active.
 */
export function isStudentDiscountActiveToday(days: string[] | null | undefined): boolean {
  if (!days || days.length === 0) return false;
  
  const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = dayMap[new Date().getDay()];
  return days.includes(today);
}
