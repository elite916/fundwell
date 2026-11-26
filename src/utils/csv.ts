/**
 * Quotes a CSV cell. People type these values: a leading ' stops spreadsheets running them as formulas.
 */
export function escapeCsvCell(cell: string): string {
  return `"${cell.replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""')}"`;
}
