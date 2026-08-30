export interface BudgetItem {
  sl: string;
  budgetCode: string;
  budgetHead: string;
  responsiblePerson: string;
  budgetFigure: number;
  subCode?: string;
}

export const INITIAL_BUDGET_DATA: BudgetItem[] = [
  { sl: "1", budgetCode: "ADM-1", budgetHead: "ভবন ক্লিনিং মেটেরিয়ালস ও স্যানিটেশন", responsiblePerson: "আসিফ", budgetFigure: 760000, subCode: "B1" },
  { sl: "2", budgetCode: "ADM-2", budgetHead: "আপ্যায়ন", responsiblePerson: "শারিয়া আফরিন", budgetFigure: 700000, subCode: "B2" },
  { sl: "3", budgetCode: "ADM-3", budgetHead: "জনসংযোগ ও সভাসমূহ", responsiblePerson: "ফিরোজ আলম", budgetFigure: 300000, subCode: "B3" },
  { sl: "4", budgetCode: "ADM-4", budgetHead: "ইউটিলিটি/বিদ্যুৎ", responsiblePerson: "শারিয়া আফরিন", budgetFigure: 4505000, subCode: "B4" },
  { sl: "5", budgetCode: "ADM-5", budgetHead: "ইউটিলিটি/পানি ও সুয়ারেজ", responsiblePerson: "শারিয়া আফরিন", budgetFigure: 748000, subCode: "B5" },
  { sl: "6", budgetCode: "ADM-6", budgetHead: "ইউটিলিটি/ইন্টারনেট/ফ্যাক্স/টেলেক্স", responsiblePerson: "শারিয়া আফরিন", budgetFigure: 660000, subCode: "B6" },
  { sl: "7", budgetCode: "ADM-7", budgetHead: "ইউটিলিটি/টেলিফোন", responsiblePerson: "শারিয়া আফরিন", budgetFigure: 1640000, subCode: "B7" },
  { sl: "8", budgetCode: "ADM-8", budgetHead: "প্রশিক্ষণ ব্যয়", responsiblePerson: "ফিরোজ আলম", budgetFigure: 500000, subCode: "B8" },
  { sl: "9", budgetCode: "ADM-9", budgetHead: "পেট্রোল, ফুয়েল ও লুব্রিক্যান্ট", responsiblePerson: "আসিফ", budgetFigure: 800000, subCode: "B9" },
  { sl: "10", budgetCode: "ADM-10", budgetHead: "গ্যাস ও জ্বালানী", responsiblePerson: "শারিয়া আফরিন", budgetFigure: 520000, subCode: "B10" },
  { sl: "11", budgetCode: "ADM-11", budgetHead: "যাতায়াত ও ভ্রমণ ব্যয়", responsiblePerson: "আসিফ", budgetFigure: 100000, subCode: "B11" },
  { sl: "12", budgetCode: "ADM-12", budgetHead: "নিরাপত্তা সেবা", responsiblePerson: "আসিফ", budgetFigure: 1500000, subCode: "B12" },
  { sl: "13", budgetCode: "ADM-13", budgetHead: "কম্পিউটার ও অফিস সরঞ্জাম/সামগ্রী", responsiblePerson: "আসিফ", budgetFigure: 900000, subCode: "B13" },
  { sl: "14", budgetCode: "ADM-14", budgetHead: "প্রিন্টিং এন্ড স্টেশনরী", responsiblePerson: "আসিফ", budgetFigure: 5430000, subCode: "B14" },
  { sl: "15", budgetCode: "ADM-15", budgetHead: "সম্মানী, ফি, পারিশ্রমিক", responsiblePerson: "শারিয়া আফরিন", budgetFigure: 300000, subCode: "B15" },
  { sl: "16", budgetCode: "ADM-16", budgetHead: "অনুষ্ঠান ও উৎসবাদি", responsiblePerson: "শারিয়া আফরিন", budgetFigure: 800000, subCode: "B16" },
  { sl: "17", budgetCode: "ADM-17", budgetHead: "মোটর যানবাহন ও রক্ষণাবেক্ষণ", responsiblePerson: "আসিফ", budgetFigure: 500000, subCode: "B17" },
  { sl: "18", budgetCode: "ADM-18", budgetHead: "প্রচার ও বিজ্ঞাপন", responsiblePerson: "ফিরোজ আলম", budgetFigure: 200000, subCode: "B18" },
  { sl: "19", budgetCode: "ADM-19", budgetHead: "নিরীক্ষা ব্যয়", responsiblePerson: "ফিরোজ আলম", budgetFigure: 150000, subCode: "B19" },
  { sl: "20", budgetCode: "ADM-20", budgetHead: "অন্যান্য যন্ত্রপাতি ও সরঞ্জামাদি", responsiblePerson: "আসিফ", budgetFigure: 400000, subCode: "B20" },
  { sl: "21", budgetCode: "ADM-21", budgetHead: "মেরামত ও রক্ষণাবেক্ষণ", responsiblePerson: "আসিফ", budgetFigure: 600000, subCode: "B21" },
  { sl: "22", budgetCode: "ADM-22", budgetHead: "অনুদান ও চাঁদা", responsiblePerson: "শারিয়া আফরিন", budgetFigure: 100000, subCode: "B22" },
  { sl: "23", budgetCode: "ADM-23", budgetHead: "ওয়েবসাইট, সফটওয়্যার ও অনলাইন অ্যাক্টিভিটি", responsiblePerson: "আসিফ", budgetFigure: 500000, subCode: "B24" },
  { sl: "24", budgetCode: "ADM-24", budgetHead: "রিপোর্ট ও ডকুমেন্টারি", responsiblePerson: "ফিরোজ আলম", budgetFigure: 250000, subCode: "B25" },
  { sl: "25", budgetCode: "ADM-25", budgetHead: "ওভার টাইম", responsiblePerson: "আসিফ", budgetFigure: 350000, subCode: "B26" },
  { sl: "26", budgetCode: "ADM-26", budgetHead: "ভবনের বাগান ও ল্যান্ডস্কেপিং", responsiblePerson: "আসিফ", budgetFigure: 200000, subCode: "B27" },
  { sl: "27", budgetCode: "ADM-27", budgetHead: "ইউনিফর্ম এন্ড লিভারেজ", responsiblePerson: "আসিফ", budgetFigure: 180000, subCode: "B28" },
  { sl: "28", budgetCode: "ADM-28", budgetHead: "গেন্ডারিয়ার জমির রক্ষণাবেক্ষণ ব্যয়", responsiblePerson: "আসিফ", budgetFigure: 120000, subCode: "B29" },
  { sl: "29", budgetCode: "ADM-29", budgetHead: "বিবিধ/অপ্রত্যাশিত ব্যয়", responsiblePerson: "শারিয়া আফরিন", budgetFigure: 300000, subCode: "B30" },
  { sl: "30", budgetCode: "ADM-30", budgetHead: "জনবল নিয়োগ-বিজ্ঞাপন, সম্মানী ও আপ্যায়ন", responsiblePerson: "শারিয়া আফরিন", budgetFigure: 250000, subCode: "B31" },
  { sl: "31", budgetCode: "ADM-31", budgetHead: "ভূমি ও পৌর কর ইত্যাদি", responsiblePerson: "শারিয়া আফরিন", budgetFigure: 400000, subCode: "B32" },
  { sl: "32", budgetCode: "ADM-32", budgetHead: "চিকিৎসা ব্যয়", responsiblePerson: "শারিয়া আফরিন", budgetFigure: 200000, subCode: "B35" },
  { sl: "33", budgetCode: "ADM-33", budgetHead: "পরামর্শক ফি", responsiblePerson: "ফিরোজ আলম", budgetFigure: 300000, subCode: "B36" },
  { sl: "34", budgetCode: "DEV-1", budgetHead: "ভবনের ইন্টেরিয়র, আসবাবপত্র ও যন্ত্রপাতি", responsiblePerson: "আসিফ", budgetFigure: 1500000, subCode: "F1" },
  { sl: "35", budgetCode: "DEV-2", budgetHead: "জেনারেটর ক্রয়", responsiblePerson: "আসিফ", budgetFigure: 800000, subCode: "F2" },
  { sl: "36", budgetCode: "DEV-3", budgetHead: "গাড়ি ক্রয়", responsiblePerson: "আসিফ", budgetFigure: 2500000, subCode: "F3" },
  { sl: "37", budgetCode: "DEV-4", budgetHead: "বিবিধ সম্পদ সংগ্রহ (কম্পিউটার ও অন্যান্য)", responsiblePerson: "আসিফ", budgetFigure: 1000000, subCode: "F4" },
  { sl: "38", budgetCode: "DEV-5", budgetHead: "অডিও, ভিডিও, আর্কাইভ ও শিক্ষা উপকরণ", responsiblePerson: "ফিরোজ আলম", budgetFigure: 600000, subCode: "F5" },
  { sl: "39", budgetCode: "DEV-6", budgetHead: "জমি ক্রয়", responsiblePerson: "আসিফ", budgetFigure: 5000000, subCode: "F6" },
  { sl: "40", budgetCode: "DEV-7", budgetHead: "নতুন ভবন নির্মাণ", responsiblePerson: "আসিফ", budgetFigure: 10000000, subCode: "F7" }
];
