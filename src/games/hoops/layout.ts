export function rodRows(count: number): number[] {
  const rows = count <= 5 ? 1 : count <= 8 ? 2 : 3;
  const cols = Math.ceil(count / rows);
  return Array.from({ length: rows }, (_, r) => Math.min(cols, count - r * cols));
}
