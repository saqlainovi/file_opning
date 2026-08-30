import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  setDoc,
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Plus, 
  Search, 
  Printer, 
  Edit2, 
  Trash2, 
  Eye, 
  X, 
  FileText, 
  Calendar, 
  Check, 
  Building2, 
  Receipt,
  Copy,
  Zap,
  Settings,
  Download,
  FileSpreadsheet,
  Filter,
  CalendarRange,
  RotateCcw,
  ChevronDown,
  ArrowUpDown,
  CheckCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { DailyExpenseApprovalEntry, DailyExpenseItem, UserProfile } from '../types';
import { INITIAL_BUDGET_DATA } from '../budgetData';
import { numberToBengaliWords, toBengaliNumerals, formatDateToDDMMYYYY, formatBengaliDateDDMMYYYY } from '../utils/bengaliToWords';

const BENGALI_MONTHS: { value: string; name: string; enName: string }[] = [
  { value: '01', name: 'জানুয়ারি', enName: 'January' },
  { value: '02', name: 'ফেব্রুয়ারি', enName: 'February' },
  { value: '03', name: 'মার্চ', enName: 'March' },
  { value: '04', name: 'এপ্রিল', enName: 'April' },
  { value: '05', name: 'মে', enName: 'May' },
  { value: '06', name: 'জুন', enName: 'June' },
  { value: '07', name: 'জুলাই', enName: 'July' },
  { value: '08', name: 'আগস্ট', enName: 'August' },
  { value: '09', name: 'সেপ্টেম্বর', enName: 'September' },
  { value: '10', name: 'অক্টোবর', enName: 'October' },
  { value: '11', name: 'নভেম্বর', enName: 'November' },
  { value: '12', name: 'ডিসেম্বর', enName: 'December' },
];

const formatYearMonthBengali = (ym: string) => {
  if (!ym || !ym.includes('-')) return ym;
  const [year, month] = ym.split('-');
  const found = BENGALI_MONTHS.find(m => m.value === month);
  const mName = found ? found.name : month;
  return `${mName} ${toBengaliNumerals(year)}`;
};

interface DailyExpenseApprovalProps {
  userProfile: UserProfile | null;
  hasActionAccess?: (section: any, action: 'create' | 'edit' | 'delete') => boolean;
  logAction?: (action: string, details: string) => void;
  budgets?: any[];
}

