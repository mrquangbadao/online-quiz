/**
 * Dinh dang diem so cho cac man hinh va dashboard:
 * Toan bo diem thi trong hoi thi la so nguyen, luon hien thi dang so nguyen (vi du: 25d, 38d, -2d, 0d)
 * Khong bao gio hien thi dang so thuc 25.0d, 0.0d.
 */
export function formatScore(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '0';
  const num = Number(val);
  if (Number.isNaN(num)) return '0';
  return Math.round(num).toString();
}
