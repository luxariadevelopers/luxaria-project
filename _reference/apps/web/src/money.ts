export function inr(paise: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format((paise || 0) / 100);
}

export function rupeesToPaise(rupees: string | number) {
  return Math.round(Number(rupees) * 100);
}
