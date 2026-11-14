import DOMPurify from 'dompurify';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBengaliDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

export function formatTakaFromPoisha(
  poisha: number,
  lang: 'bn' | 'en' = 'bn',
  includeSymbol = true
): string {
  const safePoisha = Number.isFinite(poisha) ? Math.round(poisha) : 0;
  const isNegative = safePoisha < 0;
  const absPoisha = Math.abs(safePoisha);
  const wholeTaka = Math.floor(absPoisha / 100);
  const remPoisha = absPoisha % 100;

  const formattedWhole = wholeTaka.toLocaleString('en-IN');
  const decimalPart = remPoisha > 0 ? `.${String(remPoisha).padStart(2, '0')}` : '';
  const combined = `${isNegative ? '-' : ''}${formattedWhole}${decimalPart}`;
  const localized = lang === 'bn' ? toBengaliDigits(combined) : combined;
  return includeSymbol ? `৳ ${localized}` : localized;
}

export function takaToPoisha(value: string | number): number {
  const raw = String(value)
    .replace(/[০-৯]/g, (ch) => String(BN_DIGITS.indexOf(ch)))
    .replace(/,/g, '')
    .trim();
  if (!raw) return 0;
  const match = raw.match(/^(-?\d+)(?:\.(\d{1,2})\d*)?$/);
  if (!match) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
  }
  const sign = match[1].startsWith('-') ? -1 : 1;
  const whole = Math.abs(parseInt(match[1], 10));
  const fracStr = (match[2] || '').padEnd(2, '0');
  const frac = parseInt(fracStr, 10);
  return sign * (whole * 100 + frac);
}

export function poishaToTakaInput(poisha: number): string {
  const safe = Math.round(poisha);
  const whole = Math.floor(safe / 100);
  const rem = safe % 100;
  return rem > 0 ? `${whole}.${String(rem).padStart(2, '0')}` : String(whole);
}

const BN_NUM_WORDS: Record<number, string> = {
  0: 'শূন্য', 1: 'এক', 2: 'দুই', 3: 'তিন', 4: 'চার', 5: 'পাঁচ', 6: 'ছয়', 7: 'সাত', 8: 'আট', 9: 'নয়',
  10: 'দশ', 11: 'এগারো', 12: 'বারো', 13: 'তেরো', 14: 'চৌদ্দ', 15: 'পনেরো', 16: 'ষোলো', 17: 'সতেরো', 18: 'আঠারো', 19: 'উনিশ',
  20: 'বিশ', 21: 'একুশ', 22: 'বাইশ', 23: 'তেইশ', 24: 'চব্বিশ', 25: 'পঁচিশ', 26: 'ছাব্বিশ', 27: 'সাতাশ', 28: 'আটাশ', 29: 'ঊনত্রিশ',
  30: 'ত্রিশ', 31: 'একত্রিশ', 32: 'বত্রিশ', 33: 'তেত্রিশ', 34: 'চৌত্রিশ', 35: 'পঁয়ত্রিশ', 36: 'ছত্রিশ', 37: 'সাঁইত্রিশ', 38: 'আটত্রিশ', 39: 'ঊনচল্লিশ',
  40: 'চল্লিশ', 41: 'একচল্লিশ', 42: 'বিয়াল্লিশ', 43: 'তেতাল্লিশ', 44: 'চুয়াল্লিশ', 45: 'পঁয়তাল্লিশ', 46: 'ছেচল্লিশ', 47: 'সাতচল্লিশ', 48: 'আটচল্লিশ', 49: 'ঊনপঞ্চাশ',
  50: 'পঞ্চাশ', 51: 'একান্ন', 52: 'বাহান্ন', 53: 'তিপ্পান্ন', 54: 'চুয়ান্ন', 55: 'পঞ্চান্ন', 56: 'ছাপ্পান্ন', 57: 'সাতান্ন', 58: 'আটান্ন', 59: 'ঊনষাট',
  60: 'ষাট', 61: 'একষট্টি', 62: 'বাষট্টি', 63: 'তেষট্টি', 64: 'চৌষট্টি', 65: 'পঁয়ষট্টি', 66: 'ছেষট্টি', 67: 'সাতষট্টি', 68: 'আটষট্টি', 69: 'ঊনসত্তর',
  70: 'সত্তর', 71: 'একাত্তর', 72: 'বাহাত্তর', 73: 'তিয়াত্তর', 74: 'চুয়াত্তর', 75: 'পঁচাত্তর', 76: 'ছিয়াত্তর', 77: 'সাতাত্তর', 78: 'আটাত্তর', 79: 'ঊনআশি',
  80: 'আশি', 81: 'একাশি', 82: 'বিরাশি', 83: 'তিরাশি', 84: 'চুরাশি', 85: 'পঁচাশি', 86: 'ছিয়াশি', 87: 'সাতাশি', 88: 'আটাশি', 89: 'ঊননব্বই',
  90: 'নব্বই', 91: 'একানব্বই', 92: 'বিরানব্বই', 93: 'তিরানব্বই', 94: 'চুরানব্বই', 95: 'পঁচানব্বই', 96: 'ছিয়ানব্বই', 97: 'সাতানব্বই', 98: 'আটানব্বই', 99: 'নিরানব্বই',
};

function convertIntToBnWords(n: number): string {
  if (n === 0) return 'শূন্য';
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  if (crore > 0) {
    parts.push(`${convertIntToBnWords(crore)} কোটি`);
    n %= 10000000;
  }
  const lakh = Math.floor(n / 100000);
  if (lakh > 0) {
    parts.push(`${BN_NUM_WORDS[lakh] || convertIntToBnWords(lakh)} লক্ষ`);
    n %= 100000;
  }
  const thousand = Math.floor(n / 1000);
  if (thousand > 0) {
    parts.push(`${BN_NUM_WORDS[thousand] || convertIntToBnWords(thousand)} হাজার`);
    n %= 1000;
  }
  const hundred = Math.floor(n / 100);
  if (hundred > 0) {
    parts.push(`${BN_NUM_WORDS[hundred]} শত`);
    n %= 100;
  }
  if (n > 0) {
    parts.push(BN_NUM_WORDS[n]);
  }
  return parts.join(' ');
}

export function poishaToTakaWordsBn(poisha: number): string {
  const safe = Math.abs(Math.round(poisha));
  const taka = Math.floor(safe / 100);
  const rem = safe % 100;
  const takaPart = `${convertIntToBnWords(taka)} টাকা`;
  const poishaPart = rem > 0 ? ` ${convertIntToBnWords(rem)} পয়সা` : '';
  return `${takaPart}${poishaPart} মাত্র`;
}

export const BN_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

export function formatDateBn(dateStr: string, lang: 'bn' | 'en' = 'bn'): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return lang === 'bn' ? toBengaliDigits(dateStr) : dateStr;
  const [y, m, d] = parts;
  const monthIdx = parseInt(m, 10) - 1;
  if (lang === 'en') {
    return dateStr;
  }
  const monthName = BN_MONTHS[monthIdx] || m;
  return `${toBengaliDigits(parseInt(d, 10))} ${monthName} ${toBengaliDigits(y)}`;
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

export function generateDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
}

export function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'KASP-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
