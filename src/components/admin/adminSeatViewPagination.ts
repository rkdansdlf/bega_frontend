export function normalizeAdminSeatViewPageNumber(pageNumber: number, totalPages: number): number {
  return Math.min(Math.max(pageNumber, 0), Math.max(totalPages - 1, 0));
}
