export interface UserPermissions {
  menus: {
    welcome: boolean;
    files: boolean;
    memos: boolean;
    budget: boolean;
    expense: boolean;
    analytics: boolean;
    security: boolean;
    employees?: boolean;
    dailyExpenseApproval?: boolean;
    pilotProjectMadhyomik?: boolean;
    pilotProjectUchchoMadhyomik?: boolean;
  };
  actions: {
    files: { create: boolean; edit: boolean; delete: boolean };
    memos: { create: boolean; delete: boolean };
    budget: { create: boolean; edit: boolean; delete: boolean };
    expense: { create: boolean; edit: boolean; delete: boolean };
    employees?: { create: boolean; edit: boolean; delete: boolean };
    dailyExpenseApproval?: { create: boolean; edit: boolean; delete: boolean };
    pilotProjects?: { create: boolean; edit: boolean; delete: boolean };
  };
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  designation: string;
  role: 'Admin' | 'Contributor' | 'Viewer';
  createdAt?: any;
  permissions?: UserPermissions;
  expenseType?: 'Advance' | 'Paid' | 'Payment';
  fiscalYear?: string;
}

export interface FileEntry {
  id: string;
  si: string; // "001", "002", etc.
  openingDate: string; // "28.06.2026"
  department: string; // "BSK.ACC"
  subject: string; // "Provident Fund"
  openingYear: string; // "2026"
  responsiblePerson: string; // "Monir"
  designation: string; // "JD"
  fileName: string; // "BSK.ACC.Provident Fund.2026-001"
  part?: string; // "Part 1", "Part 2", "Part 3", etc.
  note?: string;
  createdAt?: any;
  createdBy: string;
  createdByName: string;
  createdByEmail: string;
  status?: 'pending' | 'approved';
}

export interface MemoEntry {
  id: string;
  si: string; // "001", "002", etc.
  openingDate: string; // "28.06.2026"
  department: string; // "BSK.ACC"
  subject: string; // "3rd Qrt Bill"
  receiver: string; // "Sec, MoE"
  responsiblePerson: string; // "Santo"
  designation: string; // "AD, ACC"
  memoNumber: string; // "BSK.ACC.3rd Qrt Bill.2026-001"
  part?: string; // "Part 1", "Part 2", "Part 3", etc.
  note?: string;
  createdAt?: any;
  createdBy: string;
  createdByName: string;
  createdByEmail: string;
  status?: 'pending' | 'approved';
}

export const DEPARTMENTS = [
  'BSK.Accounts',
  'BSK.Cafeteria',
  'BSK.Admin',
  'BSK.BCRS',
  'BSK.NBRP-P(S)',
  'BSK.NBRP-P(P)',
  'BSK.NBRP-P',
  'BSK.CMLP.',
  'BSK.Cultural',
  'BSK.Development',
  'BSK.HR',
  'BSK.Library'
];

export const SUBJECTS_BY_DEPT: Record<string, string[]> = {
  'BSK.Accounts': ['Provident Fund', 'Audit Fee', 'Accounts General', '3rd Quarter Bill', 'Bank', '3rd Quarter Demand'],
  'BSK.Cafeteria': ['Daily Market (CAF-02)', 'Maintenance (CAF-03)', 'Cafeteria Expense'],
  'BSK.Admin': ['Maintenance (ADM-02)', 'Admin General', 'Office Utilities', 'Recruitment'],
  'BSK.BCRS': ['Research Work', 'BCRS General', 'Survey Project'],
  'BSK.NBRP-P(S)': ['General', 'Project', 'Reports'],
  'BSK.NBRP-P(P)': ['General', 'Project', 'Reports'],
  'BSK.NBRP-P': ['General', 'Project', 'Reports'],
  'BSK.CMLP.': ['Printing Material (CMLP-11)', 'Publication Work'],
  'BSK.Cultural': ['Program (CUL-03)', 'Cultural Festival', 'Event Logistics'],
  'BSK.Development': ['Asset (DEV-01)', 'Infrastructure Development'],
  'BSK.HR': ['Recruitment Process', 'Staff Development', 'HR Policy', 'Leave Management'],
  'BSK.Library': ['Book Purchase (LIB-01)', 'Library Subscription']
};

export const DESIGNATIONS = [
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
  'সহকারী পরিচালক',
  'যুগ্ম পরিচালক',
  'পরিচালক',
  'হিসাবরক্ষণ কর্মকর্তা',
  'প্রোগ্রাম কর্মকর্তা',
  'প্রশাসনিক কর্মকর্তা',
  'নির্বাহী',
  'সুপার এডমিন'
];

export const RESPONSIBLE_PERSONS = [
  'Monir',
  'Shanto',
  'Firoj Alom',
  'Anik'
];

export const MEMO_RESPONSIBLE_PERSONS = [
  'মনির',
  'শান্ত',
  'ফিরোজ আলম',
  'অনিক'
];

