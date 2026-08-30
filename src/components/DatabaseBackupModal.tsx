import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { collection, getDocs } from 'firebase/firestore';
import { 
  Download, 
  Database, 
  RefreshCw, 
  FileSpreadsheet, 
  FileCode, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Layers, 
  ShieldCheck, 
  Copy, 
  HardDrive,
  Server,
  HelpCircle,
  Check,
  Code2,
  Eye,
  CheckCheck
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { toBengaliNumerals, formatDateToDDMMYYYY } from '../utils/bengaliToWords';
import { INITIAL_BUDGET_DATA } from '../budgetData';
import { DEPARTMENTS, DESIGNATIONS, RESPONSIBLE_PERSONS } from '../types';

interface DatabaseBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'BN' | 'EN';
}

interface CollectionStats {
  id: string;
  nameBn: string;
  nameEn: string;
  count: number;
  icon: string;
}

function escapeSqlString(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return isNaN(val) ? '0' : String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'object') {
    val = JSON.stringify(val);
  }
  const str = String(val);
  const escaped = str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case "\0": return "\\0";
      case "\x08": return "\\b";
      case "\x09": return "\\t";
      case "\x1a": return "\\z";
      case "\n": return "\\n";
      case "\r": return "\\r";
      case "\"": return "\\\"";
      case "'": return "\\'";
      case "\\": return "\\\\";
      case "%": return "\\%";
      default: return char;
    }
  });
  return `'${escaped}'`;
}

