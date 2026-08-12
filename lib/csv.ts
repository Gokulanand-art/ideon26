export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsv(c.header)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escapeCsv(c.accessor(row))).join(","))
    .join("\n");
  return `${header}\n${body}${rows.length ? "\n" : ""}`;
}