export const MEMO_DEPARTMENTS = [
  'বিসাকে.প্রশাসন',
  'বিসাকে.প্রকাশনা',
  'বিসাকে.লাইব্রেরি',
  'বিসাকে.আলোর ইশকুল',
  'বিসাকে.হিসাব',
  'বিসাকে.বইমেলা',
  'বিসাকে.ভ্রাম্যমাণ লাইব্রেরি',
  'বিসাকে.বাঙালি চিন্তা',
  'বিসাকে.প্রোভিডেন্ট ফান্ড',
  'বিসাকে.গ্র্যাচুয়িটি ফান্ড',
  'বিসাকে.সহায়তা তহবিল',
  'বিসাকে.উৎকর্ষ কার্যক্রম',
  'বিসাকে.এইচআর',
  'BSK.NBRP-P',
  'BSK.NBRP-P(S)',
  'BSK.NBRP-P(P)'
];

export const MEMO_SUBJECTS = [
  'পত্র',
  'নিয়োগ',
  'অফিস আদেশ',
  'অব্যাহতি',
  'ছাড়পত্র',
  'কারণ দর্শানো',
  'ওয়ার্ক অর্ডার',
  'কিস্তির আবেদন',
  'ছুটি',
  'এনওসি'
];

export interface BudgetEntry {
  id: string;
  sl: string;
  budgetCode: string;
  budgetHead: string;
  responsiblePerson: string;
  budgetFigure: number;
}

export interface ExpenseEntry {
  id: string;
  serialNo?: string;
  budgetCode: string;
  amount: number;
  date: string;
  description: string;
  createdBy: string;
  createdAt?: any;
  expenseType?: 'Advance' | 'Paid' | 'Payment';
  subType?: 'Fixed' | 'Adjustment' | 'Complete' | string;
  fiscalYear?: string;
  isFixed?: boolean;
}

export interface EmployeeEntry {
  id: string;
  uid?: string; // BSK.HR.PERSONNEL.(job id).(joining year)
  sl: string;
  name: string;
  nameBangla: string;
  fatherName: string;
  motherName: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  dob: string; // Combined dob
  currentPosition: string;
  currentDepartment: string;
  jobId: string;
  joiningDay: string;
  joiningMonth: string;
  joiningYear: string;
  joiningDate: string; // Combined joining date
  status: string;
  nationality: string;
  nid: string;
  nomineeName: string;
  nomineeNid: string;
  relation: string;
  share: string;
  minorOnBehalf: string;
  pfAcNo: string;
  remarks: string;
  photoURL?: string; // Compressed Base64 image
  createdAt?: any;
  createdBy: string;
  createdByName: string;
  createdByEmail: string;
}

export interface DailyExpenseItem {
  sl: number;
  description: string; // কাজের/ক্রয়ের বিবরণ
  estimatedExpense: number | string; // সম্ভাব্য ব্যয়
}

export interface DailyExpenseApprovalEntry {
  id: string;
  slNo: string;
  applicantName: string; // আবেদনকারীর নাম
  department: string; // প্রশাসন বিভাগ
  budgetHead: string; // খাতের নাম
  date: string; // তারিখ
  items: DailyExpenseItem[];
  totalAmount: number;
  totalInWords: string; // মোট কথায়
  status?: 'pending' | 'approved' | 'rejected';
  createdAt?: any;
  createdBy: string;
  createdByName: string;
  createdByEmail: string;
}

export interface PilotProjectEntry {
  id: string;
  sl: string;
  level: 'primary' | 'secondary' | 'madhyomik' | 'uchcho_madhyomik';
  challanNo?: string; // বই সরবরাহের চালান নম্বর (যেমন: ০০০১)
  institutionName: string; // শিক্ষা প্রতিষ্ঠানের নাম (যেমন: আগৈলঝাড়া বি. এইচ. পি. একাডেমী)
  district: string; // জেলা (যেমন: নারায়নগজ্ঞ)
  upazila: string; // উপজেলা (যেমন: আড়াই হাজার)
  eiin?: string; // EIIN (যেমন: 100350)
  codeNo?: string; // Code No (যেমন: 00002)
  coordinatorName: string; // সমন্বয়ক / দায়িত্বপ্রাপ্ত কর্মকর্তা
  contactNumber: string; // যোগাযোগ নম্বর
  studentCount: number; // শিক্ষার্থী সংখ্যা
  allocatedBudget: number; // বরাদ্দকৃত বাজেট
  spentAmount: number; // ব্যয়িত অর্থ
  status: 'active' | 'in_progress' | 'completed' | 'paused'; // অবস্থা
  startDate: string; // শুরুর তারিখ / প্রেরণের তারিখ
  remarks?: string; // মন্তব্য
  senderSign?: string; // প্রেরণকারীর নাম/স্বাক্ষর
  approvedBy?: string; // অনুমোদনকারী
  receivedBy?: string; // গ্রহণকারী
  customBooks?: Array<{
    sl: number;
    class: string;
    title: string;
    author?: string;
    quantity: number;
  }>;
  totalBooks?: number;
  createdAt?: any;
  createdBy: string;
  createdByName?: string;
  createdByEmail?: string;
}

