import re

with open('src/types.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace DEPARTMENTS
text = text.replace(
    """export const DEPARTMENTS = [
  'বিএসকে.হিসাব',
  'বিএসকে.ক্যাফেটেরিয়া',
  'বিএসকে.প্রশাসন',
  'বিএসকে.এআইএস',
  'বিএসকে.বিসিআরএস',
  'বিএসকে.সিএমএলপি',
  'বিএসকে.সাংস্কৃতিক',
  'বিএসকে.উন্নয়ন',
  'বিএসকে.এইচআর',
  'বিএসকে.গ্রন্থাগার',
  'বিএসকে.এমবিএফআইআই'
];""",
    """export const DEPARTMENTS = [
  'BSK.Accounts',
  'BSK.Cafeteria',
  'BSK.Admin',
  'BSK.AIS',
  'BSK.BCRS',
  'BSK.CMLP',
  'BSK.Cultural',
  'BSK.Development',
  'BSK.HR',
  'BSK.Library',
  'BSK.MBFII'
];"""
)

# Replace SUBJECTS_BY_DEPT
text = text.replace(
    """export const SUBJECTS_BY_DEPT: Record<string, string[]> = {
  'বিএসকে.হিসাব': ['প্রভিডেন্ট ফান্ড', 'অডিট ফি', 'হিসাব সাধারণ', '৩য় প্রান্তিক বিল', 'ব্যাংক', '৩য় প্রান্তিক চাহিদা'],
  'বিএসকে.ক্যাফেটেরিয়া': ['দৈনিক বাজার (সিএএফ-০২)', 'রক্ষণাবেক্ষণ (সিএএফ-০৩)', 'ক্যাফেটেরিয়া খরচ'],
  'বিএসকে.প্রশাসন': ['রক্ষণাবেক্ষণ (এডএম-০২)', 'প্রশাসন সাধারণ', 'অফিস ইউটিলিটিস', 'নিয়োগ'],
  'বিএসকে.এআইএস': ['সম্মানী (এআইএস-০৫)', 'এআইএস সাধারণ', 'সিস্টেম অডিট'],
  'বিএসকে.বিসিআরএস': ['গবেষণা কাজ', 'বিসিআরএস সাধারণ', 'জরিপ প্রকল্প'],
  'বিএসকে.সিএমএলপি': ['মুদ্রণ সামগ্রী (সিএমএলপি-১১)', 'প্রকাশনা কাজ'],
  'বিএসকে.সাংস্কৃতিক': ['প্রোগ্রাম (সিইউএল-০৩)', 'সাংস্কৃতিক উৎসব', 'ইভেন্ট লজিস্টিকস'],
  'বিএসকে.উন্নয়ন': ['সম্পদ (ডিইভি-০১)', 'অবকাঠামো উন্নয়ন'],
  'বিএসকে.এইচআর': ['নিয়োগ প্রক্রিয়া', 'কর্মী উন্নয়ন', 'এইচআর পলিসি', 'ছুটি ব্যবস্থাপনা'],
  'বিএসকে.গ্রন্থাগার': ['বই ক্রয় (এলআইবি-০১)', 'গ্রন্থাগার সাবস্ক্রিপশন'],
  'বিএসকে.এমবিএফআইআই': ['মেলা আয়োজন (এমবিএফআইআই-০১)', 'বইমেলা লজিস্টিকস']
};""",
    """export const SUBJECTS_BY_DEPT: Record<string, string[]> = {
  'BSK.Accounts': ['Provident Fund', 'Audit Fee', 'Accounts General', '3rd Quarter Bill', 'Bank', '3rd Quarter Demand'],
  'BSK.Cafeteria': ['Daily Market (CAF-02)', 'Maintenance (CAF-03)', 'Cafeteria Expense'],
  'BSK.Admin': ['Maintenance (ADM-02)', 'Admin General', 'Office Utilities', 'Recruitment'],
  'BSK.AIS': ['Honorarium (AIS-05)', 'AIS General', 'System Audit'],
  'BSK.BCRS': ['Research Work', 'BCRS General', 'Survey Project'],
  'BSK.CMLP': ['Printing Material (CMLP-11)', 'Publication Work'],
  'BSK.Cultural': ['Program (CUL-03)', 'Cultural Festival', 'Event Logistics'],
  'BSK.Development': ['Asset (DEV-01)', 'Infrastructure Development'],
  'BSK.HR': ['Recruitment Process', 'Staff Development', 'HR Policy', 'Leave Management'],
  'BSK.Library': ['Book Purchase (LIB-01)', 'Library Subscription'],
  'BSK.MBFII': ['Fair Organizing (MBFII-01)', 'Book Fair Logistics']
};"""
)

# Translate DESIGNATIONS for files
text = text.replace(
    """export const DESIGNATIONS = [
  'সহকারী পরিচালক (AD)',
  'যুগ্ম পরিচালক (JD)',
  'পরিচালক (Director)',
  'হিসাবরক্ষণ কর্মকর্তা (Accounts Officer)',
  'প্রোগ্রাম কর্মকর্তা (Program Officer)',
  'প্রশাসনিক কর্মকর্তা (Admin Officer)',
  'নির্বাহী (Executive)',
  'সুপার এডমিন (Super Admin)'
];""",
    """export const DESIGNATIONS = [
  'Assistant Director (AD)',
  'Joint Director (JD)',
  'Director',
  'Accounts Officer',
  'Program Officer',
  'Admin Officer',
  'Executive',
  'Super Admin'
];

export const MEMO_DESIGNATIONS = [
  'সহকারী পরিচালক (AD)',
  'যুগ্ম পরিচালক (JD)',
  'পরিচালক (Director)',
  'হিসাবরক্ষণ কর্মকর্তা (Accounts Officer)',
  'প্রোগ্রাম কর্মকর্তা (Program Officer)',
  'প্রশাসনিক কর্মকর্তা (Admin Officer)',
  'নির্বাহী (Executive)',
  'সুপার এডমিন (Super Admin)'
];"""
)

# Translate RESPONSIBLE_PERSONS for files
text = text.replace(
    """export const RESPONSIBLE_PERSONS = [
  'মনির',
  'শান্ত',
  'ফিরোজ',
  'অনিক'
];""",
    """export const RESPONSIBLE_PERSONS = [
  'Monir',
  'Shanto',
  'Firoz',
  'Anik'
];

export const MEMO_RESPONSIBLE_PERSONS = [
  'মনির',
  'শান্ত',
  'ফিরোজ',
  'অনিক'
];"""
)

with open('src/types.ts', 'w', encoding='utf-8') as f:
    f.write(text)
