/**
 * Converts a number to Indian Rupees currency words.
 * e.g. 2381.86 → "Two Thousand Three Hundred Eighty-One Rupees and Eighty-Six Paise Only"
 */

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function convertBelowHundred(n: number): string {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return tens[t] + (o ? '-' + ones[o] : '');
}

function convertBelowThousand(n: number): string {
  if (n < 100) return convertBelowHundred(n);
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return ones[h] + ' Hundred' + (rest ? ' ' + convertBelowHundred(rest) : '');
}

/**
 * Indian numbering system:
 * 1,00,000 = One Lakh
 * 1,00,00,000 = One Crore
 */
function numberToWordsIndian(n: number): string {
  if (n === 0) return 'Zero';
  if (n < 0) return 'Minus ' + numberToWordsIndian(-n);

  let result = '';

  // Crores (1,00,00,000+)
  if (n >= 10000000) {
    const crores = Math.floor(n / 10000000);
    result += convertBelowThousand(crores) + ' Crore ';
    n %= 10000000;
  }

  // Lakhs (1,00,000+)
  if (n >= 100000) {
    const lakhs = Math.floor(n / 100000);
    result += convertBelowHundred(lakhs) + ' Lakh ';
    n %= 100000;
  }

  // Thousands (1,000+)
  if (n >= 1000) {
    const thousands = Math.floor(n / 1000);
    result += convertBelowHundred(thousands) + ' Thousand ';
    n %= 1000;
  }

  // Hundreds and below
  if (n > 0) {
    result += convertBelowThousand(n);
  }

  return result.trim();
}

export function numberToIndianCurrencyWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';

  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);

  let result = '';

  if (rupees > 0) {
    result = numberToWordsIndian(rupees) + ' Rupees';
  }

  if (paise > 0) {
    if (rupees > 0) result += ' and ';
    result += numberToWordsIndian(paise) + ' Paise';
  }

  result += ' Only';

  if (amount < 0) {
    result = 'Minus ' + result;
  }

  return result;
}
