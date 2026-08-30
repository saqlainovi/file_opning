const units = ['', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়'];
const teens = [
  'দশ', 'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ',
  'বিশ', 'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আঠাশ', 'উনত্রিশ',
  'ত্রিশ', 'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'উনচল্লিশ',
  'চল্লিশ', 'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চৌয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'উনপঞ্চাশ',
  'পঞ্চাশ', 'একান্ন', 'বায়ান্ন', 'তিপ্পান্ন', 'চৌয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'উনষাট',
  'ষাট', 'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'উনসত্তর',
  'সত্তর', 'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চৌহাত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'উনাশি',
  'আশি', 'একাশি', 'বিরাশি', 'তেরাশি', 'চৌরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতাসি', 'অষ্টাসি', 'উননব্বই',
  'নব্বই', 'একানব্বই', 'বিরানব্বই', 'তেরানব্বই', 'চৌরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই'
];

export function numberToBengaliWords(num: number): string {
  if (isNaN(num) || num === 0) return 'শূন্য টাকা মাত্র';
  if (num < 0) return 'মাইনাস ' + numberToBengaliWords(Math.abs(num));

  num = Math.floor(num);

  const convertTwoDigits = (n: number): string => {
    if (n === 0) return '';
    if (n < 10) return units[n];
    return teens[n - 10] || '';
  };

  let words = '';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;

  const lakh = Math.floor(num / 100000);
  num %= 100000;

  const thousand = Math.floor(num / 1000);
  num %= 1000;

  const hundred = Math.floor(num / 100);
  num %= 100;

  if (crore > 0) {
    const croreWords = numberToBengaliWords(crore).replace(' টাকা মাত্র', '');
    words += croreWords + ' কোটি ';
  }

  if (lakh > 0) {
    words += convertTwoDigits(lakh) + ' লাখ ';
  }

  if (thousand > 0) {
    words += convertTwoDigits(thousand) + ' হাজার ';
  }

  if (hundred > 0) {
    words += units[hundred] + ' শত ';
  }

  if (num > 0) {
    words += convertTwoDigits(num) + ' ';
  }

  return words.trim() + ' টাকা মাত্র';
}

export function toBengaliNumerals(num: number | string): string {
  if (num === undefined || num === null) return '';
  const bnNums = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (digit) => bnNums[parseInt(digit)]);
}
