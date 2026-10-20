// src/lib/icons.ts
// Кириллица и пробелы в имени файла — кодируем, чтобы URL был валидным.
export function iconUrl(name: string | null | undefined): string | null {
  if (!name) return null;
  return `/icons/${encodeURIComponent(name)}.png`;
}