export default function DailyExpenseApproval({ userProfile, hasActionAccess, logAction, budgets = [] }: DailyExpenseApprovalProps) {
  const [approvals, setApprovals] = useState<DailyExpenseApprovalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Advanced Filtering & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'month' | 'range' | 'single'>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [budgetHeadFilter, setBudgetHeadFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'entry' | 'date_desc' | 'date_asc' | 'amount_desc'>('entry');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; name: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [printingEntries, setPrintingEntries] = useState<DailyExpenseApprovalEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Local Direct Print Agent States
  const [agentStatus, setAgentStatus] = useState<'idle' | 'checking' | 'connected' | 'disconnected'>('idle');
  const [agentMessage, setAgentMessage] = useState('');
  const [isAgentPrinting, setIsAgentPrinting] = useState(false);
  const [agentPrinterName, setAgentPrinterName] = useState('HP LaserJet Pro M404dn');

  // Form states
  const [applicantName, setApplicantName] = useState(userProfile?.displayName || '');
  const [department, setDepartment] = useState('প্রশাসন বিভাগ');
  const [budgetHead, setBudgetHead] = useState('');
  const [reqDate, setReqDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<DailyExpenseItem[]>([
    { sl: 1, description: '', estimatedExpense: '' },
    { sl: 2, description: '', estimatedExpense: '' },
    { sl: 3, description: '', estimatedExpense: '' }
  ]);
  const [totalInWords, setTotalInWords] = useState('');
  const [isManualWords, setIsManualWords] = useState(false);
  const [isCustomBudgetHead, setIsCustomBudgetHead] = useState(false);
  const [formError, setFormError] = useState('');

  const uniqueBudgetOptions = React.useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(budgets)) {
      budgets.forEach((b: any) => {
        if (b.budgetHead && typeof b.budgetHead === 'string' && b.budgetHead.trim()) {
          set.add(b.budgetHead.trim());
        }
      });
    }
    INITIAL_BUDGET_DATA.forEach((b) => {
      if (b.budgetHead) {
        set.add(b.budgetHead.trim());
      }
    });
    return Array.from(set);
  }, [budgets]);

  // Sync from Firestore with robust local storage engine
  useEffect(() => {
    setLoading(true);

    const CACHE_KEY = 'cached_daily_expense_approvals_v2';
    const DELETED_KEY = 'deleted_daily_expense_approvals_v2';

    // Helper to get local cache
    const getLocalCache = (): DailyExpenseApprovalEntry[] => {
      try {
        const cached = localStorage.getItem(CACHE_KEY) || localStorage.getItem('cached_daily_expense_approvals');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {
        console.error("Failed to parse cached approvals:", e);
      }
      return [];
    };

    // Helper to get deleted IDs list
    const getDeletedIds = (): string[] => {
      try {
        const delRaw2 = localStorage.getItem(DELETED_KEY);
        const delRaw1 = localStorage.getItem('deleted_daily_expense_approvals');
        const list2: string[] = delRaw2 ? JSON.parse(delRaw2) : [];
        const list1: string[] = delRaw1 ? JSON.parse(delRaw1) : [];
        return Array.from(new Set([...(Array.isArray(list2) ? list2 : []), ...(Array.isArray(list1) ? list1 : [])]));
      } catch (e) {}
      return [];
    };

    const DEFAULT_MOCK_ENTRY: DailyExpenseApprovalEntry = {
      id: 'sample-approval-demo-1',
      slNo: '001',
      applicantName: userProfile?.displayName || 'লিহা আক্তার',
      department: 'প্রশাসন বিভাগ',
      budgetHead: 'অফিস স্টেশনারী ও জরুরি খরচা',
      date: new Date().toISOString().split('T')[0],
      items: [
        { sl: 1, description: 'জরুরি দাপ্তরিক ফাইল ও কভার পেপার ক্রয়', estimatedExpense: '১২৫০' },
        { sl: 2, description: 'HP প্রিন্টার টোনার কার্টিজ সার্ভিসিং ও পেপার ফিডিং রিফেসিং', estimatedExpense: '৭৫০' }
      ],
      totalAmount: 2000,
      totalInWords: 'দুই হাজার টাকা মাত্র',
      createdAt: new Date().toISOString(),
      createdBy: 'system-demo-user',
      createdByName: userProfile?.displayName || 'লিহা আক্তার',
      createdByEmail: userProfile?.email || 'admin@bskbd.org'
    };

    const sortByEntryOrder = (list: any[]) => {
      return list.sort((a, b) => {
        const getT = (item: any) => {
          if (!item) return 0;
          if (item.createdAt) {
            if (typeof item.createdAt.toDate === 'function') return item.createdAt.toDate().getTime();
            const t = new Date(item.createdAt).getTime();
            if (!isNaN(t)) return t;
          }
          if (item.updatedAt) {
            const t = new Date(item.updatedAt).getTime();
            if (!isNaN(t)) return t;
          }
          const num = parseInt(item.slNo, 10);
          return isNaN(num) ? 0 : num;
        };
        return getT(b) - getT(a);
      });
    };

    // Load local cache immediately so UI shows instantly
    const initialLocal = getLocalCache();
    const deletedIds = getDeletedIds();
    let validInitial = initialLocal.filter(item => item && item.id && !deletedIds.includes(item.id));
    
    if (validInitial.length === 0 && !deletedIds.includes(DEFAULT_MOCK_ENTRY.id)) {
      validInitial = [DEFAULT_MOCK_ENTRY];
    }
    setApprovals(sortByEntryOrder(validInitial));
    setLoading(false);

    // Subscribe to Firestore daily_expense_v2 collection
    const q = query(collection(db, 'daily_expense_v2'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreList: DailyExpenseApprovalEntry[] = [];
      snapshot.forEach((docSnap) => {
        firestoreList.push({ id: docSnap.id, ...docSnap.data() } as DailyExpenseApprovalEntry);
      });

      const currentDeleted = getDeletedIds();
      const currentCache = getLocalCache();

      // Filter out deleted items
      const validFirestore = firestoreList.filter(item => item && item.id && !currentDeleted.includes(item.id));
      const firestoreMap = new Map<string, DailyExpenseApprovalEntry>();
      validFirestore.forEach(item => firestoreMap.set(item.id, item));

      // Preserve local items that haven't synced to Firestore yet
      const mergedList: DailyExpenseApprovalEntry[] = [...validFirestore];
      
      currentCache.forEach(localItem => {
        if (localItem && localItem.id && !currentDeleted.includes(localItem.id) && !firestoreMap.has(localItem.id)) {
          mergedList.push(localItem);
        }
      });

      if (mergedList.length === 0 && !currentDeleted.includes(DEFAULT_MOCK_ENTRY.id)) {
        mergedList.push(DEFAULT_MOCK_ENTRY);
      }

      // Sort by entry order instead of date descending by default
      const sortedList = sortByEntryOrder(mergedList);

      setApprovals(sortedList);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(sortedList));
      } catch (e) {
        console.error("Local storage error:", e);
      }
    }, (error) => {
      console.warn("Firestore notice for daily_expense_v2:", error);
      // Fallback to local cache if Firestore errors out (e.g. quota exceeded)
      let cached = getLocalCache().filter(item => item && item.id && !getDeletedIds().includes(item.id));
      if (cached.length === 0 && !getDeletedIds().includes(DEFAULT_MOCK_ENTRY.id)) {
        cached = [DEFAULT_MOCK_ENTRY];
      }
      setApprovals(cached);
    });

    return () => unsubscribe();
  }, []);

  // Update default applicant name if profile updates
  useEffect(() => {
    if (userProfile?.displayName && !applicantName) {
      setApplicantName(userProfile.displayName);
    }
  }, [userProfile]);

  // Calculate total amount
  const calculateTotal = (itemList: DailyExpenseItem[]) => {
    return itemList.reduce((sum, item) => {
      const val = typeof item.estimatedExpense === 'number' 
        ? item.estimatedExpense 
        : parseFloat(item.estimatedExpense) || 0;
      return sum + val;
    }, 0);
  };

  const currentTotal = calculateTotal(items);

  // Auto update Bengali words if not manually overridden
  useEffect(() => {
    if (!isManualWords) {
      setTotalInWords(numberToBengaliWords(currentTotal));
    }
  }, [currentTotal, isManualWords]);

  // Add Item Row
  const handleAddItem = () => {
    setItems(prev => [
      ...prev, 
      { sl: prev.length + 1, description: '', estimatedExpense: '' }
    ]);
  };

  // Remove Item Row
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    const updated = items.filter((_, i) => i !== index).map((item, idx) => ({
      ...item,
      sl: idx + 1
    }));
    setItems(updated);
  };

  // Update Item field
  const handleItemChange = (index: number, field: 'description' | 'estimatedExpense', value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingId(null);
    setApplicantName(userProfile?.displayName || '');
    setDepartment('প্রশাসন বিভাগ');
    setBudgetHead('');
    setIsCustomBudgetHead(false);
    setReqDate(new Date().toISOString().split('T')[0]);
    setItems([
      { sl: 1, description: '', estimatedExpense: '' },
      { sl: 2, description: '', estimatedExpense: '' },
      { sl: 3, description: '', estimatedExpense: '' }
    ]);
    setIsManualWords(false);
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (entry: DailyExpenseApprovalEntry) => {
    setEditingId(entry.id);
    setApplicantName(entry.applicantName || '');
    setDepartment(entry.department || 'প্রশাসন বিভাগ');
    const head = entry.budgetHead || '';
    setBudgetHead(head);
    setIsCustomBudgetHead(Boolean(head && !uniqueBudgetOptions.includes(head)));
    setReqDate(entry.date || new Date().toISOString().split('T')[0]);
    setItems(entry.items && entry.items.length > 0 ? entry.items : [
      { sl: 1, description: '', estimatedExpense: '' }
    ]);
    setTotalInWords(entry.totalInWords || '');
    setIsManualWords(true);
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Save Approval Requisition
  const handleSaveApproval = async () => {
    const finalApplicantName = applicantName.trim() || userProfile?.displayName || 'আবেদনকারী';
    const finalDepartment = department.trim() || 'প্রশাসন বিভাগ';
    const finalBudgetHead = budgetHead.trim() || 'সাধারণ ব্যয়';

    // Ensure at least one item has description or amount
    let validItems = items.filter(it => it.description.trim() !== '' || (it.estimatedExpense !== '' && Number(it.estimatedExpense) > 0));
    if (validItems.length === 0) {
      validItems = [{ sl: 1, description: 'দৈনন্দিন জরুরি খরচ', estimatedExpense: 0 }];
    }

    const totalVal = calculateTotal(validItems);
    const finalWords = totalInWords.trim() || numberToBengaliWords(totalVal);

    // Pre-allocate real Firestore doc ID if creating new
    const targetDocRef = editingId ? doc(db, 'daily_expense_v2', editingId) : doc(collection(db, 'daily_expense_v2'));
    const targetId = targetDocRef.id;

    const payload = {
      slNo: String(approvals.length + 1).padStart(3, '0'),
      applicantName: finalApplicantName,
      department: finalDepartment,
      budgetHead: finalBudgetHead,
      date: reqDate || new Date().toISOString().split('T')[0],
      items: validItems.map((it, idx) => ({
        sl: idx + 1,
        description: it.description.trim() || 'জরুরি বিবরণ',
        estimatedExpense: Number(it.estimatedExpense) || 0
      })),
      totalAmount: totalVal,
      totalInWords: finalWords,
      status: 'pending' as const,
      updatedAt: new Date().toISOString(),
      createdBy: userProfile?.uid || 'anonymous',
      createdByName: userProfile?.displayName || 'Unknown',
      createdByEmail: userProfile?.email || 'N/A'
    };

    const newEntry: DailyExpenseApprovalEntry = {
      id: targetId,
      ...payload
    };

    // Remove from deleted list if re-saved
    try {
      const delRaw2 = localStorage.getItem('deleted_daily_expense_approvals_v2');
      const delRaw1 = localStorage.getItem('deleted_daily_expense_approvals');
      const list2: string[] = delRaw2 ? JSON.parse(delRaw2) : [];
      const list1: string[] = delRaw1 ? JSON.parse(delRaw1) : [];
      localStorage.setItem('deleted_daily_expense_approvals_v2', JSON.stringify(list2.filter(i => i !== targetId)));
      localStorage.setItem('deleted_daily_expense_approvals', JSON.stringify(list1.filter(i => i !== targetId)));
    } catch(e) {}

    // 1. Immediately update React state & localStorage
    setApprovals(prev => {
      let updated: DailyExpenseApprovalEntry[];
      if (editingId) {
        updated = prev.map(a => a.id === editingId ? newEntry : a);
      } else {
        updated = [newEntry, ...prev];
      }
      try {
        localStorage.setItem('cached_daily_expense_approvals_v2', JSON.stringify(updated));
        localStorage.setItem('cached_daily_expense_approvals', JSON.stringify(updated));
      } catch (e) {
        console.error("Local storage save error:", e);
      }
      return updated;
    });

    // 2. Immediately close modal & clear errors
    setIsCreateModalOpen(false);
    setFormError('');

    // 3. Asynchronously sync to Firestore in background
    (async () => {
      try {
        await setDoc(targetDocRef, {
          ...payload,
          createdAt: serverTimestamp()
        }, { merge: true });

        if (logAction) {
          logAction(
            editingId ? 'EXPENSE_APPROVAL_UPDATE' : 'EXPENSE_APPROVAL_CREATE', 
            `${editingId ? 'Updated' : 'Created'} expense approval: ${finalApplicantName} - Tk ${totalVal}`
          );
        }
      } catch (err) {
        console.warn("Notice: Saved locally, Firestore background sync:", err);
      }
    })();
  };

  // Open Delete Confirmation Modal
  const handleDelete = (id: string, name: string) => {
    setDeleteConfirmTarget({ id, name });
  };

  // Perform actual deletion when user confirms in modal
  const confirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    const { id, name } = deleteConfirmTarget;
    setDeleteConfirmTarget(null);

    // 1. Track deleted ID in localStorage immediately so snapshot listener won't restore it
    try {
      const delRaw2 = localStorage.getItem('deleted_daily_expense_approvals_v2');
      const delRaw1 = localStorage.getItem('deleted_daily_expense_approvals');
      const list2: string[] = delRaw2 ? JSON.parse(delRaw2) : [];
      const list1: string[] = delRaw1 ? JSON.parse(delRaw1) : [];
      if (!list2.includes(id)) list2.push(id);
      if (!list1.includes(id)) list1.push(id);
      localStorage.setItem('deleted_daily_expense_approvals_v2', JSON.stringify(list2));
      localStorage.setItem('deleted_daily_expense_approvals', JSON.stringify(list1));
    } catch(e) {}

    // 2. Update state and local cache immediately
    setApprovals(prev => {
      const updated = prev.filter(a => a.id !== id);
      try {
        localStorage.setItem('cached_daily_expense_approvals_v2', JSON.stringify(updated));
        localStorage.setItem('cached_daily_expense_approvals', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // 3. Delete from Firestore collections
    try {
      await deleteDoc(doc(db, 'daily_expense_v2', id));
    } catch (err) {
      console.warn("Notice deleting approval from daily_expense_v2:", err);
    }
    try {
      await deleteDoc(doc(db, 'daily_expense_approvals', id));
    } catch (err) {
      console.warn("Notice deleting approval from daily_expense_approvals:", err);
    }
    try {
      await deleteDoc(doc(db, 'daily_expense', id));
    } catch (err) {
      console.warn("Notice deleting approval from daily_expense:", err);
    }

    if (logAction) logAction('EXPENSE_APPROVAL_DELETE', `Deleted expense approval ID: ${id}`);
  };

  // Single Slip Component Generator for Print
  const renderSingleSlipHTML = (entry: DailyExpenseApprovalEntry, copyTag: string = '') => {
    const itemsRows = Array.from({ length: 10 }).map((_, index) => {
      const item = entry.items && entry.items[index];
      return `
        <tr style="height: 19px;">
          <td style="border: 1px solid #000; padding: 1px 4px; text-align: center; font-weight: bold; vertical-align: middle !important; height: 19px; line-height: 1.1; font-size: 10.5px;">${toBengaliNumerals(index + 1)}</td>
          <td style="border: 1px solid #000; padding: 1px 6px; text-align: center; vertical-align: middle !important; height: 19px; line-height: 1.1; font-size: 10.5px;">${item ? item.description : ''}</td>
          <td style="border: 1px solid #000; padding: 1px 6px; text-align: center; font-weight: 700; vertical-align: middle !important; height: 19px; line-height: 1.1; font-size: 10.5px;">
            ${item && item.estimatedExpense ? toBengaliNumerals(Number(item.estimatedExpense).toLocaleString()) : ''}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="page-sheet">
        <div style="display: flex; flex-direction: column; flex: 1;">
          <!-- Header -->
          <div class="header">
            <div class="header-logo">
              <img src="https://lh3.googleusercontent.com/d/1x7Fp3Wsk8PqHLmMePPaah1wPdjs4SSvr" alt="BSK Logo" style="height: 34px; width: auto; object-fit: contain;" />
            </div>
            <div style="text-align: right;">
              <div class="dept-title">${entry.department || 'প্রশাসন বিভাগ'}</div>
            </div>
          </div>

          <!-- Document Title -->
          <div class="title-box">
            <span class="doc-title">দৈনন্দিন জরুরি খরচের অনুমোদনপত্র</span>
          </div>

          <!-- Info lines -->
          <div class="info-lines">
            <div class="info-row">
              <span style="font-weight: 800; white-space: nowrap;">আবেদনকারীর নাম:</span>
              <span class="dot-line">${entry.applicantName || ''}</span>
            </div>
            <div style="display: flex; gap: 10px;">
              <div class="info-row" style="flex: 1;">
                <span style="font-weight: 800; white-space: nowrap;">খাতের নাম:</span>
                <span class="dot-line">${entry.budgetHead || ''}</span>
              </div>
              <div class="info-row" style="width: 130px;">
                <span style="font-weight: 800; white-space: nowrap;">তারিখ:</span>
                <span class="dot-line" style="text-align: center;">${formatBengaliDateDDMMYYYY(entry.date || '')}</span>
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <table>
            <thead>
              <tr style="height: 22px;">
                <th style="width: 32px; text-align: center; vertical-align: middle !important;">ক্রম</th>
                <th style="text-align: center; vertical-align: middle !important;">কাজের/ক্রয়ের বিবরণ</th>
                <th style="width: 95px; text-align: center; vertical-align: middle !important;">সম্ভাব্য ব্যয়</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
              <tr class="total-row" style="height: 22px;">
                <td colspan="2" style="padding: 2px 6px; vertical-align: middle !important; height: 22px; line-height: 1.1;">
                  <span style="font-weight: 900; vertical-align: middle; display: inline-block; font-size: 10.5px;">মোট কথায়: </span>
                  <span style="font-weight: 700; margin-left: 4px; vertical-align: middle; display: inline-block; font-size: 10.5px;">${entry.totalInWords || ''}</span>
                </td>
                <td style="padding: 2px 6px; text-align: center; font-size: 11px; font-weight: 900; vertical-align: middle !important; height: 22px; line-height: 1.1;">
                  ৳ ${toBengaliNumerals((entry.totalAmount || 0).toLocaleString())}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Signatures -->
        <div class="signatures">
          <div class="sig-box">আবেদনকারী</div>
          <div class="sig-box">সহ. পরিচালক</div>
          <div class="sig-box">যুগ্ম-পরিচালক</div>
        </div>
      </div>
    `;
  };

  // Standalone HTML Print Generator (Pairs up entries 2 per A4 Landscape sheet)
  const generatePrintHTML = (entriesInput: DailyExpenseApprovalEntry | DailyExpenseApprovalEntry[]) => {
    const entriesList = Array.isArray(entriesInput) ? entriesInput : [entriesInput];

    // Group entries in pairs of 2 for A4 Landscape pages
    const pages: DailyExpenseApprovalEntry[][] = [];
    for (let i = 0; i < entriesList.length; i += 2) {
      pages.push(entriesList.slice(i, i + 2));
    }

    const pagesHTML = pages.map((pair) => {
      const leftEntry = pair[0];
      const rightEntry = pair[1]; // undefined if odd
      const hasRight = !!rightEntry;

      return `
        <div class="page-container">
          <div class="print-wrapper">
            ${renderSingleSlipHTML(leftEntry, '')}
            ${hasRight ? renderSingleSlipHTML(rightEntry, '') : ''}
          </div>
          ${hasRight ? `<div class="cut-line"></div>` : ''}
        </div>
      `;
    }).join('');

    const titleText = entriesList.length === 1 
      ? `দৈনন্দিন অনুমোদনপত্র - ${entriesList[0].applicantName}`
      : `দৈনন্দিন অনুমোদনপত্র (${entriesList.length}টি এন্ট্রি)`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${titleText}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 0;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background-color: #f1f5f9;
            overflow: hidden;
          }
          body {
            font-family: 'SolaimanLipi', 'Siyam Rupali', 'Kalpurush', 'Nikosh', 'Arial', sans-serif;
            color: #000;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding-top: 4mm;
            min-height: 100vh;
            position: relative;
          }
          .page-container {
            position: relative;
            width: 297mm;
            height: 200mm;
            max-height: 200mm;
            overflow: hidden;
            margin-bottom: 20px;
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
            box-sizing: border-box;
          }
          .page-container:last-child {
            page-break-after: auto;
            break-after: auto;
            margin-bottom: 0;
          }
          .print-wrapper {
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            gap: 8mm;
            justify-content: center;
            align-items: flex-start;
            width: 297mm;
            height: 195mm;
            max-height: 195mm;
            margin: 0 auto;
            padding-top: 2mm;
            box-sizing: border-box;
            overflow: hidden;
          }
          .page-sheet {
            width: 138mm;
            height: 188mm;
            max-height: 188mm;
            background: #fff;
            border: 1.5px solid #000;
            padding: 4mm 5mm 5mm 5mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            page-break-inside: avoid;
            break-inside: avoid;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
          }
          .cut-line {
            position: absolute;
            left: 50%;
            top: 4mm;
            bottom: 8mm;
            border-left: 1px dashed #64748b;
          }
          @media print {
            @page {
              size: A4 landscape;
              margin: 0mm;
            }
            html, body {
              width: 297mm !important;
              height: 100% !important;
              max-height: 210mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .no-print-btn, .toolbar {
              display: none !important;
            }
            .page-container {
              width: 297mm !important;
              height: 195mm !important;
              max-height: 195mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
              overflow: hidden !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .page-container:not(:last-child) {
              page-break-after: always !important;
              break-after: page !important;
            }
            .page-container:last-child, .page-container:last-of-type {
              page-break-after: avoid !important;
              break-after: avoid !important;
              page-break-before: avoid !important;
            }
            .print-wrapper {
              width: 297mm !important;
              height: 190mm !important;
              max-height: 190mm !important;
              display: flex !important;
              flex-direction: row !important;
              flex-wrap: nowrap !important;
              justify-content: center !important;
              align-items: flex-start !important;
              gap: 8mm !important;
              margin: 0 auto !important;
              padding-top: 2mm !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .page-sheet {
              width: 138mm !important;
              height: 185mm !important;
              max-height: 185mm !important;
              border: 1.5px solid #000 !important;
              box-shadow: none !important;
              padding: 4mm 5mm 4mm 5mm !important;
              margin: 0 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              box-sizing: border-box !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              overflow: hidden !important;
            }
            .cut-line {
              position: absolute;
              left: 50%;
              top: 4mm;
              bottom: 8mm;
              border-left: 1px dashed #64748b;
            }
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 2px solid #000;
            padding-bottom: 4px;
            margin-bottom: 4px;
          }
          .header-logo {
            display: flex;
            align-items: flex-end;
          }
          .dept-title {
            font-size: 15px;
            font-weight: 900;
            color: #000;
            letter-spacing: 0.5px;
          }
          .title-box {
            text-align: center;
            margin: 6px 0;
          }
          .doc-title {
            font-size: 15px;
            font-weight: 900;
            border-bottom: 2px solid #000;
            display: inline-block;
            padding-bottom: 2px;
            padding-left: 12px;
            padding-right: 12px;
          }
          .info-lines {
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 6px;
          }
          .info-row {
            display: flex;
            align-items: center;
            margin-bottom: 4px;
          }
          .dot-line {
            border-bottom: 1px solid #000;
            flex: 1;
            margin-left: 6px;
            font-weight: 800;
            padding-left: 6px;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-top: 4px;
          }
          th, td {
            border: 1px solid #000;
            vertical-align: middle !important;
          }
          th {
            background-color: #f8fafc;
            padding: 4px;
            font-weight: 900;
            font-size: 11.5px;
            text-align: center;
            vertical-align: middle !important;
          }
          .total-row {
            font-weight: 900;
            background-color: #fafafa;
          }
          .signatures {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            text-align: center;
            font-size: 11.5px;
            font-weight: 900;
            margin-top: auto;
            padding-top: 8px;
          }
          .sig-box {
            border-top: 1px solid #000;
            padding-top: 3px;
          }
          .toolbar {
            position: fixed;
            top: 15px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 999;
          }
          .btn-print {
            background: #059669;
            color: white;
            border: none;
            padding: 10px 18px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
          }
          .btn-print:hover {
            background: #047857;
          }
        </style>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 300);
          };
        </script>
      </head>
      <body>
        <div class="toolbar no-print-btn">
          <button class="btn-print" onclick="window.print()">🖨️ প্রিন্ট করুন (${entriesList.length} টি এন্ট্রি)</button>
        </div>
        ${pagesHTML}
      </body>
      </html>
    `;
  };

  // Check Local Direct Print Agent Connectivity
  const checkAgentConnection = async (): Promise<boolean> => {
    setAgentStatus('checking');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);
      const res = await fetch('http://localhost:9123/status', {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        setAgentStatus('connected');
        if (data.printer) setAgentPrinterName(data.printer);
        setAgentMessage('🟢 লোকাল প্রিন্ট এজেন্ট রানিং আছে!');
        return true;
      }
    } catch (err) {
      console.log('Local print agent not found on port 9123');
    }
    setAgentStatus('disconnected');
    setAgentMessage('🔴 লোকাল প্রিন্ট এজেন্ট বর্তমানে আপনার পিসিতে রানিং নেই');
    return false;
  };

  // Direct Print via Local Print Agent (No Browser Print Dialog)
  const executeDirectAgentPrint = async (entriesInput: DailyExpenseApprovalEntry | DailyExpenseApprovalEntry[]) => {
    setIsAgentPrinting(true);
    const htmlContent = generatePrintHTML(entriesInput);
    const entriesList = Array.isArray(entriesInput) ? entriesInput : [entriesInput];

    const isConnected = await checkAgentConnection();
    if (!isConnected) {
      setIsAgentPrinting(false);
      setIsAgentModalOpen(true);
      return;
    }

    try {
      const res = await fetch('http://localhost:9123/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: htmlContent,
          printer: agentPrinterName,
          title: entriesList.length === 1 
            ? `দৈনন্দিন অনুমোদনপত্র - ${entriesList[0].applicantName}`
            : `দৈনন্দিন অনুমোদনপত্র (${entriesList.length}টি এন্ট্রি)`
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('⚡ সফল হয়েছে! সরাসরি আপনার HP M404dn প্রিন্টারে ডায়ালগ ছাড়াই পাঠানো হয়েছে।');
      } else {
        alert('প্রিন্টারে পাঠাতে সমস্যা হয়েছে: ' + (data.error || 'অজানা সমস্যা'));
      }
    } catch (err: any) {
      alert('লোকাল এজেন্টে পাঠাতে ব্যর্থ হয়েছে। এজেন্ট ব্যাকগ্রাউন্ডে চালু আছে কিনা চেক করুন।');
      setIsAgentModalOpen(true);
    } finally {
      setIsAgentPrinting(false);
    }
  };

  // Download 1-Click Python Direct Print Agent
  const downloadAgentScript = () => {
    const pythonScript = `# BSKBD Direct Print Agent for Windows (HP M404dn & All Printers)
# Listen on http://localhost:9123
import http.server
import socketserver
import json
import tempfile
import os
import subprocess

PORT = 9123

class DirectPrintHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/status':
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = json.dumps({"status": "ok", "agent": "BSKBD Direct Print Agent v1.0", "printer": "HP LaserJet Pro M404dn"})
            self.wfile.write(response.encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == '/print':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                html_content = data.get('html', '')
                
                temp_dir = tempfile.gettempdir()
                html_path = os.path.join(temp_dir, 'bskbd_direct_print.html')
                with open(html_path, 'w', encoding='utf-8') as f:
                    f.write(html_content)
                
                # Silent print command using Edge/Chrome headless
                edge_cmd = f'msedge --headless --disable-gpu --print-to-printer "{html_path}"'
                subprocess.run(edge_cmd, shell=True)
                
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": "Printed directly to HP M404dn"}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))

print("==================================================")
print("⚡ BSKBD Local Direct Print Agent is RUNNING!")
print("   Listening on: http://localhost:9123")
print("   Target Printer: HP LaserJet Pro M404dn")
print("==================================================")
print("Keep this window open while printing.")

try:
    with socketserver.TCPServer(("127.0.0.1", PORT), DirectPrintHandler) as httpd:
        httpd.serve_forever()
except Exception as e:
    print(f"Error starting server: {e}")
    input("Press Enter to exit...")
`;

    const blob = new Blob([pythonScript], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bskbd_print_agent.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download 1-Click Windows Batch Direct Print Agent
  const downloadBatchAgentScript = () => {
    const batContent = `@echo off
title BSKBD Local Direct Print Agent
color 0A
echo ========================================================
echo    BSKBD LOCAL DIRECT PRINT AGENT FOR WINDOWS
echo    HP LaserJet Pro M404dn Direct Printing Engine
echo ========================================================
echo.
echo Starting local print listener on http://localhost:9123 ...
echo.

powershell -ExecutionPolicy Bypass -Command "$listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://localhost:9123/'); $listener.Start(); Write-Host '⚡ Local Agent Active on http://localhost:9123' -ForegroundColor Green; while ($listener.IsListening) { $ctx = $listener.GetContext(); $req = $ctx.Request; $res = $ctx.Response; $res.Headers.Add('Access-Control-Allow-Origin','*'); $res.Headers.Add('Access-Control-Allow-Methods','*'); $res.Headers.Add('Access-Control-Allow-Headers','*'); if ($req.HttpMethod -eq 'OPTIONS') { $res.StatusCode = 200; $res.Close(); continue; } if ($req.Url.AbsolutePath -eq '/status') { $buf = [System.Text.Encoding]::UTF8.GetBytes('{\"status\":\"ok\",\"printer\":\"HP M404dn\"}'); $res.OutputStream.Write($buf,0,$buf.Length); $res.Close(); continue; } if ($req.Url.AbsolutePath -eq '/print') { $reader = New-Object System.IO.StreamReader($req.InputStream); $json = $reader.ReadToEnd() | ConvertFrom-Json; $tmp = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), 'bskbd_print.html'); [System.IO.File]::WriteAllText($tmp, $json.html); Start-Process msedge -ArgumentList '--headless', '--disable-gpu', \"--print-to-printer=\\\"HP LaserJet Pro M404dn\\\"\", \"\\\"$tmp\\\"\" -NoNewWindow; $buf = [System.Text.Encoding]::UTF8.GetBytes('{\"success\":true}'); $res.OutputStream.Write($buf,0,$buf.Length); $res.Close(); continue; } $res.StatusCode = 404; $res.Close(); }"
pause
`;

    const blob = new Blob([batContent], { type: 'application/x-msdos-program' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'start_bskbd_direct_print_agent.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Perform Print Execution
  const executePrint = (entriesInput: DailyExpenseApprovalEntry | DailyExpenseApprovalEntry[]) => {
    const htmlContent = generatePrintHTML(entriesInput);

    // 1. Try popup window
    let windowOpened = false;
    try {
      const printWin = window.open('', '_blank', 'width=950,height=950');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(htmlContent);
        printWin.document.close();
        windowOpened = true;
      }
    } catch (e) {
      console.warn("Popup blocked, trying iframe print fallback...", e);
    }

    // 2. Fallback to hidden iframe if popup was blocked
    if (!windowOpened) {
      let printIframe = document.getElementById('daily-expense-print-iframe') as HTMLIFrameElement;
      if (!printIframe) {
        printIframe = document.createElement('iframe');
        printIframe.id = 'daily-expense-print-iframe';
        printIframe.style.position = 'fixed';
        printIframe.style.right = '0';
        printIframe.style.bottom = '0';
        printIframe.style.width = '0';
        printIframe.style.height = '0';
        printIframe.style.border = '0';
        document.body.appendChild(printIframe);
      }

      const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();
        setTimeout(() => {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
        }, 500);
      }
    }
  };

  // Print Action Trigger for single row
  const handleTriggerPrint = (entry: DailyExpenseApprovalEntry) => {
    setPrintingEntries([entry]);
    setIsPreviewModalOpen(true);
    executePrint([entry]);
  };

  // Selection Handlers
  const toggleSelectEntry = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === sortedApprovals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedApprovals.map(a => a.id));
    }
  };

  const handlePrintSelected = () => {
    const selectedEntries = sortedApprovals.filter(a => selectedIds.includes(a.id));
    if (selectedEntries.length === 0) return;
    setPrintingEntries(selectedEntries);
    setIsPreviewModalOpen(true);
    executePrint(selectedEntries);
  };

  // Preview Card Renderer for Modal
  const renderSlipPreviewCard = (entry: DailyExpenseApprovalEntry) => (
    <div className="bg-white border border-slate-300 p-5 shadow-sm w-full text-black font-serif text-xs leading-tight rounded-sm">
      {/* Header */}
      <div className="flex items-end justify-between border-b-2 border-black pb-1.5 mb-3">
        <div className="flex items-end">
          <img 
            src="https://lh3.googleusercontent.com/d/1x7Fp3Wsk8PqHLmMePPaah1wPdjs4SSvr" 
            alt="BSK Logo" 
            className="h-10 w-auto object-contain"
          />
        </div>
        <div className="text-right">
          <span className="text-sm font-black text-black tracking-wide">
            {entry.department || "প্রশাসন বিভাগ"}
          </span>
        </div>
      </div>

      {/* Title */}
      <div className="text-center my-2">
        <h1 className="text-xs font-extrabold inline-block border-b-2 border-black pb-0.5 px-3">
          দৈনন্দিন জরুরি খরচের অনুমোদনপত্র
        </h1>
      </div>

      {/* Info lines */}
      <div className="space-y-1 text-xs font-bold mb-2">
        <div className="flex items-center">
          <span className="font-extrabold whitespace-nowrap">আবেদনকারীর নাম:</span>
          <span className="border-b border-black flex-1 ml-2 font-bold pl-2">
            {entry.applicantName}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center flex-1">
            <span className="font-extrabold whitespace-nowrap">খাতের নাম:</span>
            <span className="border-b border-black flex-1 ml-2 font-bold pl-2">
              {entry.budgetHead}
            </span>
          </div>
          <div className="flex items-center w-28">
            <span className="font-extrabold whitespace-nowrap">তারিখ:</span>
            <span className="border-b border-black flex-1 ml-2 text-center font-bold">
              {formatBengaliDateDDMMYYYY(entry.date)}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse border border-black text-xs my-2">
        <thead>
          <tr className="bg-slate-50">
            <th className="border border-black px-1 py-1 w-7 text-center font-black align-middle">ক্রম</th>
            <th className="border border-black px-1.5 py-1 text-center font-black align-middle">কাজের/ক্রয়ের বিবরণ</th>
            <th className="border border-black px-1.5 py-1 w-20 text-center font-black align-middle">সম্ভাব্য ব্যয়</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, index) => {
            const item = entry.items && entry.items[index];
            return (
              <tr key={index} className="h-5">
                <td className="border border-black px-1 py-0.5 text-center font-bold align-middle">
                  {toBengaliNumerals(index + 1)}
                </td>
                <td className="border border-black px-1.5 py-0.5 text-center font-medium align-middle">
                  {item ? item.description : ''}
                </td>
                <td className="border border-black px-1.5 py-0.5 text-center font-bold align-middle">
                  {item && item.estimatedExpense ? toBengaliNumerals(Number(item.estimatedExpense).toLocaleString()) : ''}
                </td>
              </tr>
            );
          })}
          <tr className="font-black bg-slate-50">
            <td colSpan={2} className="border border-black px-1.5 py-1 align-middle font-black">
              <span className="font-extrabold align-middle">মোট কথায়: </span>
              <span className="font-bold ml-1 align-middle">{entry.totalInWords}</span>
            </td>
            <td className="border border-black px-1.5 py-1 text-center align-middle font-black">
              ৳ {toBengaliNumerals((entry.totalAmount || 0).toLocaleString())}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold mt-6 pt-1">
        <div>
          <div className="border-t border-black pt-0.5">আবেদনকারী</div>
        </div>
        <div>
          <div className="border-t border-black pt-0.5">সহ. পরিচালক</div>
        </div>
        <div>
          <div className="border-t border-black pt-0.5">যুগ্ম-পরিচালক</div>
        </div>
      </div>
    </div>
  );

  // Available months list
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    const currYear = new Date().getFullYear() || 2026;
    for (const y of [currYear, currYear - 1, currYear + 1]) {
      for (let m = 1; m <= 12; m++) {
        const mStr = String(m).padStart(2, '0');
        set.add(`${y}-${mStr}`);
      }
    }
    approvals.forEach(a => {
      if (a.date && a.date.length >= 7) {
        set.add(a.date.substring(0, 7));
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [approvals]);

  // Filtered List
  const filteredApprovals = useMemo(() => {
    return approvals.filter(item => {
      // 1. Text search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = item.applicantName?.toLowerCase().includes(q);
        const matchesHead = item.budgetHead?.toLowerCase().includes(q);
        const matchesDept = item.department?.toLowerCase().includes(q);
        const matchesSl = item.slNo?.toLowerCase().includes(q);
        const matchesItems = item.items?.some(i => i.description?.toLowerCase().includes(q));
        if (!matchesName && !matchesHead && !matchesDept && !matchesSl && !matchesItems) {
          return false;
        }
      }

      // 2. Budget head filter
      if (budgetHeadFilter !== 'all') {
        if (item.budgetHead !== budgetHeadFilter) {
          return false;
        }
      }

      // 3. Date Filtering
      const itemDate = item.date || '';

      if (filterMode === 'month') {
        if (selectedMonth && !itemDate.startsWith(selectedMonth)) {
          return false;
        }
      } else if (filterMode === 'range') {
        if (startDate && itemDate < startDate) {
          return false;
        }
        if (endDate && itemDate > endDate) {
          return false;
        }
      } else if (filterMode === 'single') {
        if (selectedDate && itemDate !== selectedDate) {
          return false;
        }
      }

      return true;
    });
  }, [approvals, searchTerm, budgetHeadFilter, filterMode, selectedMonth, startDate, endDate, selectedDate]);

  // Dynamic Sorting
  const sortedApprovals = useMemo(() => {
    const list = [...filteredApprovals];
    if (sortBy === 'date_desc') {
      return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    } else if (sortBy === 'date_asc') {
      return list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    } else if (sortBy === 'amount_desc') {
      return list.sort((a, b) => (Number(b.totalAmount) || 0) - (Number(a.totalAmount) || 0));
    } else {
      // Entry order default
      return list;
    }
  }, [filteredApprovals, sortBy]);

  // Calculations
  const totalAmountSum = approvals.reduce((sum, a) => sum + (a.totalAmount || 0), 0);
  const filteredAmountSum = filteredApprovals.reduce((sum, a) => sum + (a.totalAmount || 0), 0);
  const selectedAmountSum = useMemo(() => {
    return approvals.filter(a => selectedIds.includes(a.id)).reduce((sum, a) => sum + (a.totalAmount || 0), 0);
  }, [approvals, selectedIds]);

  const hasActiveFilters = filterMode !== 'all' || budgetHeadFilter !== 'all' || searchTerm.trim() !== '';

  const activeFilterDescription = useMemo(() => {
    const parts: string[] = [];
    if (filterMode === 'month' && selectedMonth) {
      parts.push(`মাস: ${formatYearMonthBengali(selectedMonth)}`);
    } else if (filterMode === 'range') {
      if (startDate && endDate) {
        parts.push(`তারিখ: ${formatBengaliDateDDMMYYYY(startDate)} হতে ${formatBengaliDateDDMMYYYY(endDate)}`);
      } else if (startDate) {
        parts.push(`তারিখ: ${formatBengaliDateDDMMYYYY(startDate)} হতে পরবর্তী`);
      } else if (endDate) {
        parts.push(`তারিখ: ${formatBengaliDateDDMMYYYY(endDate)} পর্যন্ত`);
      } else {
        parts.push('তারিখ পরিসীমা');
      }
    } else if (filterMode === 'single' && selectedDate) {
      parts.push(`তারিখ: ${formatBengaliDateDDMMYYYY(selectedDate)}`);
    } else {
      parts.push('সকল রেকর্ড');
    }

    if (budgetHeadFilter !== 'all') {
      parts.push(`খাত: ${budgetHeadFilter}`);
    }
    if (searchTerm.trim()) {
      parts.push(`অনুসন্ধান: "${searchTerm.trim()}"`);
    }

    return parts.join(' • ');
  }, [filterMode, selectedMonth, startDate, endDate, selectedDate, budgetHeadFilter, searchTerm]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterMode('all');
    setStartDate('');
    setEndDate('');
    setSelectedDate('');
    setBudgetHeadFilter('all');
    setSelectedMonth('2026-09');
    setSortBy('entry');
  };

  // Excel (.xlsx) Export Handler
  const handleExportExcel = (mode: 'filtered' | 'selected' | 'all' = 'filtered') => {
    setIsExportMenuOpen(false);

    let dataToExport: DailyExpenseApprovalEntry[] = [];
    let titleContext = '';
    let reportPeriodText = '';

    if (mode === 'selected') {
      dataToExport = sortedApprovals.filter(a => selectedIds.includes(a.id));
      titleContext = `সিলেক্টেড_${dataToExport.length}_টি`;
      reportPeriodText = `ব্যবহারকারী কর্তৃক নির্বাচিত ${dataToExport.length} টি অনুমোদনপত্র`;
    } else if (mode === 'all') {
      dataToExport = approvals;
      titleContext = 'সকল_অনুমোদন';
      reportPeriodText = 'সকল অনুমোদনপত্র (সর্বমোট ডেটাবেজ)';
    } else {
      dataToExport = sortedApprovals;
      if (filterMode === 'month' && selectedMonth) {
        titleContext = `মাস_${selectedMonth}`;
        reportPeriodText = `নির্বাচিত মাস: ${formatYearMonthBengali(selectedMonth)} (${selectedMonth})`;
      } else if (filterMode === 'range') {
        if (startDate && endDate) {
          titleContext = `${startDate}_to_${endDate}`;
          reportPeriodText = `তারিখ পরিসীমা: ${formatBengaliDateDDMMYYYY(startDate)} হতে ${formatBengaliDateDDMMYYYY(endDate)}`;
        } else if (startDate) {
          titleContext = `From_${startDate}`;
          reportPeriodText = `তারিখ: ${formatBengaliDateDDMMYYYY(startDate)} হতে পরবর্তী সকল`;
        } else if (endDate) {
          titleContext = `UpTo_${endDate}`;
          reportPeriodText = `তারিখ: ${formatBengaliDateDDMMYYYY(endDate)} পর্যন্ত`;
        } else {
          titleContext = 'তারিখ_পরিসীমা';
          reportPeriodText = 'কাস্টম তারিখ পরিসীমা';
        }
      } else if (filterMode === 'single' && selectedDate) {
        titleContext = `তারিখ_${selectedDate}`;
        reportPeriodText = `নির্দিষ্ট তারিখ: ${formatBengaliDateDDMMYYYY(selectedDate)}`;
      } else {
        titleContext = 'সকল_অনুমোদন';
        reportPeriodText = 'সকল অনুমোদনপত্র';
      }

      if (budgetHeadFilter !== 'all') {
        reportPeriodText += ` | খরচের খাত: ${budgetHeadFilter}`;
      }
      if (searchTerm.trim()) {
        reportPeriodText += ` | অনুসন্ধান: "${searchTerm.trim()}"`;
      }
    }

    if (dataToExport.length === 0) {
      alert('এক্সপোর্ট করার জন্য কোনো তথ্য পাওয়া যায়নি!');
      return;
    }

    const grandTotal = dataToExport.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);

    // Build worksheet data
    const worksheetData: any[][] = [
      ['বিশ্বসাহিত্য কেন্দ্র (Bishwo Shahitto Kendro)'],
      ['দৈনন্দিন জরুরি খরচের অনুমোদনপত্র ও হিসাব বিবরণী রিপোর্ট'],
      [`সময়কাল / ফিল্টার: ${reportPeriodText}`],
      [`মোট অনুমোদন সংখ্যা: ${dataToExport.length} টি | সর্বমোট ব্যয়ের পরিমাণ: ৳ ${grandTotal.toLocaleString('bn-BD')} (${numberToBengaliWords(grandTotal)})`],
      [`রিপোর্ট তৈরির তারিখ ও সময়: ${new Date().toLocaleDateString('bn-BD')} ${new Date().toLocaleTimeString()}`],
      [], // Blank row
      [
        'ক্র. নং',
        'ভাউচার ক্রমিক নং',
        'তারিখ',
        'আবেদনকারীর নাম',
        'বিভাগ',
        'খরচের খাত',
        'কাজের/ক্রয়ের বিবরণ',
        'আইটেম বিবরণ ও সম্ভাব্য ব্যয় (৳)',
        'মোট টাকার পরিমাণ (৳)',
        'কথায় টাকা',
        'অনুমোদন স্ট্যাটাস'
      ]
    ];

    dataToExport.forEach((entry, idx) => {
      const descriptions = entry.items?.map(it => it.description).filter(Boolean).join('; ') || '—';
      const breakdown = entry.items?.map((it, i) => `${i + 1}. ${it.description || 'বিবরণ'} - ৳${(Number(it.estimatedExpense) || 0).toLocaleString()}`).join(' | ') || '—';

      worksheetData.push([
        idx + 1,
        entry.slNo || String(idx + 1).padStart(3, '0'),
        formatDateToDDMMYYYY(entry.date),
        entry.applicantName || '',
        entry.department || 'প্রশাসন বিভাগ',
        entry.budgetHead || '',
        descriptions,
        breakdown,
        Number(entry.totalAmount) || 0,
        entry.totalInWords || '',
        entry.status === 'approved' ? 'অনুমোদিত' : 'অপেক্ষমাণ'
      ]);
    });

    // Summary Total Row
    worksheetData.push([]);
    worksheetData.push([
      'সর্বমোট',
      '',
      '',
      '',
      '',
      '',
      `মোট ${dataToExport.length} টি অনুমোদনপত্র`,
      'সর্বমোট ব্যয়:',
      grandTotal,
      numberToBengaliWords(grandTotal),
      ''
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set custom column widths
    worksheet['!cols'] = [
      { wch: 8 },  // SL
      { wch: 15 }, // Voucher No
      { wch: 14 }, // Date
      { wch: 24 }, // Applicant Name
      { wch: 18 }, // Dept
      { wch: 28 }, // Budget Head
      { wch: 45 }, // Description
      { wch: 45 }, // Breakdown
      { wch: 18 }, // Total Amount
      { wch: 35 }, // In Words
      { wch: 15 }, // Status
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'দৈনন্দিন খরচের হিসাব');

    const cleanFilename = `BSK_দৈনন্দিন_খরচ_${titleContext}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, cleanFilename);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
            <Receipt size={26} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span>দৈনন্দিন জরুরি খরচের অনুমোদনপত্র</span>
              <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-0.5 rounded-full">
                প্রশাসন বিভাগ
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              বিশ্বসাহিত্য কেন্দ্র - জরুরি খরচের চাহিদাপত্র তৈরি, মাস ও তারিখ ভিত্তিক ফিল্টারিং, Excel ডাউনলোড এবং প্রিন্ট ব্যবস্থাপনা
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Excel Export Main Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm transition-all hover:shadow-md cursor-pointer"
              title="Excel (.xlsx) ফাইল ডাউনলোড করুন"
            >
              <FileSpreadsheet size={18} className="text-emerald-200" />
              <span>Excel ডাউনলোড (.xlsx)</span>
              <ChevronDown size={15} className={`transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isExportMenuOpen && (
              <div 
                className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Excel Export Options</p>
                  <p className="text-[11px] text-slate-400">রিপোর্টের ফরম্যাট নির্বাচন করুন</p>
                </div>

                <div className="p-1 space-y-0.5">
                  <button
                    onClick={() => handleExportExcel('filtered')}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50 rounded-xl text-xs flex items-center justify-between text-slate-700 hover:text-emerald-800 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <Filter size={14} />
                      </div>
                      <div>
                        <p className="font-bold">ফিল্টারকৃত তালিকা এক্সপোর্ট</p>
                        <p className="text-[10px] text-slate-400">
                          {filterMode === 'month' ? `মাস: ${selectedMonth}` : filterMode === 'range' ? `${startDate} হতে ${endDate}` : 'বর্তমান ফিল্টার'} ({toBengaliNumerals(sortedApprovals.length)} টি)
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                      {sortedApprovals.length}
                    </span>
                  </button>

                  {selectedIds.length > 0 && (
                    <button
                      onClick={() => handleExportExcel('selected')}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 rounded-xl text-xs flex items-center justify-between text-slate-700 hover:text-blue-800 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                          <CheckCheck size={14} />
                        </div>
                        <div>
                          <p className="font-bold">সিলেক্টেড রেকর্ড এক্সপোর্ট</p>
                          <p className="text-[10px] text-slate-400">টিক চিহ্ন দেয়া রেকর্ডসমূহ ({toBengaliNumerals(selectedIds.length)} টি)</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded-md">
                        {selectedIds.length}
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => handleExportExcel('all')}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-purple-50 rounded-xl text-xs flex items-center justify-between text-slate-700 hover:text-purple-800 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                        <Download size={14} />
                      </div>
                      <div>
                        <p className="font-bold">সম্পূর্ণ ডেটাবেজ এক্সপোর্ট</p>
                        <p className="text-[10px] text-slate-400">সকল অনুমোদনপত্র ({toBengaliNumerals(approvals.length)} টি)</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-purple-600 bg-purple-100/60 px-2 py-0.5 rounded-md">
                      {approvals.length}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {(!hasActionAccess || hasActionAccess('dailyExpenseApproval', 'create')) && (
            <button
              onClick={handleOpenCreate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm transition-all hover:shadow-md cursor-pointer"
            >
              <Plus size={18} />
              <span>নতুন অনুমোদনপত্র তৈরি করুন</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">মোট অনুমোদন আবেদন</p>
            <p className="text-lg font-bold text-slate-800">
              {toBengaliNumerals(approvals.length)} টি
              {hasActiveFilters && (
                <span className="text-xs font-semibold text-emerald-600 ml-2">
                  (ফিল্টারকৃত: {toBengaliNumerals(sortedApprovals.length)} টি)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Receipt size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">
              {hasActiveFilters ? 'ফিল্টারকৃত ব্যয়ের পরিমাণ' : 'সর্বমোট জরুরি ব্যয়'}
            </p>
            <p className="text-lg font-bold text-emerald-700">
              ৳ {toBengaliNumerals((hasActiveFilters ? filteredAmountSum : totalAmountSum).toLocaleString())}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Printer size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">প্রিন্ট ফরম্যাট</p>
              <p className="text-xs font-bold text-purple-700">A4 Landscape Half-Page (50%)</p>
            </div>
          </div>
          <button
            onClick={() => handleExportExcel('filtered')}
            className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 cursor-pointer transition-colors"
            title="বর্তমান ফিল্টারের Excel ফাইল ডাউনলোড করুন"
          >
            <FileSpreadsheet size={14} />
            <span>Excel Export</span>
          </button>
        </div>
      </div>

      {/* Top Filter Ribbon - Exact Design from User Images */}
      <div className="bg-white p-3 rounded-2xl border border-blue-200/90 shadow-sm space-y-3 no-print">
        {/* Main Ribbon: 4 Mode Buttons on Left, Dynamic Date Pickers & Count Badge on Right */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          {/* Left Group: 4 Tab Capsule */}
          <div className="border border-blue-300/80 rounded-xl p-1 flex flex-wrap items-center gap-1 bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setFilterMode('single');
                if (!selectedDate) {
                  setSelectedDate(new Date().toISOString().split('T')[0]);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'single'
                  ? 'bg-[#0f172a] text-white shadow-xs font-extrabold'
                  : 'text-slate-700 hover:bg-slate-100 font-semibold'
              }`}
            >
              <span>📅</span>
              <span>দৈনিক (Daily)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterMode('month');
                if (!selectedMonth) {
                  const now = new Date();
                  setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'month'
                  ? 'bg-[#0f172a] text-white shadow-xs font-extrabold'
                  : 'text-slate-700 hover:bg-slate-100 font-semibold'
              }`}
            >
              <span>📅</span>
              <span>মাসিক (Monthly)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterMode('range');
                if (!startDate) {
                  const now = new Date();
                  const y = now.getFullYear();
                  const m = String(now.getMonth() + 1).padStart(2, '0');
                  setStartDate(`${y}-${m}-01`);
                  setEndDate(now.toISOString().split('T')[0]);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'range'
                  ? 'bg-[#0f172a] text-white shadow-xs font-extrabold'
                  : 'text-slate-700 hover:bg-slate-100 font-semibold'
              }`}
            >
              <span>📅</span>
              <span>নির্দিষ্ট সময়সীমা (Custom)</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-[#0f172a] text-white shadow-xs font-extrabold'
                  : 'text-slate-700 hover:bg-slate-100 font-semibold'
              }`}
            >
              <span>📊</span>
              <span>সব সময়ের (All-Time)</span>
            </button>
          </div>

          {/* Right Group: Dynamic Pickers & Black Count Badge */}
          <div className="flex flex-wrap items-center justify-between xl:justify-end gap-2.5">
            {/* Daily Date Picker */}
            {filterMode === 'single' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span>📅</span>
                  <span>তারিখ নির্বাচন:</span>
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-blue-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 cursor-pointer shadow-2xs"
                />
              </div>
            )}

            {/* Monthly Calendar Month Picker */}
            {filterMode === 'month' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <span>📅</span>
                  <span>মাস নির্বাচন:</span>
                </span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="border border-blue-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 cursor-pointer shadow-2xs"
                />
              </div>
            )}

            {/* Custom Date Range Pickers */}
            {filterMode === 'range' && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-700">হতে:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border border-blue-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 cursor-pointer shadow-2xs"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-700">পর্যন্ত:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border border-blue-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 cursor-pointer shadow-2xs"
                  />
                </div>
              </div>
            )}

            {/* All-Time indicator */}
            {filterMode === 'all' && (
              <div className="text-xs font-semibold text-slate-500">
                সকল অনুমোদনপত্র প্রদর্শিত হচ্ছে
              </div>
            )}

            {/* Black Count Badge - Exactly matching screenshot: "X টি অনুমোদন অন্তর্ভুক্ত" */}
            <div className="bg-[#0f172a] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-xs flex items-center gap-1 shrink-0">
              <span>{toBengaliNumerals(sortedApprovals.length)} টি অনুমোদন অন্তর্ভুক্ত</span>
            </div>
          </div>
        </div>

        {/* Secondary Row: Search, Budget Head, Sort, Reset & Excel Export */}
        <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="আবেদনকারীর নাম, খাত, বিভাগ বা বিবরণ দিয়ে খুঁজুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/60"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="সার্চ ক্লিয়ার করুন"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Budget Head Dropdown */}
          <div className="relative min-w-[150px]">
            <select
              value={budgetHeadFilter}
              onChange={(e) => setBudgetHeadFilter(e.target.value)}
              className={`w-full appearance-none px-3 py-2 pr-7 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-2xs ${
                budgetHeadFilter !== 'all'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
              title="খরচের খাত অনুযায়ী ফিল্টার করুন"
            >
              <option value="all">📂 সকল খাত (All Heads)</option>
              {uniqueBudgetOptions.map((head) => (
                <option key={head} value={head}>
                  {head}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Sort By Dropdown */}
          <div className="relative min-w-[140px]">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full appearance-none px-3 py-2 pr-7 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs"
              title="সর্টিং পদ্ধতি"
            >
              <option value="entry">🔢 এন্ট্রি ক্রম</option>
              <option value="date_desc">📅 তারিখ (নতুন ➔ পুরাতন)</option>
              <option value="date_asc">📅 তারিখ (পুরাতন ➔ নতুন)</option>
              <option value="amount_desc">💰 টাকা (বেশি ➔ কম)</option>
            </select>
            <ArrowUpDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Action Buttons: Reset & Excel Export */}
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                title="সকল ফিল্টার রিসেট করুন"
              >
                <RotateCcw size={12} />
                <span>রিসেট</span>
              </button>
            )}

            <button
              onClick={() => handleExportExcel('filtered')}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
              title="বর্তমান ফিল্টারকৃত তালিকা Excel ফাইলে ডাউনলোড করুন"
            >
              <FileSpreadsheet size={14} className="text-emerald-200" />
              <span>Excel ডাউনলোড (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Active Filter & Total Cost Summary Ribbon */}
        {hasActiveFilters && (
          <div className="bg-emerald-50/70 rounded-xl px-3.5 py-1.5 border border-emerald-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-emerald-800 flex items-center gap-1">
                <Filter size={12} className="text-emerald-600" />
                <span>ফিল্টার:</span>
              </span>
              <span className="bg-white px-2 py-0.5 rounded-md font-bold text-emerald-700 border border-emerald-200 text-[11px]">
                {activeFilterDescription}
              </span>
              <span className="text-slate-300">|</span>
              <span>
                মোট আবেদন: <strong className="text-slate-800">{toBengaliNumerals(sortedApprovals.length)} টি</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span>
                মোট ব্যয়: <strong className="text-emerald-700 font-bold">৳ {toBengaliNumerals(filteredAmountSum.toLocaleString())}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Selected Action Banner */}
      {selectedIds.length > 0 && (
        <div className="bg-emerald-900 text-white p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 no-print animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="bg-emerald-800 text-emerald-200 text-xs font-bold px-3 py-1 rounded-lg">
              {toBengaliNumerals(selectedIds.length)} টি নির্বাচন করা হয়েছে
            </span>
            <span className="text-xs text-emerald-100 font-medium">
              নির্বাচিত মোট ব্যয়: ৳ {toBengaliNumerals(selectedAmountSum.toLocaleString())} | {selectedIds.length === 2 
                ? '১টি A4 ল্যান্ডস্কেপ পাতায় ২টি এন্ট্রি পাশাপাশি প্রিন্ট হবে' 
                : `${toBengaliNumerals(Math.ceil(selectedIds.length / 2))} টি A4 পাতায় প্রিন্ট হবে`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleExportExcel('selected')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="সিলেক্টেড এন্ট্রিগুলো Excel ফাইলে ডাউনলোড করুন"
            >
              <FileSpreadsheet size={15} />
              <span>{toBengaliNumerals(selectedIds.length)} টি Excel ডাউনলোড</span>
            </button>
            <button
              onClick={handlePrintSelected}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Printer size={16} />
              <span>{toBengaliNumerals(selectedIds.length)} টি প্রিন্ট করুন</span>
            </button>
            <button
              onClick={() => {
                const selectedEntries = sortedApprovals.filter(a => selectedIds.includes(a.id));
                executeDirectAgentPrint(selectedEntries);
              }}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Zap size={15} className="text-yellow-300 fill-yellow-300" />
              <span>⚡ ডাইরেক্ট প্রিন্ট</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="bg-emerald-800/80 hover:bg-emerald-700 text-emerald-200 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              বাতিল
            </button>
          </div>
        </div>
      )}

      {/* Requisitions List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden no-print">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <div className="animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            আবেদনপত্র লোড হচ্ছে...
          </div>
        ) : sortedApprovals.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm space-y-3">
            <p>বর্তমান ফিল্টারে কোন অনুমোদনপত্র পাওয়া যায়নি।</p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>ফিল্টার রিসেট করে সবগুলো দেখুন</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs">
                <tr>
                  <th className="px-3 py-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={sortedApprovals.length > 0 && selectedIds.length === sortedApprovals.length}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4"
                      title="সবগুলো নির্বাচন করুন"
                    />
                  </th>
                  <th className="px-4 py-3.5 w-16 text-center">ক্রম</th>
                  <th className="px-4 py-3.5">তারিখ</th>
                  <th className="px-4 py-3.5">আবেদনকারীর নাম</th>
                  <th className="px-4 py-3.5">খাতের নাম</th>
                  <th className="px-4 py-3.5">আইটেম সংখ্যা</th>
                  <th className="px-4 py-3.5 text-right">মোট টাকা (৳)</th>
                  <th className="px-4 py-3.5 text-center w-36">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {sortedApprovals.map((entry, index) => (
                  <tr key={entry.id} className={`hover:bg-slate-50/80 transition-colors ${selectedIds.includes(entry.id) ? 'bg-emerald-50/40' : ''}`}>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(entry.id)}
                        onChange={() => toggleSelectEntry(entry.id)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4"
                      />
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400 font-mono text-xs">
                      {toBengaliNumerals(index + 1)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {formatBengaliDateDDMMYYYY(entry.date)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {entry.applicantName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {entry.budgetHead}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {toBengaliNumerals(entry.items?.length || 0)} টি কাজ
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                      ৳ {toBengaliNumerals((entry.totalAmount || 0).toLocaleString())}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleTriggerPrint(entry)}
                          title="প্রিন্ট করুন (A4 Landscape Half)"
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                        >
                          <Printer size={16} />
                        </button>
                        {(!hasActionAccess || hasActionAccess('dailyExpenseApproval', 'edit')) && (
                          <button
                            onClick={() => handleOpenEdit(entry)}
                            title="সম্পাদনা করুন"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {(!hasActionAccess || hasActionAccess('dailyExpenseApproval', 'delete')) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(entry.id, entry.applicantName);
                            }}
                            title="মুছে ফেলুন"
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div 
            onClick={() => setIsCreateModalOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-8 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Receipt className="text-emerald-600" size={22} />
                  <span>{editingId ? 'অনুমোদনপত্র সম্পাদনা করুন' : 'নতুন দৈনন্দিন জরুরি খরচের অনুমোদনপত্র'}</span>
                </h2>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              {formError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                  {formError}
                </div>
              )}

              <div className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
                {/* Header Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      আবেদনকারীর নাম <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      placeholder="আবেদনকারীর নাম লিখুন"
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      বিভাগ
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      খাতের নাম <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      <select
                        value={isCustomBudgetHead ? '__custom__' : (budgetHead || '')}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            setIsCustomBudgetHead(true);
                            setBudgetHead('');
                          } else {
                            setIsCustomBudgetHead(false);
                            setBudgetHead(e.target.value);
                          }
                        }}
                        className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-slate-800 outline-none"
                      >
                        <option value="">-- খাতের নাম নির্বাচন করুন --</option>
                        {uniqueBudgetOptions.map((head, idx) => (
                          <option key={idx} value={head}>
                            {head}
                          </option>
                        ))}
                        <option value="__custom__">➕ অন্যান্য (নিজে টাইপ করুন)</option>
                      </select>

                      {(isCustomBudgetHead || (budgetHead && !uniqueBudgetOptions.includes(budgetHead))) && (
                        <input
                          type="text"
                          value={budgetHead}
                          onChange={(e) => setBudgetHead(e.target.value)}
                          placeholder="খাতের নাম টাইপ করুন..."
                          className="w-full px-3.5 py-2 text-sm border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-emerald-50/30 outline-none"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        তারিখ <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-slate-400 font-mono">
                        (dd/mm/yyyy)
                      </span>
                    </div>
                    <input
                      type="date"
                      value={reqDate}
                      onChange={(e) => setReqDate(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    {reqDate && (
                      <span className="text-[11px] text-emerald-700 font-bold mt-1 block">
                        ফরম্যাট: {formatDateToDDMMYYYY(reqDate)} ({formatBengaliDateDDMMYYYY(reqDate)})
                      </span>
                    )}
                  </div>
                </div>

                {/* Dynamic Items Table */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      কাজের/ক্রয়ের বিবরণ ও সম্ভাব্য ব্যয়
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                    >
                      <Plus size={14} />
                      <span>আরও যোগ করুন</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                        <tr>
                          <th className="px-3 py-2.5 w-12 text-center">ক্রম</th>
                          <th className="px-3 py-2.5">কাজের/ক্রয়ের বিবরণ</th>
                          <th className="px-3 py-2.5 w-36 text-right">সম্ভাব্য ব্যয় (৳)</th>
                          <th className="px-2 py-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 text-center text-slate-500 font-mono">
                              {toBengaliNumerals(idx + 1)}
                            </td>
                            <td className="px-3 py-2">
                              <textarea
                                value={item.description}
                                onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                placeholder={`কাজ/ক্রয়ের বিবরণ ${idx + 1}`}
                                rows={2}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-bangla resize-y min-h-[50px] leading-relaxed"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                value={item.estimatedExpense}
                                onChange={(e) => handleItemChange(idx, 'estimatedExpense', e.target.value)}
                                placeholder="0"
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-right font-semibold focus:outline-none focus:border-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              {items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="text-slate-400 hover:text-red-500 p-1"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-emerald-50/50 border-t border-slate-200 font-bold">
                        <tr>
                          <td colSpan={2} className="px-3 py-2.5 text-right text-slate-700">
                            মোট সর্বমোট সম্ভাব্য ব্যয়:
                          </td>
                          <td className="px-3 py-2.5 text-right text-emerald-800 text-sm">
                            ৳ {toBengaliNumerals(currentTotal.toLocaleString())}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Total in words */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      মোট কথায়
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsManualWords(!isManualWords)}
                      className="text-[11px] text-emerald-600 hover:underline"
                    >
                      {isManualWords ? 'স্বয়ংক্রিয় করুন' : 'নিজে লিখুন'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={totalInWords}
                    onChange={(e) => {
                      setIsManualWords(true);
                      setTotalInWords(e.target.value);
                    }}
                    placeholder="কথায় টাকা"
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleSaveApproval}
                  className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm flex items-center gap-2"
                >
                  <Check size={16} />
                  <span>{editingId ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PRINT PREVIEW MODAL */}
      <AnimatePresence>
        {isPreviewModalOpen && printingEntries.length > 0 && (
          <div 
            onClick={() => setIsPreviewModalOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`bg-white rounded-2xl shadow-2xl ${printingEntries.length > 1 ? 'max-w-5xl' : 'max-w-3xl'} w-full p-6 border border-slate-200 my-auto flex flex-col max-h-[90vh] overflow-hidden`}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Printer size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">অনুমোদনপত্র প্রিভিউ ও প্রিন্ট ({toBengaliNumerals(printingEntries.length)} টি এন্ট্রি)</h3>
                    <p className="text-xs text-slate-500">
                      {printingEntries.length === 1 
                        ? '১টি এন্ট্রি - A4 ল্যান্ডস্কেপ অর্ধেক পাতায় প্রিন্ট প্রিভিউ' 
                        : `${toBengaliNumerals(printingEntries.length)}টি এন্ট্রি - ১টি A4 পাতায় ২টি করে পাশাপাশি প্রিন্ট হবে`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => executePrint(printingEntries)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Printer size={15} />
                    <span>প্রিন্ট করুন</span>
                  </button>
                  <button
                    onClick={() => setIsPreviewModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Sheet Visual Preview Canvas */}
              <div className="flex-1 overflow-y-auto bg-slate-100 p-4 rounded-xl border border-slate-200 shadow-inner flex flex-col items-center gap-4">
                {Array.from({ length: Math.ceil(printingEntries.length / 2) }).map((_, pageIdx) => {
                  const pair = printingEntries.slice(pageIdx * 2, pageIdx * 2 + 2);
                  return (
                    <div key={pageIdx} className="w-full max-w-[880px] bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                      <div className="text-[11px] font-bold text-slate-400 mb-2 flex items-center justify-between border-b pb-1">
                        <span>A4 ল্যান্ডস্কেপ পৃষ্ঠা {toBengaliNumerals(pageIdx + 1)}</span>
                        <span>{pair.length === 2 ? '২টি ভিন্ন এন্ট্রি পাশাপাশি' : '১টি এন্ট্রি'}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                        <div className="w-full">
                          {renderSlipPreviewCard(pair[0])}
                        </div>
                        {pair[1] && (
                          <div className="w-full relative md:pl-2">
                            <div className="hidden md:block absolute -left-2 top-0 bottom-0 w-px border-l border-dashed border-slate-300" />
                            {renderSlipPreviewCard(pair[1])}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between shrink-0 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => executeDirectAgentPrint(printingEntries)}
                    disabled={isAgentPrinting}
                    title="ব্রাউজার প্রিন্ট ডায়ালগ ছাড়াই ডাইরেক্ট প্রিন্টারে পাঠাতে ১-ক্লিক করুন"
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Zap size={15} className="text-yellow-300 fill-yellow-300" />
                    <span>{isAgentPrinting ? 'প্রিন্টারে পাঠানো হচ্ছে...' : '⚡ ডাইরেক্ট প্রিন্ট (১-ক্লিক)'}</span>
                  </button>
                  <button
                    onClick={() => setIsAgentModalOpen(true)}
                    title="ডাইরেক্ট প্রিন্ট এজেন্ট সেটিং"
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                  >
                    <Settings size={15} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPreviewModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    বন্ধ করুন
                  </button>
                  <button
                    onClick={() => executePrint(printingEntries)}
                    title="A4 ল্যান্ডস্কেপ পাতায় ২ টি এন্ট্রি পাশাপাশি ব্রাউজারে প্রিন্ট করুন"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer size={15} />
                    <span>প্রিন্ট করুন ({toBengaliNumerals(printingEntries.length)}টি এন্ট্রি)</span>
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DIRECT PRINT AGENT CONFIG MODAL */}
      <AnimatePresence>
        {isAgentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl">
                    <Zap size={22} className="fill-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">লোকাল ডাইরেক্ট প্রিন্ট এজেন্ট (Direct Print Agent)</h3>
                    <p className="text-xs text-slate-500 font-medium">ব্রাউজার ডায়ালগ ছাড়াই ১-ক্লিকে সরাসরি প্রিন্টারে পাঠানোর ব্যবস্থা</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAgentModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status Box */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">এজেন্ট কানেকশন স্ট্যাটাস:</span>
                  <button
                    onClick={checkAgentConnection}
                    className="px-3 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>পুনরায় চেক করুন</span>
                  </button>
                </div>
                
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  agentStatus === 'connected' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                  agentStatus === 'checking' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                  'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  <span className="text-sm">
                    {agentStatus === 'connected' ? '🟢' : agentStatus === 'checking' ? '⏳' : '🔴'}
                  </span>
                  <span>{agentMessage || 'স্ট্যাটাস চেক করা হয়নি'}</span>
                </div>

                {agentPrinterName && (
                  <div className="text-xs text-slate-600 font-medium flex items-center gap-2">
                    <span>টার্গেট প্রিন্টার:</span>
                    <span className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                      🖨️ {agentPrinterName}
                    </span>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="space-y-3 text-xs text-slate-600">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <span>📌 এটি কীভাবে কাজ করে?</span>
                </h4>
                <ol className="list-decimal list-inside space-y-2 leading-relaxed bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80 text-slate-700">
                  <li>নিচের ডাউনলোড বাটন থেকে ১-ক্লিকে **`start_bskbd_direct_print_agent.bat`** ফাইলটি ডাউনলোড করুন।</li>
                  <li>ডাউনলোড করা ফাইলটির ওপর **ডাবল ক্লিক (Double Click)** করে রান করুন।</li>
                  <li>একটি কালো উইন্ডো ওপেন থাকবে যা ব্যাকগ্রাউন্ডে আপনার HP M404dn প্রিন্টারের সাথে ওয়েবসাইটকে যুক্ত করবে।</li>
                  <li>এখন ওয়েবসাইট থেকে **"⚡ ডাইরেক্ট প্রিন্ট (১-ক্লিক)"** চাপলেই কোনো ব্রাউজার ডায়ালগ বা সাদা পেজের ঝামেলা ছাড়াই ১ সেকেন্ডে সরাসরি প্রিন্ট বের হবে!</li>
                </ol>
              </div>

              {/* Download Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={downloadBatchAgentScript}
                  className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Download size={16} />
                  <span>Windows Batch Agent ডাউনলোড (.bat)</span>
                </button>
                <button
                  onClick={downloadAgentScript}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Python Script Download"
                >
                  <Download size={14} />
                  <span>.py Script</span>
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  onClick={() => setIsAgentModalOpen(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  ফিরে যান
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="p-3 bg-red-100/80 rounded-2xl text-red-600">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">মুছে ফেলার নিশ্চিতকরণ</h3>
                <p className="text-xs text-slate-500 font-medium">এই আবেদনপত্রটি স্থায়ীভাবে মুছে ফেলা হবে</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-700 leading-relaxed mb-6 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              আপনি কি সত্যি <span className="font-bold text-red-600">"{deleteConfirmTarget.name}"</span> এর এই আবেদনপত্রটি স্থায়ীভাবে মুছে ফেলতে চান?
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-xl transition-all shadow-md shadow-red-200 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 size={16} />
                <span>হ্যাঁ, মুছে ফেলুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT SHEET COMPONENT (Visible during window.print) */}
      <div className="print-only-container">
        {printingEntries.map((entry) => (
          <div key={entry.id} className="printable-sheet bg-white text-black leading-tight">
            <div className="sheet-box border-0 p-4 bg-white font-serif">
              
              {/* Header section */}
              <div className="flex items-end justify-between border-b-2 border-black pb-1.5 mb-3">
                <div className="flex items-end">
                  <img 
                    src="https://lh3.googleusercontent.com/d/1x7Fp3Wsk8PqHLmMePPaah1wPdjs4SSvr" 
                    alt="BSK Logo" 
                    className="h-11 w-auto object-contain"
                  />
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-black tracking-wide">
                    {entry.department || "প্রশাসন বিভাগ"}
                  </span>
                </div>
              </div>

              {/* Title */}
              <div className="text-center my-3">
                <h1 className="text-lg font-black inline-block border-b-2 border-black pb-0.5 px-4 tracking-wide">
                  দৈনন্দিন জরুরি খরচের অনুমোদনপত্র
                </h1>
              </div>

              {/* Applicant & Khater Nam Header Lines */}
              <div className="space-y-2 text-xs font-bold mb-3">
                <div className="flex items-center">
                  <span className="font-extrabold whitespace-nowrap text-sm">আবেদনকারীর নাম:</span>
                  <span className="border-b border-black flex-1 ml-2 font-black text-sm pl-2">
                    {entry.applicantName}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center flex-1">
                    <span className="font-extrabold whitespace-nowrap text-sm">খাতের নাম:</span>
                    <span className="border-b border-black flex-1 ml-2 font-black text-sm pl-2">
                      {entry.budgetHead}
                    </span>
                  </div>
                  <div className="flex items-center w-36">
                    <span className="font-extrabold whitespace-nowrap text-sm">তারিখ:</span>
                    <span className="border-b border-black flex-1 ml-2 text-center font-black text-sm">
                      {formatBengaliDateDDMMYYYY(entry.date)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full border-collapse border border-black text-xs my-2">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-black px-2 py-1.5 w-10 text-center font-black text-xs align-middle">ক্রম</th>
                    <th className="border border-black px-3 py-1.5 text-center font-black text-xs align-middle">কাজের/ক্রয়ের বিবরণ</th>
                    <th className="border border-black px-3 py-1.5 w-28 text-center font-black text-xs align-middle">সম্ভাব্য ব্যয়</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 10 }).map((_, index) => {
                    const item = entry.items && entry.items[index];
                    return (
                      <tr key={index} className="h-6">
                        <td className="border border-black px-2 py-1 text-center font-bold align-middle">
                          {toBengaliNumerals(index + 1)}
                        </td>
                        <td className="border border-black px-3 py-1 text-center font-medium align-middle">
                          {item ? item.description : ''}
                        </td>
                        <td className="border border-black px-3 py-1 text-center font-bold align-middle">
                          {item && item.estimatedExpense ? toBengaliNumerals(Number(item.estimatedExpense).toLocaleString()) : ''}
                        </td>
                      </tr>
                    );
                  })}
                  
                  {/* Total Row */}
                  <tr className="font-black">
                    <td colSpan={2} className="border border-black px-3 py-1.5 align-middle font-black">
                      <span className="font-extrabold align-middle">মোট কথায়: </span>
                      <span className="font-bold ml-1 align-middle">{entry.totalInWords}</span>
                    </td>
                    <td className="border border-black px-3 py-1.5 text-center align-middle text-xs font-black">
                      ৳ {toBengaliNumerals((entry.totalAmount || 0).toLocaleString())}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Signatures at Bottom */}
              <div className="grid grid-cols-3 gap-4 text-center text-xs font-black mt-auto pt-4">
                <div>
                  <div className="border-t border-black pt-1">আবেদনকারী</div>
                </div>
                <div>
                  <div className="border-t border-black pt-1">সহ. পরিচালক</div>
                </div>
                <div>
                  <div className="border-t border-black pt-1">যুগ্ম-পরিচালক</div>
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>

      {/* Embedded CSS for Print Mode (A4 Landscape Half Page) */}
      <style>{`
        @media screen {
          .print-only-container {
            display: none;
          }
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 0mm;
          }

          html, body {
            width: 297mm !important;
            height: 100% !important;
            max-height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Hide all UI elements except the printable approval sheet */
          body > *:not(.print-only-container), .no-print, nav, header, sidebar, button {
            display: none !important;
          }

          .print-only-container {
            display: flex !important;
            flex-direction: row !important;
            justify-content: center !important;
            align-items: flex-start !important;
            gap: 8mm !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 297mm !important;
            height: 195mm !important;
            max-height: 195mm !important;
            background: white;
            padding-top: 2mm !important;
            box-sizing: border-box;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          .printable-sheet {
            width: 138mm !important;
            height: 185mm !important;
            max-height: 185mm !important;
            padding: 4mm 5mm 4mm 5mm !important;
            margin: 0 !important;
            box-sizing: border-box;
            border: 1.5px solid #000 !important;
            font-family: 'SolaimanLipi', 'Siyam Rupali', 'Kalpurush', sans-serif, serif;
            font-size: 11pt;
            line-height: 1.2;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
          }

          .cut-line-react {
            display: block !important;
            position: absolute;
            left: 148.5mm;
            top: 4mm;
            bottom: 8mm;
            border-left: 1px dashed #94a3b8;
          }

          .sheet-box {
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
}
