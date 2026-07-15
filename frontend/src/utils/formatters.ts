export const formatCurrency = (amount: number, currencyCode?: string): string => {
  const code = currencyCode || localStorage.getItem('user_currency') || 'USD';
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    INR: '₹',
    GBP: '£',
    JPY: '¥',
    AED: 'د.إ',
    SAR: 'ر.س',
  };
  const symbol = symbols[code] || '$';
  
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};