export default function DatabaseBackupModal({
  isOpen,
  onClose,
  lang = 'BN'
}: DatabaseBackupModalProps) {
  const { userProfile, isLocalSandbox } = useAuth();
  const [activeTab, setActiveTab] = useState<'download' | 'preview'>('download');
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingSql, setIsExportingSql] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showCpanelGuide, setShowCpanelGuide] = useState(false);
  const [previewFilter, setPreviewFilter] = useState('all');
  const [errorMsg, setErrorMsg] = useState('');
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);

  // Live collections data
  const [dbData, setDbData] = useState<{
    files: any[];
    memos: any[];
    employees: any[];
    daily_expense_approvals: any[];
    pilot_projects: any[];
    budgets: any[];
    expenses: any[];
    memo_dropdown_options: any[];
    users: any[];
    admin_users: any[];
    admin_pins: any[];
    activity_logs: any[];
  }>({
    files: [],
    memos: [],
    employees: [],
    daily_expense_approvals: [],
    pilot_projects: [],
    budgets: [],
    expenses: [],
    memo_dropdown_options: [],
    users: [],
    admin_users: [],
    admin_pins: [],
    activity_logs: []
  });

  const fetchFullDatabase = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const resultData: any = {
        files: [],
        memos: [],
        employees: [],
        daily_expense_approvals: [],
        pilot_projects: [],
        budgets: [],
        expenses: [],
        memo_dropdown_options: [],
        users: [],
        admin_users: [],
        admin_pins: [],
        activity_logs: []
      };

      const collectionsToFetch = [
        'files',
        'memos',
        'employees',
        'daily_expense_approvals',
        'pilot_projects',
        'budgets',
        'expenses',
        'memo_dropdown_options',
        'users',
        'admin_users',
        'admin_pins',
        'activity_logs'
      ];

      // Fetch all collections from Firestore with fallback handling
      await Promise.all(
        collectionsToFetch.map(async (colName) => {
          try {
            const querySnapshot = await getDocs(collection(db, colName));
            const items: any[] = [];
            querySnapshot.forEach((docSnap) => {
              const data = docSnap.data();
              // Convert timestamps to ISO strings if needed
              const sanitized: any = { id: docSnap.id };
              for (const key in data) {
                if (data[key] && typeof data[key].toDate === 'function') {
                  sanitized[key] = data[key].toDate().toISOString();
                } else {
                  sanitized[key] = data[key];
                }
              }
              items.push(sanitized);
            });
            resultData[colName] = items;
          } catch (colErr) {
            console.warn(`Firestore read failed for collection '${colName}':`, colErr);
            resultData[colName] = [];
          }
        })
      );

      // Merge local storage items if present (for offline or local sandbox modes)
      const localFiles = localStorage.getItem('local_sandbox_files');
      if (localFiles && resultData.files.length === 0) {
        try { resultData.files = JSON.parse(localFiles); } catch (_) {}
      }

      const localMemos = localStorage.getItem('local_sandbox_memos');
      if (localMemos && resultData.memos.length === 0) {
        try { resultData.memos = JSON.parse(localMemos); } catch (_) {}
      }

      const localEmployees = localStorage.getItem('local_sandbox_employees');
      if (localEmployees && resultData.employees.length === 0) {
        try { resultData.employees = JSON.parse(localEmployees); } catch (_) {}
      }

      const localExpenses = localStorage.getItem('local_sandbox_daily_expenses');
      if (localExpenses && resultData.daily_expense_approvals.length === 0) {
        try { resultData.daily_expense_approvals = JSON.parse(localExpenses); } catch (_) {}
      }

      const localPilotPrimary = localStorage.getItem('local_pilot_projects_primary');
      const localPilotSecondary = localStorage.getItem('local_pilot_projects_secondary');
      if (resultData.pilot_projects.length === 0) {
        const p1 = localPilotPrimary ? JSON.parse(localPilotPrimary) : [];
        const p2 = localPilotSecondary ? JSON.parse(localPilotSecondary) : [];
        resultData.pilot_projects = [...p1, ...p2];
      }

      const localBudgets = localStorage.getItem('local_sandbox_budgets');
      if (localBudgets && resultData.budgets.length === 0) {
        try { resultData.budgets = JSON.parse(localBudgets); } catch (_) {}
      }

      // Default budget data fallback if database is empty
      if (resultData.budgets.length === 0) {
        resultData.budgets = INITIAL_BUDGET_DATA.map((b, idx) => ({
          id: `budget_init_${idx + 1}`,
          sl: b.sl,
          budgetCode: b.budgetCode,
          budgetHead: b.budgetHead,
          responsiblePerson: b.responsiblePerson,
          budgetFigure: b.budgetFigure,
          fiscalYear: '2026-2027',
          createdAt: new Date().toISOString()
        }));
      }

      const localExpenseList = localStorage.getItem('local_sandbox_expenses');
      if (localExpenseList && resultData.expenses.length === 0) {
        try { resultData.expenses = JSON.parse(localExpenseList); } catch (_) {}
      }

      const localAdminUsers = localStorage.getItem('local_admin_users');
      if (localAdminUsers && resultData.admin_users.length === 0) {
        try { resultData.admin_users = JSON.parse(localAdminUsers); } catch (_) {}
      }

      // Default admin users fallback
      if (resultData.admin_users.length === 0 && resultData.users.length === 0) {
        resultData.admin_users = [
          {
            id: 'admin_1',
            username: 'bskbdorg@gmail.com',
            email: 'bskbdorg@gmail.com',
            displayName: 'Super Admin',
            designation: 'Super Admin',
            role: 'Super Admin',
            status: 'Active',
            createdAt: new Date().toISOString()
          },
          {
            id: 'admin_2',
            username: 'ovi.it',
            email: 'ovi.it',
            displayName: 'IT Administrator',
            designation: 'Super Admin',
            role: 'Super Admin',
            status: 'Active',
            createdAt: new Date().toISOString()
          }
        ];
      }

      // Dropdown options fallback
      if (resultData.memo_dropdown_options.length === 0) {
        const defaultOpts: any[] = [];
        DEPARTMENTS.forEach((d, i) => defaultOpts.push({ id: `dept_${i}`, fieldType: 'department', optionValue: d }));
        DESIGNATIONS.forEach((d, i) => defaultOpts.push({ id: `desig_${i}`, fieldType: 'designation', optionValue: d }));
        RESPONSIBLE_PERSONS.forEach((d, i) => defaultOpts.push({ id: `resp_${i}`, fieldType: 'responsible_person', optionValue: d }));
        resultData.memo_dropdown_options = defaultOpts;
      }

      const localPins = localStorage.getItem('local_admin_pins');
      if (localPins && resultData.admin_pins.length === 0) {
        try { resultData.admin_pins = JSON.parse(localPins); } catch (_) {}
      }

      const localLogs = localStorage.getItem('local_activity_logs');
      if (localLogs && resultData.activity_logs.length === 0) {
        try { resultData.activity_logs = JSON.parse(localLogs); } catch (_) {}
      }

      setDbData(resultData);
      setLastBackupTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error("Error fetching full database:", err);
      setErrorMsg(err.message || "Failed to fetch database collections.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchFullDatabase();
    }
  }, [isOpen, fetchFullDatabase]);

  // Calculate statistics
  const stats: CollectionStats[] = [
    { id: 'files', nameBn: 'ফাইল রেজিস্টার (Files)', nameEn: 'File Register Entries', count: dbData.files.length, icon: '📁' },
    { id: 'memos', nameBn: 'মেমো রেজিস্টার (Memos)', nameEn: 'Memo Register Entries', count: dbData.memos.length, icon: '📝' },
    { id: 'employees', nameBn: 'কর্মকর্তা ও কর্মচারী (HR)', nameEn: 'Employee Database Records', count: dbData.employees.length, icon: '👥' },
    { id: 'daily_expense_approvals', nameBn: 'দৈনন্দিন খরচের অনুমোদন', nameEn: 'Daily Expense Approvals', count: dbData.daily_expense_approvals.length, icon: '💵' },
    { id: 'pilot_projects', nameBn: 'পাইলট প্রকল্প (স্কুল/প্রতিষ্ঠান)', nameEn: 'Pilot Projects (Primary & Secondary)', count: dbData.pilot_projects.length, icon: '🏫' },
    { id: 'budgets', nameBn: 'বাজেট বিবরণ ও বরাদ্দ', nameEn: 'Budget Allocations', count: dbData.budgets.length, icon: '💰' },
    { id: 'expenses', nameBn: 'ব্যয় ও খরচের এন্ট্রি', nameEn: 'Expense Transactions', count: dbData.expenses.length, icon: '💳' },
    { id: 'admin_users', nameBn: 'ব্যবহারকারী ও অনুমতি', nameEn: 'Users & Permissions', count: (dbData.admin_users.length || dbData.users.length), icon: '👤' },
    { id: 'memo_dropdown_options', nameBn: 'কাস্টম ড্রপডাউন অপশন', nameEn: 'Dropdown Field Options', count: dbData.memo_dropdown_options.length, icon: '⚙️' },
    { id: 'activity_logs', nameBn: 'কার্যক্রম ও অডিট লগ', nameEn: 'System Activity Logs', count: dbData.activity_logs.length, icon: '📜' }
  ];

  const totalRecordCount: number = (Object.values(dbData) as any[][]).reduce((acc: number, curr: any[]) => acc + (Array.isArray(curr) ? curr.length : 0), 0);

  // Download Full JSON Backup
  const handleDownloadJSON = () => {
    setIsExportingJson(true);
    try {
      const now = new Date();
      const timestampStr = now.toISOString().replace(/[:.]/g, '-');
      const dateStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD

      const fullDatabasePayload = {
        metadata: {
          organization: 'Bishwa Sahittya Kendra (BSK)',
          project: 'BSK Enterprise Portal Database Backup',
          exportedAt: now.toISOString(),
          exportedBy: userProfile?.displayName || userProfile?.email || 'Administrator',
          userEmail: userProfile?.email || 'bskbdorg@gmail.com',
          totalCollections: Object.keys(dbData).length,
          totalRecords: totalRecordCount,
          databaseEnvironment: isLocalSandbox ? 'Local Sandbox / Offline' : 'Google Cloud Firestore Production'
        },
        collections: dbData
      };

      const jsonString = JSON.stringify(fullDatabasePayload, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BSK_Full_Database_Backup_${dateStr}_${timestampStr.slice(11, 19)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Error creating JSON backup:", err);
      alert("JSON ব্যাকআপ তৈরি করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setIsExportingJson(false);
    }
  };

  // Download Multi-Sheet Excel Backup
  const handleDownloadExcel = () => {
    setIsExportingExcel(true);
    try {
      const wb = XLSX.utils.book_new();
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD

      // 1. Overview Sheet
      const overviewData = [
        ['বিসমিল্লাহির রাহমানির রাহীম'],
        ['বিশ্বসাহিত্য কেন্দ্র (BSK) - সম্পূর্ণ ডাটাবেজ ব্যাকআপ ও বিবরণী'],
        ['রপ্তানির তারিখ ও সময়:', now.toLocaleString('bn-BD')],
        ['রপ্তানিকারক:', userProfile?.displayName || userProfile?.email || 'Administrator'],
        ['ডাটাবেজ প্ল্যাটফর্ম:', isLocalSandbox ? 'Local Sandbox' : 'Cloud Firestore'],
        ['সর্বমোট এন্ট্রি সংখ্যা:', totalRecordCount],
        [],
        ['সংগ্রহ (Collection Name)', 'বাংলা বিবরণ', 'রেকর্ড সংখ্যা']
      ];

      stats.forEach((s) => {
        overviewData.push([s.id, s.nameBn, s.count]);
      });

      const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(wb, wsOverview, 'Overview Summary');

      // 2. Files Register Sheet
      if (dbData.files && dbData.files.length > 0) {
        const fileRows = dbData.files.map((f, i) => ({
          'ক্রঃ নং': i + 1,
          'ক্রমিক (SI)': f.si || '',
          'খোলা তারিখ': formatDateToDDMMYYYY(f.openingDate),
          'বিভাগ': f.department || '',
          'বিষয় / হিসাব খাত': f.subject || '',
          'খোলার বছর': f.openingYear || '',
          'ফাইল নাম': f.fileName || '',
          'দায়িত্বপ্রাপ্ত ব্যক্তি': f.responsiblePerson || '',
          'পদবি': f.designation || '',
          'পার্ট (Part)': f.part || 'None',
          'নোট / মন্তব্য': f.note || '',
          'এন্ট্রি কারী': f.createdByName || f.createdByEmail || ''
        }));
        const wsFiles = XLSX.utils.json_to_sheet(fileRows);
        XLSX.utils.book_append_sheet(wb, wsFiles, 'Files Register');
      }

      // 3. Memos Register Sheet
      if (dbData.memos && dbData.memos.length > 0) {
        const memoRows = dbData.memos.map((m, i) => ({
          'ক্রঃ নং': i + 1,
          'ক্রমিক (SI)': m.si || '',
          'তারিখ': formatDateToDDMMYYYY(m.openingDate),
          'বিভাগ': m.department || '',
          'বিষয়': m.subject || '',
          'স্মারক নম্বর': m.memoNumber || '',
          'প্রাপক (Receiver)': m.receiver || '',
          'দায়িত্বপ্রাপ্ত কর্মকর্তা': m.responsiblePerson || '',
          'পদবি': m.designation || '',
          'পার্ট (Part)': m.part || 'None',
          'মন্তব্য': m.note || '',
          'এন্ট্রি কারী': m.createdByName || m.createdByEmail || ''
        }));
        const wsMemos = XLSX.utils.json_to_sheet(memoRows);
        XLSX.utils.book_append_sheet(wb, wsMemos, 'Memos Register');
      }

      // 4. Employees Database Sheet
      if (dbData.employees && dbData.employees.length > 0) {
        const empRows = dbData.employees.map((e, i) => ({
          'ক্রঃ নং': i + 1,
          'ক্রমিক (SL)': e.sl || '',
          'নাম (ইংরেজী)': e.name || '',
          'নাম (বাংলা)': e.nameBangla || '',
          'পিতার নাম': e.fatherName || '',
          'মাতার নাম': e.motherName || '',
          'পদবি': e.currentPosition || '',
          'বিভাগ': e.currentDepartment || '',
          'জব আইডি (Job ID)': e.jobId || '',
          'যোগদানের তারিখ': formatDateToDDMMYYYY(e.joiningDate),
          'জন্ম তারিখ': formatDateToDDMMYYYY(e.dob),
          'জাতীয় পরিচয়পত্র (NID)': e.nid || '',
          'জাতীয়তা': e.nationality || 'Bangladeshi',
          'পিএফ একাউন্ট নং': e.pfAcNo || '',
          'নমিনীর নাম': e.nomineeName || '',
          'নমিনীর এনআইডি': e.nomineeNid || '',
          'সম্পর্ক': e.relation || '',
          'অংশ (%)': e.share || '',
          'নাবালকের অভিভাবক': e.minorOnBehalf || '',
          'স্ট্যাটাস': e.status || '',
          'মন্তব্য': e.remarks || ''
        }));
        const wsEmp = XLSX.utils.json_to_sheet(empRows);
        XLSX.utils.book_append_sheet(wb, wsEmp, 'Employees HR');
      }

      // 5. Daily Expense Approvals Sheet
      if (dbData.daily_expense_approvals && dbData.daily_expense_approvals.length > 0) {
        const expenseRows = dbData.daily_expense_approvals.map((d, i) => {
          const itemsSummary = Array.isArray(d.items) 
            ? d.items.map((it: any) => `${it.description || ''} (${it.amount || 0} টাকা)`).join('; ')
            : '';
          return {
            'ক্রঃ নং': i + 1,
            'স্মারক/ক্রমিক নং': d.slNo || '',
            'তারিখ': formatDateToDDMMYYYY(d.date),
            'আবেদনকারী': d.applicantName || '',
            'বিভাগ': d.department || '',
            'বাজেট খাত': d.budgetHead || '',
            'মোট টাকার পরিমাণ': d.totalAmount || 0,
            'কথায় (টাকা)': d.totalInWords || '',
            'খরচের আইটেম বিবরণ': itemsSummary,
            'স্ট্যাটাস': d.status || 'Approved',
            'নোট/মন্তব্য': d.remarks || ''
          };
        });
        const wsExpense = XLSX.utils.json_to_sheet(expenseRows);
        XLSX.utils.book_append_sheet(wb, wsExpense, 'Daily Expense Approvals');
      }

      // 6. Pilot Projects Sheet
      if (dbData.pilot_projects && dbData.pilot_projects.length > 0) {
        const pilotRows = dbData.pilot_projects.map((p, i) => ({
          'ক্রঃ নং': i + 1,
          'চালান নম্বর': p.challanNo || '',
          'স্তর (Level)': p.level === 'primary' ? 'প্রাথমিক (Primary)' : 'মাধ্যমিক (Secondary)',
          'শিক্ষা প্রতিষ্ঠানের নাম': p.institutionName || '',
          'জেলা': p.district || '',
          'উপজেলা': p.upazila || '',
          'ইআইআইএন (EIIN)': p.eiin || '',
          'কোড নম্বর': p.codeNo || '',
          'সমন্বয়ক / প্রধান শিক্ষক': p.coordinatorName || '',
          'যোগাযোগের মোবাইল': p.contactNumber || '',
          'ছাত্র-ছাত্রীর সংখ্যা': p.studentCount || '',
          'বাজেট বরাদ্দ (টাকা)': p.allocatedBudget || 0,
          'ব্যয়িত পরিমাণ (টাকা)': p.spentAmount || 0,
          'শুরুর তারিখ': formatDateToDDMMYYYY(p.startDate),
          'স্ট্যাটাস': p.status || '',
          'মন্তব্য': p.remarks || ''
        }));
        const wsPilot = XLSX.utils.json_to_sheet(pilotRows);
        XLSX.utils.book_append_sheet(wb, wsPilot, 'Pilot Projects');
      }

      // 7. Budgets Sheet
      if (dbData.budgets && dbData.budgets.length > 0) {
        const budgetRows = dbData.budgets.map((b, i) => ({
          'ক্রঃ নং': i + 1,
          'ক্রমিক (SL)': b.sl || '',
          'বাজেট কোড': b.budgetCode || '',
          'খাতের নাম': b.budgetHead || '',
          'দায়িত্বপ্রাপ্ত ব্যক্তি': b.responsiblePerson || '',
          'বাজেট বরাদ্দ (টাকা)': b.budgetFigure || 0,
          'অর্থবছর': b.fiscalYear || '2026-2027'
        }));
        const wsBudgets = XLSX.utils.json_to_sheet(budgetRows);
        XLSX.utils.book_append_sheet(wb, wsBudgets, 'Budgets');
      }

      // 8. Expenses Sheet
      if (dbData.expenses && dbData.expenses.length > 0) {
        const expRows = dbData.expenses.map((e, i) => ({
          'ক্রঃ নং': i + 1,
          'তারিখ': formatDateToDDMMYYYY(e.date),
          'বাজেট কোড': e.budgetCode || '',
          'ধরন (Type)': e.type || '',
          'ক্যাটাগরি': e.subType || '',
          'পরিমাণ (টাকা)': e.amount || 0,
          'বিবরণ': e.description || '',
          'অর্থবছর': e.fiscalYear || ''
        }));
        const wsExp = XLSX.utils.json_to_sheet(expRows);
        XLSX.utils.book_append_sheet(wb, wsExp, 'Expenses');
      }

      // 9. Admin Users Sheet
      const usersList = dbData.admin_users.length > 0 ? dbData.admin_users : dbData.users;
      if (usersList && usersList.length > 0) {
        const userRows = usersList.map((u, i) => ({
          'ক্রঃ নং': i + 1,
          'ইউজারনেম / আইডি': u.username || u.email || '',
          'পূর্ণ নাম': u.displayName || '',
          'পদবি': u.designation || '',
          'রোল (Role)': u.role || 'Contributor',
          'তৈরির তারিখ': u.createdAt ? formatDateToDDMMYYYY(u.createdAt) : ''
        }));
        const wsUsers = XLSX.utils.json_to_sheet(userRows);
        XLSX.utils.book_append_sheet(wb, wsUsers, 'Users & Permissions');
      }

      XLSX.writeFile(wb, `BSK_Complete_Database_Export_${dateStr}.xlsx`);
    } catch (err: any) {
      console.error("Error creating Excel backup:", err);
      alert("এক্সেল ব্যাকআপ তৈরি করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Generate full MySQL / MariaDB SQL Dump Script
  const generateSQLDumpString = (): string => {
    const now = new Date();
    const timestampStr = now.toISOString().replace('T', ' ').slice(0, 19);

    let sql = `-- --------------------------------------------------------
-- BSK Enterprise Portal - MySQL / MariaDB Database Dump
-- Platform: cPanel / phpMyAdmin / MySQL 5.7+ / 8.0+ / MariaDB
-- Export Date: ${timestampStr}
-- Exported By: ${userProfile?.displayName || userProfile?.email || 'Administrator'}
-- Total Records: ${totalRecordCount}
-- --------------------------------------------------------

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+06:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------
-- 1. Table structure for table \`files\` (ফাইল রেজিস্টার)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`files\` (
  \`id\` VARCHAR(128) NOT NULL,
  \`si\` VARCHAR(64) DEFAULT NULL,
  \`opening_date\` VARCHAR(64) DEFAULT NULL,
  \`department\` VARCHAR(255) DEFAULT NULL,
  \`subject\` TEXT DEFAULT NULL,
  \`opening_year\` VARCHAR(32) DEFAULT NULL,
  \`file_name\` VARCHAR(255) DEFAULT NULL,
  \`responsible_person\` VARCHAR(255) DEFAULT NULL,
  \`designation\` VARCHAR(255) DEFAULT NULL,
  \`part\` VARCHAR(64) DEFAULT 'None',
  \`note\` TEXT DEFAULT NULL,
  \`created_by_name\` VARCHAR(255) DEFAULT NULL,
  \`created_by_email\` VARCHAR(255) DEFAULT NULL,
  \`created_at\` VARCHAR(64) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`;

    // INSERT INTO files
    if (dbData.files && dbData.files.length > 0) {
      sql += `-- Dumping data for table \`files\`\n`;
      dbData.files.forEach((f) => {
        sql += `INSERT INTO \`files\` (\`id\`, \`si\`, \`opening_date\`, \`department\`, \`subject\`, \`opening_year\`, \`file_name\`, \`responsible_person\`, \`designation\`, \`part\`, \`note\`, \`created_by_name\`, \`created_by_email\`, \`created_at\`) VALUES (${escapeSqlString(f.id || f._id || `file_${Math.random()}`)}, ${escapeSqlString(f.si)}, ${escapeSqlString(f.openingDate)}, ${escapeSqlString(f.department)}, ${escapeSqlString(f.subject)}, ${escapeSqlString(f.openingYear)}, ${escapeSqlString(f.fileName)}, ${escapeSqlString(f.responsiblePerson)}, ${escapeSqlString(f.designation)}, ${escapeSqlString(f.part || 'None')}, ${escapeSqlString(f.note)}, ${escapeSqlString(f.createdByName)}, ${escapeSqlString(f.createdByEmail)}, ${escapeSqlString(f.createdAt)});\n`;
      });
      sql += `\n`;
    }

    // 2. Memos
    sql += `-- --------------------------------------------------------
-- 2. Table structure for table \`memos\` (মেমো রেজিস্টার)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`memos\` (
  \`id\` VARCHAR(128) NOT NULL,
  \`si\` VARCHAR(64) DEFAULT NULL,
  \`opening_date\` VARCHAR(64) DEFAULT NULL,
  \`department\` VARCHAR(255) DEFAULT NULL,
  \`subject\` TEXT DEFAULT NULL,
  \`memo_number\` VARCHAR(255) DEFAULT NULL,
  \`receiver\` VARCHAR(255) DEFAULT NULL,
  \`responsible_person\` VARCHAR(255) DEFAULT NULL,
  \`designation\` VARCHAR(255) DEFAULT NULL,
  \`part\` VARCHAR(64) DEFAULT 'None',
  \`note\` TEXT DEFAULT NULL,
  \`created_by_name\` VARCHAR(255) DEFAULT NULL,
  \`created_by_email\` VARCHAR(255) DEFAULT NULL,
  \`created_at\` VARCHAR(64) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`;
    if (dbData.memos && dbData.memos.length > 0) {
      sql += `-- Dumping data for table \`memos\`\n`;
      dbData.memos.forEach((m) => {
        sql += `INSERT INTO \`memos\` (\`id\`, \`si\`, \`opening_date\`, \`department\`, \`subject\`, \`memo_number\`, \`receiver\`, \`responsible_person\`, \`designation\`, \`part\`, \`note\`, \`created_by_name\`, \`created_by_email\`, \`created_at\`) VALUES (${escapeSqlString(m.id || m._id || `memo_${Math.random()}`)}, ${escapeSqlString(m.si)}, ${escapeSqlString(m.openingDate)}, ${escapeSqlString(m.department)}, ${escapeSqlString(m.subject)}, ${escapeSqlString(m.memoNumber)}, ${escapeSqlString(m.receiver)}, ${escapeSqlString(m.responsiblePerson)}, ${escapeSqlString(m.designation)}, ${escapeSqlString(m.part || 'None')}, ${escapeSqlString(m.note)}, ${escapeSqlString(m.createdByName)}, ${escapeSqlString(m.createdByEmail)}, ${escapeSqlString(m.createdAt)});\n`;
      });
      sql += `\n`;
    }

    // 3. Employees
    sql += `-- --------------------------------------------------------
-- 3. Table structure for table \`employees\` (কর্মকর্তা ও কর্মচারী HR)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`employees\` (
  \`id\` VARCHAR(128) NOT NULL,
  \`sl\` VARCHAR(64) DEFAULT NULL,
  \`name\` VARCHAR(255) DEFAULT NULL,
  \`name_bangla\` VARCHAR(255) DEFAULT NULL,
  \`father_name\` VARCHAR(255) DEFAULT NULL,
  \`mother_name\` VARCHAR(255) DEFAULT NULL,
  \`current_position\` VARCHAR(255) DEFAULT NULL,
  \`current_department\` VARCHAR(255) DEFAULT NULL,
  \`job_id\` VARCHAR(64) DEFAULT NULL,
  \`joining_date\` VARCHAR(64) DEFAULT NULL,
  \`dob\` VARCHAR(64) DEFAULT NULL,
  \`nid\` VARCHAR(64) DEFAULT NULL,
  \`nationality\` VARCHAR(128) DEFAULT 'Bangladeshi',
  \`pf_ac_no\` VARCHAR(64) DEFAULT NULL,
  \`nominee_name\` VARCHAR(255) DEFAULT NULL,
  \`nominee_nid\` VARCHAR(64) DEFAULT NULL,
  \`relation\` VARCHAR(128) DEFAULT NULL,
  \`share\` VARCHAR(64) DEFAULT NULL,
  \`minor_on_behalf\` VARCHAR(255) DEFAULT NULL,
  \`status\` VARCHAR(64) DEFAULT 'Active',
  \`remarks\` TEXT DEFAULT NULL,
  \`created_at\` VARCHAR(64) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`;
    if (dbData.employees && dbData.employees.length > 0) {
      sql += `-- Dumping data for table \`employees\`\n`;
      dbData.employees.forEach((e) => {
        sql += `INSERT INTO \`employees\` (\`id\`, \`sl\`, \`name\`, \`name_bangla\`, \`father_name\`, \`mother_name\`, \`current_position\`, \`current_department\`, \`job_id\`, \`joining_date\`, \`dob\`, \`nid\`, \`nationality\`, \`pf_ac_no\`, \`nominee_name\`, \`nominee_nid\`, \`relation\`, \`share\`, \`minor_on_behalf\`, \`status\`, \`remarks\`, \`created_at\`) VALUES (${escapeSqlString(e.id || e._id || `emp_${Math.random()}`)}, ${escapeSqlString(e.sl)}, ${escapeSqlString(e.name)}, ${escapeSqlString(e.nameBangla)}, ${escapeSqlString(e.fatherName)}, ${escapeSqlString(e.motherName)}, ${escapeSqlString(e.currentPosition)}, ${escapeSqlString(e.currentDepartment)}, ${escapeSqlString(e.jobId)}, ${escapeSqlString(e.joiningDate)}, ${escapeSqlString(e.dob)}, ${escapeSqlString(e.nid)}, ${escapeSqlString(e.nationality || 'Bangladeshi')}, ${escapeSqlString(e.pfAcNo)}, ${escapeSqlString(e.nomineeName)}, ${escapeSqlString(e.nomineeNid)}, ${escapeSqlString(e.relation)}, ${escapeSqlString(e.share)}, ${escapeSqlString(e.minorOnBehalf)}, ${escapeSqlString(e.status || 'Active')}, ${escapeSqlString(e.remarks)}, ${escapeSqlString(e.createdAt)});\n`;
      });
      sql += `\n`;
    }

    // 4. Daily Expense Approvals
    sql += `-- --------------------------------------------------------
-- 4. Table structure for table \`daily_expense_approvals\` (দৈনন্দিন খরচের অনুমোদন)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`daily_expense_approvals\` (
  \`id\` VARCHAR(128) NOT NULL,
  \`sl_no\` VARCHAR(64) DEFAULT NULL,
  \`date\` VARCHAR(64) DEFAULT NULL,
  \`applicant_name\` VARCHAR(255) DEFAULT NULL,
  \`department\` VARCHAR(255) DEFAULT NULL,
  \`budget_head\` VARCHAR(255) DEFAULT NULL,
  \`total_amount\` DECIMAL(15,2) DEFAULT 0.00,
  \`total_in_words\` TEXT DEFAULT NULL,
  \`items_json\` LONGTEXT DEFAULT NULL,
  \`status\` VARCHAR(64) DEFAULT 'Approved',
  \`remarks\` TEXT DEFAULT NULL,
  \`created_by\` VARCHAR(255) DEFAULT NULL,
  \`created_at\` VARCHAR(64) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`;
    if (dbData.daily_expense_approvals && dbData.daily_expense_approvals.length > 0) {
      sql += `-- Dumping data for table \`daily_expense_approvals\`\n`;
      dbData.daily_expense_approvals.forEach((d) => {
        const itemsJsonStr = Array.isArray(d.items) ? JSON.stringify(d.items) : (d.items || '[]');
        sql += `INSERT INTO \`daily_expense_approvals\` (\`id\`, \`sl_no\`, \`date\`, \`applicant_name\`, \`department\`, \`budget_head\`, \`total_amount\`, \`total_in_words\`, \`items_json\`, \`status\`, \`remarks\`, \`created_by\`, \`created_at\`) VALUES (${escapeSqlString(d.id || d._id || `exp_appr_${Math.random()}`)}, ${escapeSqlString(d.slNo)}, ${escapeSqlString(d.date)}, ${escapeSqlString(d.applicantName)}, ${escapeSqlString(d.department)}, ${escapeSqlString(d.budgetHead)}, ${Number(d.totalAmount) || 0}, ${escapeSqlString(d.totalInWords)}, ${escapeSqlString(itemsJsonStr)}, ${escapeSqlString(d.status || 'Approved')}, ${escapeSqlString(d.remarks)}, ${escapeSqlString(d.createdByName || d.createdBy)}, ${escapeSqlString(d.createdAt)});\n`;
      });
      sql += `\n`;
    }

    // 5. Pilot Projects
    sql += `-- --------------------------------------------------------
-- 5. Table structure for table \`pilot_projects\` (পাইলট প্রকল্প)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`pilot_projects\` (
  \`id\` VARCHAR(128) NOT NULL,
  \`challan_no\` VARCHAR(64) DEFAULT NULL,
  \`level\` VARCHAR(64) DEFAULT 'primary',
  \`institution_name\` VARCHAR(255) DEFAULT NULL,
  \`district\` VARCHAR(128) DEFAULT NULL,
  \`upazila\` VARCHAR(128) DEFAULT NULL,
  \`eiin\` VARCHAR(64) DEFAULT NULL,
  \`code_no\` VARCHAR(64) DEFAULT NULL,
  \`coordinator_name\` VARCHAR(255) DEFAULT NULL,
  \`contact_number\` VARCHAR(64) DEFAULT NULL,
  \`student_count\` VARCHAR(64) DEFAULT NULL,
  \`allocated_budget\` DECIMAL(15,2) DEFAULT 0.00,
  \`spent_amount\` DECIMAL(15,2) DEFAULT 0.00,
  \`start_date\` VARCHAR(64) DEFAULT NULL,
  \`status\` VARCHAR(64) DEFAULT 'Active',
  \`remarks\` TEXT DEFAULT NULL,
  \`created_at\` VARCHAR(64) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`;
    if (dbData.pilot_projects && dbData.pilot_projects.length > 0) {
      sql += `-- Dumping data for table \`pilot_projects\`\n`;
      dbData.pilot_projects.forEach((p) => {
        sql += `INSERT INTO \`pilot_projects\` (\`id\`, \`challan_no\`, \`level\`, \`institution_name\`, \`district\`, \`upazila\`, \`eiin\`, \`code_no\`, \`coordinator_name\`, \`contact_number\`, \`student_count\`, \`allocated_budget\`, \`spent_amount\`, \`start_date\`, \`status\`, \`remarks\`, \`created_at\`) VALUES (${escapeSqlString(p.id || p._id || `pilot_${Math.random()}`)}, ${escapeSqlString(p.challanNo)}, ${escapeSqlString(p.level || 'primary')}, ${escapeSqlString(p.institutionName)}, ${escapeSqlString(p.district)}, ${escapeSqlString(p.upazila)}, ${escapeSqlString(p.eiin)}, ${escapeSqlString(p.codeNo)}, ${escapeSqlString(p.coordinatorName)}, ${escapeSqlString(p.contactNumber)}, ${escapeSqlString(p.studentCount)}, ${Number(p.allocatedBudget) || 0}, ${Number(p.spentAmount) || 0}, ${escapeSqlString(p.startDate)}, ${escapeSqlString(p.status || 'Active')}, ${escapeSqlString(p.remarks)}, ${escapeSqlString(p.createdAt)});\n`;
      });
      sql += `\n`;
    }

    // 6. Budgets
    sql += `-- --------------------------------------------------------
-- 6. Table structure for table \`budgets\` (বাজেট বিবরণ ও বরাদ্দ)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`budgets\` (
  \`id\` VARCHAR(128) NOT NULL,
  \`sl\` VARCHAR(64) DEFAULT NULL,
  \`budget_code\` VARCHAR(64) DEFAULT NULL,
  \`budget_head\` VARCHAR(255) DEFAULT NULL,
  \`responsible_person\` VARCHAR(255) DEFAULT NULL,
  \`budget_figure\` DECIMAL(15,2) DEFAULT 0.00,
  \`fiscal_year\` VARCHAR(64) DEFAULT '2026-2027',
  \`created_at\` VARCHAR(64) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`;
    if (dbData.budgets && dbData.budgets.length > 0) {
      sql += `-- Dumping data for table \`budgets\`\n`;
      dbData.budgets.forEach((b) => {
        sql += `INSERT INTO \`budgets\` (\`id\`, \`sl\`, \`budget_code\`, \`budget_head\`, \`responsible_person\`, \`budget_figure\`, \`fiscal_year\`, \`created_at\`) VALUES (${escapeSqlString(b.id || b._id || `budget_${Math.random()}`)}, ${escapeSqlString(b.sl)}, ${escapeSqlString(b.budgetCode)}, ${escapeSqlString(b.budgetHead)}, ${escapeSqlString(b.responsiblePerson)}, ${Number(b.budgetFigure) || 0}, ${escapeSqlString(b.fiscalYear || '2026-2027')}, ${escapeSqlString(b.createdAt)});\n`;
      });
      sql += `\n`;
    }

    // 7. Expenses
    sql += `-- --------------------------------------------------------
-- 7. Table structure for table \`expenses\` (ব্যয় ও খরচের এন্ট্রি)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`expenses\` (
  \`id\` VARCHAR(128) NOT NULL,
  \`date\` VARCHAR(64) DEFAULT NULL,
  \`budget_code\` VARCHAR(64) DEFAULT NULL,
  \`type\` VARCHAR(128) DEFAULT NULL,
  \`sub_type\` VARCHAR(128) DEFAULT NULL,
  \`amount\` DECIMAL(15,2) DEFAULT 0.00,
  \`description\` TEXT DEFAULT NULL,
  \`fiscal_year\` VARCHAR(64) DEFAULT NULL,
  \`created_at\` VARCHAR(64) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`;
    if (dbData.expenses && dbData.expenses.length > 0) {
      sql += `-- Dumping data for table \`expenses\`\n`;
      dbData.expenses.forEach((ex) => {
        sql += `INSERT INTO \`expenses\` (\`id\`, \`date\`, \`budget_code\`, \`type\`, \`sub_type\`, \`amount\`, \`description\`, \`fiscal_year\`, \`created_at\`) VALUES (${escapeSqlString(ex.id || ex._id || `exp_${Math.random()}`)}, ${escapeSqlString(ex.date)}, ${escapeSqlString(ex.budgetCode)}, ${escapeSqlString(ex.type)}, ${escapeSqlString(ex.subType)}, ${Number(ex.amount) || 0}, ${escapeSqlString(ex.description)}, ${escapeSqlString(ex.fiscalYear)}, ${escapeSqlString(ex.createdAt)});\n`;
      });
      sql += `\n`;
    }

    // 8. Admin Users & Permissions
    sql += `-- --------------------------------------------------------
-- 8. Table structure for table \`admin_users\` (ব্যবহারকারী ও অনুমতি)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`admin_users\` (
  \`id\` VARCHAR(128) NOT NULL,
  \`username\` VARCHAR(128) DEFAULT NULL,
  \`email\` VARCHAR(255) DEFAULT NULL,
  \`display_name\` VARCHAR(255) DEFAULT NULL,
  \`designation\` VARCHAR(255) DEFAULT NULL,
  \`role\` VARCHAR(64) DEFAULT 'Contributor',
  \`status\` VARCHAR(64) DEFAULT 'Active',
  \`created_at\` VARCHAR(64) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`;
    const userRecords = dbData.admin_users.length > 0 ? dbData.admin_users : dbData.users;
    if (userRecords && userRecords.length > 0) {
      sql += `-- Dumping data for table \`admin_users\`\n`;
      userRecords.forEach((u) => {
        sql += `INSERT INTO \`admin_users\` (\`id\`, \`username\`, \`email\`, \`display_name\`, \`designation\`, \`role\`, \`status\`, \`created_at\`) VALUES (${escapeSqlString(u.id || u._id || `user_${Math.random()}`)}, ${escapeSqlString(u.username || u.email)}, ${escapeSqlString(u.email)}, ${escapeSqlString(u.displayName)}, ${escapeSqlString(u.designation)}, ${escapeSqlString(u.role || 'Contributor')}, ${escapeSqlString(u.status || 'Active')}, ${escapeSqlString(u.createdAt)});\n`;
      });
      sql += `\n`;
    }

    // 9. Dropdown options & activity logs
    sql += `-- --------------------------------------------------------
-- 9. Table structure for table \`memo_dropdown_options\`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`memo_dropdown_options\` (
  \`id\` VARCHAR(128) NOT NULL,
  \`field_type\` VARCHAR(64) DEFAULT NULL,
  \`option_value\` VARCHAR(255) DEFAULT NULL,
  \`order_index\` INT DEFAULT 0,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`;
    if (dbData.memo_dropdown_options && dbData.memo_dropdown_options.length > 0) {
      sql += `-- Dumping data for table \`memo_dropdown_options\`\n`;
      dbData.memo_dropdown_options.forEach((opt, idx) => {
        sql += `INSERT INTO \`memo_dropdown_options\` (\`id\`, \`field_type\`, \`option_value\`, \`order_index\`) VALUES (${escapeSqlString(opt.id || `opt_${idx}`)}, ${escapeSqlString(opt.fieldType || opt.type)}, ${escapeSqlString(opt.optionValue || opt.value)}, ${idx});\n`;
      });
      sql += `\n`;
    }

    sql += `-- --------------------------------------------------------
-- 10. Table structure for table \`activity_logs\`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS \`activity_logs\` (
  \`id\` VARCHAR(128) NOT NULL,
  \`user_name\` VARCHAR(255) DEFAULT NULL,
  \`user_email\` VARCHAR(255) DEFAULT NULL,
  \`action_type\` VARCHAR(128) DEFAULT NULL,
  \`description\` TEXT DEFAULT NULL,
  \`module\` VARCHAR(128) DEFAULT NULL,
  \`timestamp\` VARCHAR(64) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`;
    if (dbData.activity_logs && dbData.activity_logs.length > 0) {
      sql += `-- Dumping data for table \`activity_logs\`\n`;
      dbData.activity_logs.forEach((log, idx) => {
        sql += `INSERT INTO \`activity_logs\` (\`id\`, \`user_name\`, \`user_email\`, \`action_type\`, \`description\`, \`module\`, \`timestamp\`) VALUES (${escapeSqlString(log.id || `log_${idx}`)}, ${escapeSqlString(log.userName)}, ${escapeSqlString(log.userEmail)}, ${escapeSqlString(log.actionType)}, ${escapeSqlString(log.description)}, ${escapeSqlString(log.module)}, ${escapeSqlString(log.timestamp)});\n`;
      });
      sql += `\n`;
    }

    sql += `SET FOREIGN_KEY_CHECKS=1;
COMMIT;
-- Export completed successfully!
`;
    return sql;
  };

  // Download SQL (.sql) Dump File for cPanel / phpMyAdmin
  const handleDownloadSQL = () => {
    setIsExportingSql(true);
    try {
      const sqlContent = generateSQLDumpString();
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
      const timestampStr = now.toISOString().replace(/[:.]/g, '-').slice(11, 19);

      const blob = new Blob([sqlContent], { type: 'application/sql;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BSK_MySQL_Database_Dump_${dateStr}_${timestampStr}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Error creating SQL dump:", err);
      alert("SQL ফাইল তৈরি করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setIsExportingSql(false);
    }
  };

  const handleCopySQL = () => {
    try {
      const sqlContent = generateSQLDumpString();
      navigator.clipboard.writeText(sqlContent);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } catch (e) {
      console.error("Failed to copy SQL:", e);
    }
  };

  const handleCopyJSON = () => {
    try {
      const fullDatabasePayload = {
        metadata: {
          project: 'BSK Enterprise Portal Database Backup',
          exportedAt: new Date().toISOString(),
          exportedBy: userProfile?.displayName || userProfile?.email || 'Administrator',
          totalRecords: totalRecordCount
        },
        collections: dbData
      };
      navigator.clipboard.writeText(JSON.stringify(fullDatabasePayload, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch (e) {
      console.error("Failed to copy JSON:", e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" id="database-backup-modal">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-scale-up">
        
        {/* Header */}
        <div className="bg-[#0A111E] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#cca355]">
              <Database size={22} />
            </div>
            <div>
              <h3 className="font-black text-base tracking-wide flex items-center gap-2">
                <span>সম্পূর্ণ ডাটাবেজ ব্যাকআপ ও SQL এক্সপোর্ট</span>
                <span className="bg-[#cca355] text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                  cPanel / MySQL Ready
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Download MySQL (.sql), JSON & Multi-Sheet Excel Database Archives for your cPanel & Hosting
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-900 px-6 pt-2 border-b border-slate-800 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('download')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'download'
                ? 'bg-slate-50 text-slate-900 border-t-2 border-[#cca355]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Download size={15} className={activeTab === 'download' ? 'text-[#cca355]' : ''} />
            <span>ডাউনলোড ও ব্যাকআপ ফাইল</span>
          </button>
          
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-slate-50 text-slate-900 border-t-2 border-[#cca355]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Code2 size={15} className={activeTab === 'preview' ? 'text-[#cca355]' : ''} />
            <span>লাইভ SQL কোড ও ডাটা প্রিভিউ (INSERT কুয়েরি)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left bg-slate-50/50">
          
          {errorMsg && (
            <div className="bg-red-50 text-red-700 text-xs px-4 py-3 rounded-xl border border-red-200 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Database Status Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-inner">
                <HardDrive size={28} />
              </div>
              <div>
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                  লাইভ ডাটাবেজ স্ট্যাটাস
                </span>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight">
                  {toBengaliNumerals(totalRecordCount)} টি মোট রেকর্ড সংরক্ষিত
                </h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>সংযুক্ত: Cloud Firestore Database (default)</span>
                  {lastBackupTime && (
                    <>
                      <span>•</span>
                      <span>আপডেট: {lastBackupTime}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchFullDatabase}
                disabled={isLoading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-200 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                <span>{isLoading ? 'ডাটা সিঙ্ক হচ্ছে...' : 'রিফ্রেশ ডাটা'}</span>
              </button>
            </div>
          </div>

          {activeTab === 'preview' ? (
            /* TAB 2: LIVE SQL CODE VIEWER WITH FULL INSERT QUERIES */
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Code2 size={18} className="text-[#cca355]" />
                    <span>জেনারেট হওয়া রিয়েল MySQL (.sql) কোড</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    নিচে আপনার ডাটাবেজের সম্পূর্ণ <code className="text-blue-600 font-mono font-bold">CREATE TABLE</code> এবং <code className="text-emerald-600 font-mono font-bold">INSERT INTO</code> লাইনগুলো সরাসরি প্রিভিউ করা হয়েছে:
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button
                    onClick={handleCopySQL}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {copiedSql ? (
                      <>
                        <CheckCheck size={15} className="text-emerald-400" />
                        <span>SQL কোড কপি হয়েছে!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={15} />
                        <span>সম্পূর্ণ SQL কোড কপি করুন</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadSQL}
                    disabled={isExportingSql}
                    className="px-4 py-2 bg-[#cca355] hover:bg-[#b58f47] text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download size={15} />
                    <span>ডাউনলোড .sql</span>
                  </button>
                </div>
              </div>

              {/* SQL Code Box */}
              <div className="relative rounded-2xl border border-slate-800 bg-[#0c1626] text-slate-200 overflow-hidden shadow-xl font-mono text-xs">
                <div className="bg-[#070e1a] px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
                    <span className="text-[11px] font-bold text-slate-400 ml-2 font-mono">
                      BSK_MySQL_Database_Live_Dump.sql
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    utf8mb4_unicode_ci
                  </span>
                </div>

                <div className="p-4 max-h-[420px] overflow-y-auto font-mono text-xs leading-relaxed select-text space-y-1">
                  <pre className="text-emerald-400 whitespace-pre-wrap">
                    {generateSQLDumpString()}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 1: DOWNLOAD CARDS & CPANEL GUIDE */
            <>
              {/* 3 Download Action Cards: SQL (Primary for cPanel), JSON, Excel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. MySQL .SQL Card (Featured for cPanel Hosting) */}
                <div className="bg-gradient-to-br from-[#0c1f38] via-[#091528] to-slate-900 rounded-2xl p-5 text-white border-2 border-[#cca355] shadow-lg flex flex-col justify-between hover:shadow-xl transition relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-[#cca355] text-slate-950 font-black text-[9px] px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
                    cPanel / phpMyAdmin
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-[#cca355] flex items-center justify-center border border-amber-500/40">
                        <Server size={18} />
                      </div>
                      <span className="text-[10px] font-black bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-400/30">
                        MySQL / MariaDB
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-white">
                      MySQL ডাটাবেজ (.sql) ডাম্প
                    </h4>
                    <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                      cPanel এর phpMyAdmin-এ সরাসরি Import করার জন্য পূর্ণাঙ্গ টেবিল স্কিমা (`CREATE TABLE`) ও সব রিয়েল ডাটা (`INSERT INTO`) ফাইল।
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                    <button
                      onClick={handleDownloadSQL}
                      disabled={isExportingSql || isLoading}
                      className="flex-1 py-2.5 px-3 bg-[#cca355] hover:bg-[#b58f47] text-slate-950 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                      id="download-mysql-sql-btn"
                    >
                      <Download size={15} />
                      <span>{isExportingSql ? 'তৈরি হচ্ছে...' : 'ডাউনলোড .sql ফাইল'}</span>
                    </button>
                    <button
                      onClick={handleCopySQL}
                      title="Copy SQL Query text to clipboard"
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition cursor-pointer"
                    >
                      {copiedSql ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                    </button>
                  </div>
                </div>

                {/* 2. JSON Backup Button Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white border border-slate-700 shadow-md flex flex-col justify-between hover:border-amber-500/50 transition">
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-[#cca355] flex items-center justify-center border border-amber-500/30">
                        <FileCode size={18} />
                      </div>
                      <span className="text-[10px] font-black bg-amber-500/20 text-[#cca355] px-2 py-0.5 rounded border border-amber-500/30">
                        JSON Dump
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-white">
                      সম্পূর্ণ JSON ডাটাবেজ
                    </h4>
                    <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                      সব কালেকশনের মূল অবজেক্ট, ডকুমেন্ট আইডি ও মেটাডাটা সহ সম্পূর্ণ JSON ব্যাকআপ আর্কাইভ।
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-700/60">
                    <button
                      onClick={handleDownloadJSON}
                      disabled={isExportingJson || isLoading}
                      className="flex-1 py-2.5 px-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                    >
                      <Download size={15} />
                      <span>{isExportingJson ? 'ডাউনলোড হচ্ছে...' : 'ডাউনলোড .json'}</span>
                    </button>
                    <button
                      onClick={handleCopyJSON}
                      title="Copy JSON text to clipboard"
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-600 transition cursor-pointer"
                    >
                      {copiedJson ? <CheckCircle size={15} className="text-emerald-400" /> : <Copy size={15} />}
                    </button>
                  </div>
                </div>

                {/* 3. Excel Backup Button Card */}
                <div className="bg-gradient-to-br from-emerald-950 to-teal-950 rounded-2xl p-5 text-white border border-emerald-700 shadow-md flex flex-col justify-between hover:border-emerald-400/50 transition">
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
                        <FileSpreadsheet size={18} />
                      </div>
                      <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                        Multi-Sheet
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-white">
                      মাল্টি-শীট এক্সেল ব্যাকআপ
                    </h4>
                    <p className="text-[11px] text-emerald-100 font-medium leading-relaxed">
                      ফাইল, মেমো, কর্মচারী, অনুমোদনপত্র ও পাইলট প্রকল্পের সকল ডাটা আলাদা আলাদা এক্সেল শিটে সাজানো।
                    </p>
                  </div>

                  <div className="pt-3 border-t border-emerald-800/80">
                    <button
                      onClick={handleDownloadExcel}
                      disabled={isExportingExcel || isLoading}
                      className="w-full py-2.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                    >
                      <Download size={15} />
                      <span>{isExportingExcel ? 'তৈরি হচ্ছে...' : 'ডাউনলোড .xlsx'}</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* cPanel phpMyAdmin Setup Instructions Accordion */}
              <div className="bg-blue-50/70 rounded-2xl border border-blue-200 overflow-hidden text-left">
                <button
                  onClick={() => setShowCpanelGuide(!showCpanelGuide)}
                  className="w-full px-5 py-3.5 flex items-center justify-between font-bold text-xs text-blue-950 hover:bg-blue-100/50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <HelpCircle size={17} className="text-blue-600" />
                    <span>cPanel-এ কিভাবে এই SQL ডাটাবেজ আপলোড ও সেটআপ করবেন? (গাইড)</span>
                  </div>
                  <span className="text-blue-600 font-black text-xs">
                    {showCpanelGuide ? 'গাইড লুকান ▲' : 'গাইড দেখুন ▼'}
                  </span>
                </button>

                {showCpanelGuide && (
                  <div className="px-5 pb-5 pt-2 text-xs text-blue-900 border-t border-blue-200/60 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 bg-white rounded-xl border border-blue-100 shadow-2xs">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center mb-1.5">
                          ১
                        </div>
                        <p className="font-bold text-slate-900">cPanel-এ ডাটাবেজ তৈরি:</p>
                        <p className="text-slate-600 text-[11px] mt-0.5">
                          cPanel লগইন করে <strong>MySQL Databases</strong>-এ যান। একটি নতুন ডাটাবেজ এবং ইউজার তৈরি করে ইউজারের সকল প্রিভিলেজ (All Privileges) অ্যাসাইন করুন।
                        </p>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-blue-100 shadow-2xs">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center mb-1.5">
                          ২
                        </div>
                        <p className="font-bold text-slate-900">phpMyAdmin-এ Import:</p>
                        <p className="text-slate-600 text-[11px] mt-0.5">
                          cPanel থেকে <strong>phpMyAdmin</strong> ওপেন করুন। বাম পাশ থেকে আপনার তৈরি করা ডাটাবেজ সিলেক্ট করে উপরের <strong>"Import"</strong> ট্যাবে ক্লিক করুন।
                        </p>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-blue-100 shadow-2xs">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center mb-1.5">
                          ৩
                        </div>
                        <p className="font-bold text-slate-900">SQL ফাইল আপলোড:</p>
                        <p className="text-slate-600 text-[11px] mt-0.5">
                          ডাউনলোড করা <strong>.sql</strong> ফাইলটি সিলেক্ট করে নিচে <strong>"Go" / "Import"</strong> চাপুন। সকল ১০টি টেবিল ও সব ডাটা কয়েক সেকেন্ডে লোড হয়ে যাবে!
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Collection-by-Collection Breakdown */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Layers size={16} className="text-[#cca355]" />
                    <span>কালেকশন ভিত্তিক এন্ট্রি সংখ্যা বিবরণী</span>
                  </h4>
                  <span className="text-xs font-bold text-slate-500">
                    মোট ১০টি বিভাগ
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stats.map((col) => (
                    <div 
                      key={col.id}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/70 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{col.icon}</span>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            {col.nameBn}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {col.id}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-800 shadow-2xs font-mono">
                        {toBengaliNumerals(col.count)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security & Integrity Note */}
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200/80 flex items-start gap-3">
                <ShieldCheck size={20} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-900 leading-relaxed font-medium">
                  <p className="font-bold text-amber-950 mb-0.5">ডাটাবেজ ব্যাকআপ ও নিরাপত্তা তথ্য:</p>
                  এই SQL ব্যাকআপ ফাইলে বর্তমান ক্লাউড ডাটাবেজের সকল এন্ট্রি UTF-8 (`utf8mb4_unicode_ci`) এনকোডিংয়ে প্রস্তুত করা হয়েছে, যাতে বাংলা লেখা ও তারিখ নিখুঁতভাবে cPanel MySQL/MariaDB ডাটাবেজে কাজ করে।
                </div>
              </div>
            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            © {new Date().getFullYear()} Bishwa Sahittya Kendra Enterprise Portal
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
}
