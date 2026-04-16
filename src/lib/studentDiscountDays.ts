/**
 * Check if the student discount is active today based on the configured days.
 * If days is null/empty, discount is active every day.
 */
export function isStudentDiscountActiveToday(days: string[] | null | undefined): boolean {
  if (!days || days.length === 0) return true;
  
  const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = dayMap[new Date().getDay()];
  return days.includes(today);
}
