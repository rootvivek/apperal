export function formatAdminDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatAdminDateShort(date: string): string {
  return new Date(date).toLocaleDateString();
}

export function formatAdminCurrency(value: number): string {
  return `₹${(value || 0).toFixed(2)}`;
}


