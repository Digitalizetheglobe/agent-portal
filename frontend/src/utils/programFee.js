// Program tuition is stored as text such as "USD 20,000 / year". These helpers show it with a currency
// symbol and work out what an agent earns from the university's commission rate.

const CURRENCY_SYMBOLS = { USD: '$', GBP: '£', EUR: '€', AUD: 'A$', CAD: 'C$', NZD: 'NZ$', INR: '₹', SGD: 'S$', MYR: 'RM ', AED: 'AED ' };

// { text: "$20,000 / year", amount: 20000, symbol: "$" }, or null when there is no fee.
// amount is null when the text holds more than one number (a range), so nothing is calculated from it.
export const readFee = (fee) => {
  if (!fee) return null;
  const text = String(fee).trim();
  const m = text.match(/^([A-Z]{3})\s+(.*)$/);
  const known = m && CURRENCY_SYMBOLS[m[1]];
  const symbol = known || (m ? `${m[1]} ` : '');
  const numbers = text.match(/\d+(?:,\d{3})*(?:\.\d{1,2})?/g) || [];
  const amount = numbers.length === 1 ? parseFloat(numbers[0].replace(/,/g, '')) : null;
  return { text: known ? `${symbol}${m[2]}` : text, amount: amount > 0 ? amount : null, symbol };
};

// What the agent earns: the commission percentage of the tuition, e.g. "$3,000"
export const earningsFor = (fee, rate) => {
  if (!fee || fee.amount === null || rate == null || Number(rate) <= 0) return null;
  const value = Math.round(fee.amount * Number(rate)) / 100;
  return `${fee.symbol}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};
