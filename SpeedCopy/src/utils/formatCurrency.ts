export const formatCurrency = (amount: number): string => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `\u20B9${safeAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

export const formatPrice = (amount: number): string => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `${safeAmount < 0 ? '-' : ''}${formatCurrency(Math.abs(safeAmount))}`;
};
