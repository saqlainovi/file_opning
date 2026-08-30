import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  setDoc,
  getDoc,
  updateDoc,
  writeBatch,
  where,
  getDocs
} from 'firebase/firestore';
import { 
  Plus, 
  Search, 
  LogOut, 
  Filter, 
  Download, 
  RefreshCw, 
  FileText, 
  Layers, 
  Users, 
  User,
  Calendar, 
  Trash2, 
  Check, 
  X,
  AlertCircle,
  TrendingUp,
  UserCheck,
  ChevronDown,
  Lock,
  Mail,
  BookOpen,
  Send,
  Inbox,
  Copy,
  Edit,
  ClipboardList,
  CheckCircle,
  Menu,
  Settings,
  Save,
  ArrowUp,
  ArrowDown,
  Database,
  Key,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { INITIAL_BUDGET_DATA } from '../budgetData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { FileEntry, MemoEntry, ExpenseEntry, DEPARTMENTS, SUBJECTS_BY_DEPT, DESIGNATIONS, RESPONSIBLE_PERSONS, MEMO_DEPARTMENTS, MEMO_SUBJECTS, MEMO_DESIGNATIONS, MEMO_RESPONSIBLE_PERSONS } from '../types';
import EmployeeDatabase from './EmployeeDatabase';
import DailyExpenseApproval from './DailyExpenseApproval';
import PilotProject from './PilotProject';
import DatabaseBackupModal from './DatabaseBackupModal';

const toBengali = (str: string) => {
  if (!str) return '';
  const bnNums: { [key: string]: string } = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
  return str.replace(/[0-9]/g, w => bnNums[w] || w);
};

const translatePartToBengali = (p: string) => {
  if (!p || p === 'None') return '';
  const translations: Record<string, string> = {
    'Part 1': 'খণ্ড ১',
    'Part 2': 'খণ্ড ২',
    'Part 3': 'খণ্ড ৩',
    'Part 4': 'খণ্ড ৪',
    'Part 5': 'খণ্ড ৫'
  };
  return translations[p] || p;
};

const normalizeResponsiblePerson = (person: string | undefined): string => {
  if (!person) return '';
  const trimmed = person.trim();
  if (/^firo[jz](\s+al[ao]m)?$/i.test(trimmed)) {
    return 'Firoj Alom';
  }
  if (trimmed === 'ফিরোজ' || trimmed === 'ফিরোজ আলম') {
    return 'ফিরোজ আলম';
  }
  return trimmed;
};

export default function FileRegister() {
  const { userProfile, logout, updateProfile, isLocalSandbox } = useAuth();
  const isSuperAdmin = userProfile?.email === 'ovi.it' || userProfile?.email === 'bskbdorg@gmail.com' || userProfile?.designation === 'Super Admin';
  
  const hasMenuAccess = (tab: string) => {
    if (userProfile?.email === 'ovi.it' || userProfile?.email === 'bskbdorg@gmail.com' || userProfile?.designation === 'Super Admin') return true;
    if (!userProfile?.permissions) return true; // fallback for backwards compatibility
    const val = (userProfile.permissions.menus as any)?.[tab];
    if (val === undefined) return true; // Default to allowed for newly added modules
    return !!val;
  };

  const hasActionAccess = (section: 'files' | 'memos' | 'budget' | 'expense' | 'employees' | 'dailyExpenseApproval', action: 'create' | 'edit' | 'delete') => {
    if (userProfile?.email === 'ovi.it' || userProfile?.email === 'bskbdorg@gmail.com' || userProfile?.designation === 'Super Admin') return true;
    if (!userProfile?.permissions) return true; // fallback for backwards compatibility
    const sec = (userProfile.permissions.actions as any)?.[section];
    if (!sec) return true; // Default to allowed if section isn't specified
    const val = sec[action];
    if (val === undefined) return true; // Default to allowed if action isn't specified
    return !!val;
  };
  
  // Real-time states
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [fileSortOrder, setFileSortOrder] = useState<'asc' | 'desc'>('desc');
  const [memos, setMemos] = useState<MemoEntry[]>([]);
  const [memoSortOrder, setMemoSortOrder] = useState<'asc' | 'desc'>('desc');
  // Budget & Expense state
  
  // Budgets state
  const [budgets, setBudgets] = useState<any[]>([]);
  const hasSeededRef = useRef(false);
  const hasAutoFixedFilesRef = useRef(false);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('2026-2027');
  const [isAddBudgetModalOpen, setIsAddBudgetModalOpen] = useState(false);
  const [isBudgetCustomResponsible, setIsBudgetCustomResponsible] = useState(false);
  const [budgetCustomResponsible, setBudgetCustomResponsible] = useState('');
  const [budgetErrorMsg, setBudgetErrorMsg] = useState('');

  // Budget Edit Modal states
  const [isEditBudgetModalOpen, setIsEditBudgetModalOpen] = useState(false);
  const [editBudgetId, setEditBudgetId] = useState('');
  const [editBudgetSl, setEditBudgetSl] = useState('');
  const [editBudgetCode, setEditBudgetCode] = useState('');
  const [editBudgetHead, setEditBudgetHead] = useState('');
  const [editBudgetResponsible, setEditBudgetResponsible] = useState('');
  const [editBudgetFigure, setEditBudgetFigure] = useState<number | string>('');
  const [editBudgetFiscalYear, setEditBudgetFiscalYear] = useState('2026-2027');
  const [isEditBudgetCustomResponsible, setIsEditBudgetCustomResponsible] = useState(false);
  const [editBudgetCustomResponsible, setEditBudgetCustomResponsible] = useState('');

  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [expandedBudgetCode, setExpandedBudgetCode] = useState<string | null>(null);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [expenseErrorMsg, setExpenseErrorMsg] = useState('');
  const [addExpenseType, setAddExpenseType] = useState<'Advance' | 'Paid' | 'Payment'>('Paid');
  const [addExpenseSubType, setAddExpenseSubType] = useState<'Fixed' | 'Adjustment' | 'Complete'>('Fixed');
  const [addExpenseIsFixed, setAddExpenseIsFixed] = useState(false);
  const [addExpenseAmount, setAddExpenseAmount] = useState('');
  const [addExpenseBudgetCode, setAddExpenseBudgetCode] = useState('');

  // Expense Edit states
  const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState(false);
  const [editExpenseId, setEditExpenseId] = useState('');
  const [editExpenseDate, setEditExpenseDate] = useState('');
  const [editExpenseBudgetCode, setEditExpenseBudgetCode] = useState('');
  const [editExpenseAmount, setEditExpenseAmount] = useState('');
  const [editExpenseDescription, setEditExpenseDescription] = useState('');
  const [editExpenseType, setEditExpenseType] = useState<'Advance' | 'Paid' | 'Payment'>('Paid');
  const [editExpenseSubType, setEditExpenseSubType] = useState<'Fixed' | 'Adjustment' | 'Complete'>('Fixed');
  const [editExpenseIsFixed, setEditExpenseIsFixed] = useState(false);
  const [editExpenseFiscalYear, setEditExpenseFiscalYear] = useState('');
  const [editExpenseErrorMsg, setEditExpenseErrorMsg] = useState('');

  // Local Data Migration states
  const [localSandboxBudgetsCount, setLocalSandboxBudgetsCount] = useState(0);
  const [localSandboxExpensesCount, setLocalSandboxExpensesCount] = useState(0);
  const [isMigratingData, setIsMigratingData] = useState(false);
  const [migrationSuccess, setMigrationSuccess] = useState(false);

  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingMemos, setLoadingMemos] = useState(true);

  // View modes
  const [activeTab, setActiveTab] = useState<'welcome' | 'files' | 'memos' | 'budget' | 'expense' | 'analytics' | 'security' | 'employees' | 'dailyExpenseApproval' | 'pilotProjectPrimary' | 'pilotProjectSecondary' | 'pilotProjectMadhyomik' | 'pilotProjectUchchoMadhyomik'>('welcome');
  const [isPilotProjectMenuOpen, setIsPilotProjectMenuOpen] = useState(true);
  const [registerViewMode, setRegisterViewMode] = useState<'split' | 'files' | 'memos'>('files');
  const [lang, setLang] = useState<'BN' | 'EN'>('BN');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Copy to clipboard state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Search & Global filters
  const [searchQuery, setSearchQuery] = useState('');
  const [memoSearchQuery, setMemoSearchQuery] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddMemoModalOpen, setIsAddMemoModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [memoErrorMsg, setMemoErrorMsg] = useState('');

  // Delete Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'file' | 'memo' | 'admin' | 'pin' | 'budget' | 'expense';
    id: string;
    name: string;
  }>({
    isOpen: false,
    type: 'file',
    id: '',
    name: ''
  });

  // ------------------------------------------
  // FORM FIELDS: FILE REGISTER
  // ------------------------------------------
  const [openingDate, setOpeningDate] = useState('01.07.2026');
  const [department, setDepartment] = useState('বিএসকে.হিসাব');
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [customDept, setCustomDept] = useState('');
  const [subject, setSubject] = useState('প্রভিডেন্ট ফান্ড');
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [customSubject, setCustomSubject] = useState('');
  const [openingYear, setOpeningYear] = useState('2026');
  const [responsiblePerson, setResponsiblePerson] = useState('মনির');
  const [isCustomResponsiblePerson, setIsCustomResponsiblePerson] = useState(false);
  const [customResponsiblePerson, setCustomResponsiblePerson] = useState('');
  const [designation, setDesignation] = useState('যুগ্ম পরিচালক (JD)');
  const [isCustomDesignation, setIsCustomDesignation] = useState(false);
  const [customDesignation, setCustomDesignation] = useState('');
  const [manualSI, setManualSI] = useState('');
  const [useAutoSI, setUseAutoSI] = useState(true);

  // Firestore-driven dropdown options for Memos
  const [dbDropdownOptions, setDbDropdownOptions] = useState<{
    departments: string[];
    subjects: string[];
    designations: string[];
    responsible_persons: string[];
  }>({
    departments: [],
    subjects: [],
    designations: [],
    responsible_persons: []
  });

  // Manage options modal states
  const [isManageOptionsModalOpen, setIsManageOptionsModalOpen] = useState(false);
  const [manageOptionsType, setManageOptionsType] = useState<'departments' | 'subjects' | 'designations' | 'responsible_persons'>('departments');
  const [manageOptionsTitle, setManageOptionsTitle] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');
  const [editingOptionIdx, setEditingOptionIdx] = useState<number | null>(null);
  const [editingOptionValue, setEditingOptionValue] = useState('');
  const [deletingOptionIdx, setDeletingOptionIdx] = useState<number | null>(null);
  const [addOptionError, setAddOptionError] = useState('');
  const [isDatabaseBackupModalOpen, setIsDatabaseBackupModalOpen] = useState(false);

  // ------------------------------------------
  // FORM FIELDS: MEMO REGISTER
  // ------------------------------------------
  const [memoOpeningDate, setMemoOpeningDate] = useState(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  });
  const [memoDepartment, setMemoDepartment] = useState('');
  const [isMemoCustomDept, setIsMemoCustomDept] = useState(false);
  const [memoCustomDept, setMemoCustomDept] = useState('');
  const [memoSubject, setMemoSubject] = useState('');
  const [isMemoCustomSubject, setIsMemoCustomSubject] = useState(false);
  const [memoCustomSubject, setMemoCustomSubject] = useState('');
  const [memoReceiver, setMemoReceiver] = useState('');
  const [memoNote, setMemoNote] = useState('');
  const [memoResponsiblePerson, setMemoResponsiblePerson] = useState('');
  const [isMemoCustomResponsiblePerson, setIsMemoCustomResponsiblePerson] = useState(false);
  const [memoCustomResponsiblePerson, setMemoCustomResponsiblePerson] = useState('');
  const [memoDesignation, setMemoDesignation] = useState('');
  const [isMemoCustomDesignation, setIsMemoCustomDesignation] = useState(false);
  const [memoCustomDesignation, setMemoCustomDesignation] = useState('');
  const [manualMemoSI, setManualMemoSI] = useState('');
  const [useMemoAutoSI, setUseMemoAutoSI] = useState(true);

  // ------------------------------------------
  // EXCEL-LIKE COLUMN FILTER DROPDOWNS: FILES
  // ------------------------------------------
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [selectedDesignations, setSelectedDesignations] = useState<string[]>([]);

  // ------------------------------------------
  // EXCEL-LIKE COLUMN FILTER DROPDOWNS: MEMOS
  // ------------------------------------------
  const [activeMemoFilterColumn, setActiveMemoFilterColumn] = useState<string | null>(null);
  const [selectedMemoDepts, setSelectedMemoDepts] = useState<string[]>([]);
  const [selectedMemoSubjects, setSelectedMemoSubjects] = useState<string[]>([]);
  const [selectedMemoPeople, setSelectedMemoPeople] = useState<string[]>([]);
  const [selectedMemoDesignations, setSelectedMemoDesignations] = useState<string[]>([]);
  const [selectedMemoReceivers, setSelectedMemoReceivers] = useState<string[]>([]);

  // Designation editing for active session user
  const [isEditingMyDesignation, setIsEditingMyDesignation] = useState(false);
  const [newMyDesignation, setNewMyDesignation] = useState(userProfile?.designation || 'Admin Officer');

  // Real-time clock state
  const [liveTime, setLiveTime] = useState('');

  // ------------------------------------------
  // STATE HOOTS: EDIT, NOTES, PARTS, & SECURITY LOGS
  // ------------------------------------------
  const [part, setPart] = useState('None');
  const [fileNote, setFileNote] = useState('');
  const [memoPart, setMemoPart] = useState('None');

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFileType, setEditingFileType] = useState<'file' | 'memo' | null>(null);
  const [editingFileId, setEditingFileId] = useState('');
  const [editSI, setEditSI] = useState('');
  const [editOpeningDate, setEditOpeningDate] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editResponsiblePerson, setEditResponsiblePerson] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editPart, setEditPart] = useState('None');
  const [editFileNote, setEditFileNote] = useState('');
  const [editOpeningYear, setEditOpeningYear] = useState('');
  const [editReceiver, setEditReceiver] = useState('');
  const [editMemoNote, setEditMemoNote] = useState('');
  const [editFileName, setEditFileName] = useState('');
  const [editMemoNumber, setEditMemoNumber] = useState('');
  const [isEditCustomDept, setIsEditCustomDept] = useState(false);
  const [editCustomDept, setEditCustomDept] = useState('');
  const [isEditCustomSubject, setIsEditCustomSubject] = useState(false);
  const [editCustomSubject, setEditCustomSubject] = useState('');
  const [isEditCustomResponsiblePerson, setIsEditCustomResponsiblePerson] = useState(false);
  const [editCustomResponsiblePerson, setEditCustomResponsiblePerson] = useState('');
  const [isEditCustomDesignation, setIsEditCustomDesignation] = useState(false);
  const [editCustomDesignation, setEditCustomDesignation] = useState('');

  // Notes Modal States
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteType, setNoteType] = useState<'file' | 'memo' | null>(null);
  const [noteRecordId, setNoteRecordId] = useState('');
  const [noteRecordName, setNoteRecordName] = useState('');
  const [currentNoteText, setCurrentNoteText] = useState('');

  // Security Admin PIN Codes & Action Logs States
  const [pinName, setPinName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [adminPins, setAdminPins] = useState<{ id: string; name: string; pin: string }[]>([]);
  const [actionLogs, setActionLogs] = useState<{ timestamp: string; userEmail: string; userName: string; actionType: string; description: string }[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditTypeFilter, setAuditTypeFilter] = useState('all');
  const [verifyPinInput, setVerifyPinInput] = useState('');
  const [verifyPinError, setVerifyPinError] = useState('');

  // Security Admin Custom IDs States
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminDesignation, setNewAdminDesignation] = useState('Admin Officer');
  const [newAdminRole, setNewAdminRole] = useState<'Admin' | 'Super Admin'>('Admin');
  const [isNewAdminCustomDesignation, setIsNewAdminCustomDesignation] = useState(false);
  const [newAdminCustomDesignation, setNewAdminCustomDesignation] = useState('');
  const [verifyPinSuccess, setVerifyPinSuccess] = useState('');

  // Custom User Permissions States
  const [permissionMenus, setPermissionMenus] = useState({
    welcome: true,
    files: true,
    memos: true,
    budget: true,
    expense: true,
    analytics: true,
    employees: true,
    dailyExpenseApproval: true,
    security: false,
  });

  const [permissionActions, setPermissionActions] = useState({
    files: { create: true, edit: true, delete: true },
    memos: { create: true, delete: true },
    budget: { create: true, edit: true, delete: true },
    expense: { create: true, edit: true, delete: true },
    employees: { create: true, edit: true, delete: true },
    dailyExpenseApproval: { create: true, edit: true, delete: true }
  });

  // Edit permissions for existing user modal states
  const [isEditPermissionsModalOpen, setIsEditPermissionsModalOpen] = useState(false);
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<any | null>(null);
  const [editingPermissionMenus, setEditingPermissionMenus] = useState({
    welcome: true,
    files: true,
    memos: true,
    budget: true,
    expense: true,
    analytics: true,
    employees: true,
    dailyExpenseApproval: true,
    security: false,
  });
  const [editingPermissionActions, setEditingPermissionActions] = useState({
    files: { create: true, edit: true, delete: true },
    memos: { create: true, delete: true },
    budget: { create: true, edit: true, delete: true },
    expense: { create: true, edit: true, delete: true },
    employees: { create: true, edit: true, delete: true },
    dailyExpenseApproval: { create: true, edit: true, delete: true }
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString('en-US', { hour12: true }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!hasMenuAccess(activeTab)) {
      const allTabs = ['welcome', 'files', 'memos', 'budget', 'expense', 'analytics', 'security', 'employees', 'dailyExpenseApproval'];
      const allowed = allTabs.find(t => hasMenuAccess(t));
      if (allowed) {
        setActiveTab(allowed);
      }
    }
  }, [activeTab, userProfile]);

  // Check for local sandbox data that can be migrated to live database
  useEffect(() => {
    if (!isLocalSandbox) {
      try {
        const localBuds = JSON.parse(localStorage.getItem('local_sandbox_budgets') || '[]');
        const localExps = JSON.parse(localStorage.getItem('local_sandbox_expenses') || '[]');
        setLocalSandboxBudgetsCount(localBuds.length);
        setLocalSandboxExpensesCount(localExps.length);
      } catch (e) {
        console.error("Error reading local storage sandbox data:", e);
      }
    } else {
      setLocalSandboxBudgetsCount(0);
      setLocalSandboxExpensesCount(0);
    }
  }, [isLocalSandbox, migrationSuccess]);

  // Real-time Firestore Sync for Files
  useEffect(() => {
    if (isLocalSandbox) {
      const localFiles = localStorage.getItem('local_sandbox_files');
      if (localFiles) {
        const parsed = JSON.parse(localFiles) as FileEntry[];
        const normalized = parsed.map(f => {
          let updated = { ...f };
          if (updated.department === 'BSK.CMLP') {
            updated.department = 'BSK.CMLP.';
          }
          if (updated.fileName) {
            updated.fileName = updated.fileName
              .replace(/(\d{4})-(\d+)/g, '$1.$2')
              .replace(/\.{2,}/g, '.');
          }
          if (updated.openingDate === '01.01.2026' || updated.openingDate === '01.01.26') {
            updated.openingDate = '01.07.2026';
            updated.openingYear = '2026';
          }
          updated.responsiblePerson = normalizeResponsiblePerson(updated.responsiblePerson);
          return updated;
        });
        setFiles(normalized);
      } else {
        const initialMockFiles: FileEntry[] = [
          {
            id: 'mock-file-1',
            si: '001',
            openingDate: '15.01.2026',
            department: 'BSK.ACC',
            subject: 'Provident Fund',
            openingYear: '2026',
            responsiblePerson: 'Monir',
            designation: 'JD',
            fileName: 'BSK.ACC.PF-2026-001',
            createdBy: 'local-sandbox-user',
            createdByName: 'Sandbox Admin',
            createdByEmail: 'ovi.softt@gmail.com'
          },
          {
            id: 'mock-file-2',
            si: '002',
            openingDate: '20.02.2026',
            department: 'BSK.ADMIN',
            subject: 'Office Security',
            openingYear: '2026',
            responsiblePerson: 'Kamal',
            designation: 'AD',
            fileName: 'BSK.ADMIN.SEC-2026-002',
            createdBy: 'local-sandbox-user',
            createdByName: 'Sandbox Admin',
            createdByEmail: 'ovi.softt@gmail.com'
          }
        ];
        setFiles(initialMockFiles);
        localStorage.setItem('local_sandbox_files', JSON.stringify(initialMockFiles));
      }
      setLoadingFiles(false);
      return;
    }

    const q = query(collection(db, 'files'), orderBy('si', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fileList: FileEntry[] = [];
      let needsDatabaseFix = false;

      snapshot.forEach((doc) => {
        const data = doc.data() as FileEntry;
        let isUpdated = false;

        if (data.department === 'BSK.CMLP') {
          data.department = 'BSK.CMLP.';
          isUpdated = true;
        }

        // Clean file name
        if (data.fileName) {
          const cleanedName = data.fileName
            .replace(/(\d{4})-(\d+)/g, '$1.$2')
            .replace(/\.{2,}/g, '.');
          if (cleanedName !== data.fileName) {
            data.fileName = cleanedName;
            isUpdated = true;
          }
        }

        // Clean opening date
        if (data.openingDate === '01.01.2026' || data.openingDate === '01.01.26') {
          data.openingDate = '01.07.2026';
          data.openingYear = '2026';
          isUpdated = true;
        }

        if (isUpdated) {
          needsDatabaseFix = true;
        }

        data.responsiblePerson = normalizeResponsiblePerson(data.responsiblePerson);
        fileList.push({ id: doc.id, ...data });
      });

      setFiles(fileList);
      setLoadingFiles(false);

      // Perform a silent database fix if we are Super Admin and database needs it
      if (needsDatabaseFix && isSuperAdmin && !hasAutoFixedFilesRef.current) {
        hasAutoFixedFilesRef.current = true;
        const batch = writeBatch(db);
        snapshot.forEach((docSnap) => {
          const file = docSnap.data() as FileEntry;
          let shouldUpdateThisDoc = false;
          const updateFields: any = {};

          if (file.department === 'BSK.CMLP') {
            updateFields.department = 'BSK.CMLP.';
            shouldUpdateThisDoc = true;
          }

          if (file.fileName) {
            const cleanedName = file.fileName
              .replace(/(\d{4})-(\d+)/g, '$1.$2')
              .replace(/\.{2,}/g, '.');
            if (cleanedName !== file.fileName) {
              updateFields.fileName = cleanedName;
              shouldUpdateThisDoc = true;
            }
          }

          if (file.openingDate === '01.01.2026' || file.openingDate === '01.01.26') {
            updateFields.openingDate = '01.07.2026';
            updateFields.openingYear = '2026';
            shouldUpdateThisDoc = true;
          }

          if (shouldUpdateThisDoc) {
            batch.update(docSnap.ref, updateFields);
          }
        });

        batch.commit().then(() => {
          console.log("Database successfully auto-formatted by Super Admin session.");
        }).catch((err) => {
          console.error("Auto-formatting database failed:", err);
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'files');
      setLoadingFiles(false);
    });

    return () => unsubscribe();
  }, [isLocalSandbox, isSuperAdmin]);

  // Real-time Firestore Sync for Memos
  useEffect(() => {
    if (isLocalSandbox) {
      const localMemos = localStorage.getItem('local_sandbox_memos');
      if (localMemos) {
        const parsed = JSON.parse(localMemos) as MemoEntry[];
        const normalized = parsed.map(m => {
          let updated = { ...m };
          if (updated.department === 'BSK.CMLP') {
            updated.department = 'BSK.CMLP.';
          }
          updated.responsiblePerson = normalizeResponsiblePerson(updated.responsiblePerson);
          return updated;
        });
        setMemos(normalized);
      } else {
        const initialMockMemos: MemoEntry[] = [
          {
            id: 'mock-memo-1',
            si: '001',
            openingDate: '18.01.2026',
            department: 'BSK.ACC',
            subject: 'Audit Report',
            receiver: 'Internal Auditor',
            responsiblePerson: 'Santo',
            designation: 'JD',
            memoNumber: 'BSK.ACC.MEMO-2026-001',
            createdBy: 'local-sandbox-user',
            createdByName: 'Sandbox Admin',
            createdByEmail: 'ovi.softt@gmail.com'
          }
        ];
        setMemos(initialMockMemos);
        localStorage.setItem('local_sandbox_memos', JSON.stringify(initialMockMemos));
      }
      setLoadingMemos(false);
      return;
    }

    const q = query(collection(db, 'memos'), orderBy('si', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memoList: MemoEntry[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as MemoEntry;
        if (data.department === 'BSK.CMLP') {
          data.department = 'BSK.CMLP.';
        }
        data.responsiblePerson = normalizeResponsiblePerson(data.responsiblePerson);
        memoList.push({ id: doc.id, ...data });
      });
      setMemos(memoList);
      setLoadingMemos(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'memos');
      setLoadingMemos(false);
    });

    return () => unsubscribe();
  }, [isLocalSandbox]);

  // Sync designation input with loaded session user
  useEffect(() => {
    if (userProfile?.designation) {
      setNewMyDesignation(userProfile.designation);
    }
  }, [userProfile]);

  // Next logical serial numbers (padded to 3 digits)
  const nextSI = useMemo(() => {
    if (files.length === 0) return '001';
    const numericSIs = files.map(f => parseInt(f.si, 10)).filter(n => !isNaN(n));
    if (numericSIs.length === 0) return '001';
    const maxSI = Math.max(...numericSIs);
    return String(maxSI + 1).padStart(3, '0');
  }, [files]);

  const nextMemoSI = useMemo(() => {
    if (memos.length === 0) return '001';
    const numericSIs = memos.map(m => parseInt(m.si, 10)).filter(n => !isNaN(n));
    if (numericSIs.length === 0) return '001';
    const maxSI = Math.max(...numericSIs);
    return String(maxSI + 1).padStart(3, '0');
  }, [memos]);

  // Derived options Lists (Predefined + DB values)
  const departmentOptions = useMemo(() => {
    const fromDB = files.map(f => f.department);
    const combined = Array.from(new Set([...DEPARTMENTS, ...fromDB]));
    const excluded = ['BSK.AIS', 'BSK.AIS.', 'BSL.ADMIN.', 'BSK.MBFII'];
    return combined.filter(d => d !== 'BSK.CMLP' && !excluded.includes(d)).sort();
  }, [files]);

  const memoDepartmentOptions = useMemo(() => {
    const base = dbDropdownOptions.departments.length > 0 ? dbDropdownOptions.departments : MEMO_DEPARTMENTS;
    const requiredDepts = ['বিসাকে.এইচআর', 'BSK.NBRP-P', 'BSK.NBRP-P(S)', 'BSK.NBRP-P(P)'];
    const mergedBase = Array.from(new Set([...base, ...requiredDepts]));
    const fromDB = memos.map(m => m.department);
    const combined = Array.from(new Set([...mergedBase, ...fromDB]));
    return combined.filter(d => d !== 'BSK.CMLP').sort();
  }, [memos, dbDropdownOptions.departments]);

  const subjectOptions = useMemo(() => {
    const allStandard = Object.values(SUBJECTS_BY_DEPT).flat();
    const fromDB = files.map(f => f.subject);
    const combined = Array.from(new Set([...allStandard, ...fromDB]));
    return combined.sort();
  }, [files]);

  const memoSubjectOptions = useMemo(() => {
    const base = dbDropdownOptions.subjects.length > 0 ? dbDropdownOptions.subjects : MEMO_SUBJECTS;
    const fromDB = memos.map(m => m.subject);
    const combined = Array.from(new Set([...base, ...fromDB]));
    return combined.sort();
  }, [memos, dbDropdownOptions.subjects]);

  const designationOptions = useMemo(() => {
    const fromDB = files.map(f => f.designation).filter(Boolean);
    const combined = Array.from(new Set([...DESIGNATIONS, ...fromDB]));
    return combined.sort();
  }, [files]);

  const memoDesignationOptions = useMemo(() => {
    const cleanDsg = (val: string) => {
      if (!val) return '';
      return val.replace(/\s*\([^)]*\)/g, '').trim();
    };
    const base = dbDropdownOptions.designations.length > 0 ? dbDropdownOptions.designations : MEMO_DESIGNATIONS;
    const fromDB = memos.map(m => cleanDsg(m.designation)).filter(Boolean);
    const combined = Array.from(new Set([...base.map(cleanDsg), ...fromDB]));
    return combined.sort();
  }, [memos, dbDropdownOptions.designations]);

  const responsiblePersonOptions = useMemo(() => {
    const fromDB = files.map(f => normalizeResponsiblePerson(f.responsiblePerson)).filter(Boolean);
    const normalizedDefault = RESPONSIBLE_PERSONS.map(p => normalizeResponsiblePerson(p));
    const combined = Array.from(new Set([...normalizedDefault, ...fromDB]));
    return combined.sort();
  }, [files]);

  const memoResponsiblePersonOptions = useMemo(() => {
    const base = dbDropdownOptions.responsible_persons.length > 0 ? dbDropdownOptions.responsible_persons : MEMO_RESPONSIBLE_PERSONS;
    const fromDB = memos.map(m => normalizeResponsiblePerson(m.responsiblePerson)).filter(Boolean);
    const normalizedDefault = base.map(p => normalizeResponsiblePerson(p));
    const combined = Array.from(new Set([...normalizedDefault, ...fromDB]));
    return combined.sort();
  }, [memos, dbDropdownOptions.responsible_persons]);

  // Unique lists for column filtering panels
  const uniqueFilterValues = useMemo(() => {
    return {
      departments: Array.from(new Set(files.map(f => f.department))).sort(),
      subjects: Array.from(new Set(files.map(f => f.subject))).sort(),
      years: Array.from(new Set(files.map(f => f.openingYear))).sort(),
      people: Array.from(new Set(files.map(f => normalizeResponsiblePerson(f.responsiblePerson)).filter(Boolean))).sort(),
      designations: Array.from(new Set(files.map(f => f.designation).filter(Boolean))).sort(),
    };
  }, [files]);

  const uniqueMemoFilterValues = useMemo(() => {
    return {
      departments: Array.from(new Set(memos.map(m => m.department))).sort(),
      subjects: Array.from(new Set(memos.map(m => m.subject))).sort(),
      people: Array.from(new Set(memos.map(m => normalizeResponsiblePerson(m.responsiblePerson)).filter(Boolean))).sort(),
      designations: Array.from(new Set(memos.map(m => m.designation).filter(Boolean))).sort(),
      receivers: Array.from(new Set(memos.map(m => m.receiver).filter(Boolean))).sort(),
    };
  }, [memos]);

  // ------------------------------------------
  // LIVE GENERATORS
  // ------------------------------------------
// ------------------------------------------
  // FILE & MEMO CONTEXT (Auto SI Override & Part Blocking)
  // ------------------------------------------
  const currentDeptVal = isCustomDept ? customDept.trim().toUpperCase() : department.trim().toUpperCase();
  const currentSubjectVal = isCustomSubject ? customSubject.trim() : subject.trim();
  const currentPersonVal = isCustomResponsiblePerson ? customResponsiblePerson.trim() : responsiblePerson.trim();
  const currentSIVal = useAutoSI ? nextSI : manualSI.padStart(3, '0');

  const fileContext = useMemo(() => {
    if (!currentDeptVal || !currentSubjectVal) return { targetSI: currentSIVal, existingParts: [] };
    const prefix = `${currentDeptVal}.${currentSubjectVal}.${openingYear}`;
    const matches = files.filter(f => f.department === currentDeptVal && f.subject === currentSubjectVal && f.openingYear === openingYear);
    
    let targetSI = currentSIVal;
    if (matches.length > 0) {
      targetSI = matches[0].si; // Override SI if base file exists
    }
    const existingParts = matches.map(m => m.part || 'None');
    return { targetSI, existingParts };
  }, [currentDeptVal, currentSubjectVal, openingYear, currentSIVal, files]);

  const generatedFileName = useMemo(() => {
    if (!currentDeptVal || !currentSubjectVal) return 'BSK...';
    let rawFileName = `${currentDeptVal}.${currentSubjectVal}.${openingYear}.${fileContext.targetSI}`;
    if (part && part !== 'None') {
      rawFileName += `(${part})`;
    }
    return rawFileName.replace(/\.{2,}/g, '.');
  }, [currentDeptVal, currentSubjectVal, openingYear, fileContext.targetSI, part]);

  const currentMemoDeptVal = isMemoCustomDept ? memoCustomDept.trim().toUpperCase() : memoDepartment.trim().toUpperCase();
  const currentMemoSubjectVal = isMemoCustomSubject ? memoCustomSubject.trim() : memoSubject.trim();
  const currentMemoPersonVal = isMemoCustomResponsiblePerson ? memoCustomResponsiblePerson.trim() : memoResponsiblePerson.trim();
  const currentMemoSIVal = useMemoAutoSI ? nextMemoSI : manualMemoSI.padStart(3, '0');
  
  const memoYear = useMemo(() => {
    const parts = memoOpeningDate.split('.');
    return parts[2] || '2026';
  }, [memoOpeningDate]);

  const memoContext = useMemo(() => {
    if (!currentMemoDeptVal || !currentMemoSubjectVal) return { targetSI: currentMemoSIVal, existingParts: [] };
    const matches = memos.filter(m => m.department === currentMemoDeptVal && m.subject === currentMemoSubjectVal && m.openingDate.split('.')[2] === memoYear);
    
    // Memos should have unique, sequential serial numbers and NOT share the same SI (serial number)
    // with existing memos of the same department and subject in the same year.
    let targetSI = currentMemoSIVal;
    const existingParts = matches.map(m => m.part || 'None');
    return { targetSI, existingParts };
  }, [currentMemoDeptVal, currentMemoSubjectVal, memoYear, currentMemoSIVal, memos]);

  const generatedMemoNumber = useMemo(() => {
    if (!currentMemoDeptVal || !currentMemoSubjectVal) return 'BSK...';
    let rawMemoNumber = `স্মারক নং ${currentMemoDeptVal}.${currentMemoSubjectVal}.${memoYear}.${memoContext.targetSI}`;
    if (memoPart && memoPart !== 'None') {
      rawMemoNumber += `(${translatePartToBengali(memoPart)})`;
    }
    return toBengali(rawMemoNumber);
  }, [currentMemoDeptVal, currentMemoSubjectVal, memoYear, memoContext.targetSI, memoPart]);

  const filteredBudgets = useMemo(() => {
    const list = budgets.length > 0 ? budgets : INITIAL_BUDGET_DATA;
    return list.filter(b => {
      const fy = b.fiscalYear || '2025-2026';
      return fy === selectedFiscalYear;
    });
  }, [budgets, selectedFiscalYear]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const fy = e.fiscalYear || '2025-2026';
      return fy === selectedFiscalYear;
    });
  }, [expenses, selectedFiscalYear]);

  const budgetTotals = useMemo(() => {
    const budgetSum = filteredBudgets.reduce((sum, b) => sum + Number(b.budgetFigure || 0), 0);
    const expenseSum = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const balanceSum = budgetSum - expenseSum;
    return {
      budgetSum,
      expenseSum,
      balanceSum
    };
  }, [filteredBudgets, filteredExpenses]);

  const addExpenseNextSerial = useMemo(() => {
    if (!addExpenseBudgetCode) return '';
    const count = expenses.filter(e => e.budgetCode === addExpenseBudgetCode && (e.fiscalYear || '2025-2026') === selectedFiscalYear).length;
    return `${addExpenseBudgetCode}-${String(count + 1).padStart(2, '0')}`;
  }, [addExpenseBudgetCode, expenses, selectedFiscalYear]);

  const getExpenseSerialNo = useCallback((exp: ExpenseEntry) => {
    if (exp.serialNo && exp.serialNo.startsWith(`${exp.budgetCode}-`)) {
      return exp.serialNo;
    }
    const codeExpenses = expenses.filter(e => e.budgetCode === exp.budgetCode && (e.fiscalYear || '2025-2026') === selectedFiscalYear);
    const sortedChrono = [...codeExpenses].sort((a, b) => {
      const getTime = (item: ExpenseEntry) => {
        if (item.createdAt?.toDate) {
          return item.createdAt.toDate().getTime();
        }
        if (typeof item.createdAt === 'string') {
          const t = new Date(item.createdAt).getTime();
          if (!isNaN(t)) return t;
        }
        if (item.date) {
          const parts = item.date.split('.');
          if (parts.length === 3) {
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
          }
          return new Date(item.date).getTime() || 0;
        }
        return 0;
      };
      return getTime(a) - getTime(b);
    });
    const index = sortedChrono.findIndex(e => e.id === exp.id);
    const pos = index >= 0 ? index + 1 : 1;
    return `${exp.budgetCode}-${String(pos).padStart(2, '0')}`;
  }, [expenses, selectedFiscalYear]);

  const renderExpenseTypeBadge = (exp: ExpenseEntry) => {
    const type = exp.expenseType || 'Paid';
    const subType = exp.subType || (exp.isFixed ? 'Fixed' : 'Fixed');

    let typeBg = 'bg-slate-100 text-slate-700 border-slate-200';
    let typeBn = 'পরিশোধিত';
    if (type === 'Advance') {
      typeBg = 'bg-sky-50 text-sky-700 border-sky-200';
      typeBn = 'অগ্রিম';
    } else if (type === 'Paid') {
      typeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      typeBn = 'পরিশোধিত';
    } else if (type === 'Payment') {
      typeBg = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      typeBn = 'পেমেন্ট';
    }

    let subTypeBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
    let subTypeBn = 'ফিক্সড';
    if (subType === 'Complete') {
      subTypeBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold';
      subTypeBn = 'কমপ্লিট';
    } else if (subType === 'Adjustment') {
      subTypeBadgeClass = 'bg-amber-50 text-amber-800 border-amber-300 font-extrabold';
      subTypeBn = 'অ্যাডজাস্টমেন্ট';
    } else if (subType === 'Fixed') {
      subTypeBadgeClass = 'bg-slate-100 text-slate-800 border-slate-300 font-extrabold';
      subTypeBn = 'ফিক্সড';
    }

    return (
      <div className="inline-flex items-center gap-1.5 flex-wrap">
        <span className={`px-2 py-0.5 rounded-lg font-bold text-[10px] border inline-block ${typeBg}`}>
          {type} ({typeBn})
        </span>
        <span className={`px-2 py-0.5 rounded-lg text-[10px] border inline-block ${subTypeBadgeClass}`}>
          {subType} ({subTypeBn})
        </span>
      </div>
    );
  };

  // ------------------------------------------
  // HANDLERS
  // ------------------------------------------
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateVal = e.target.value;
    if (!dateVal) return;
    const parts = dateVal.split('-');
    if (parts.length === 3) {
      setOpeningDate(`${parts[2]}.${parts[1]}.${parts[0]}`);
      setOpeningYear(parts[0]);
    }
  };

  const handleMemoDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateVal = e.target.value;
    if (!dateVal) return;
    const parts = dateVal.split('-');
    if (parts.length === 3) {
      setMemoOpeningDate(`${parts[2]}.${parts[1]}.${parts[0]}`);
    }
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const finalDept = isCustomDept ? customDept.trim().toUpperCase() : department.trim().toUpperCase();
    const finalSubject = isCustomSubject ? customSubject.trim() : subject.trim();
    const finalDesignation = isCustomDesignation ? customDesignation.trim() : designation.trim();
    const finalSI = fileContext.targetSI;

    if (!finalDept) {
      setErrorMsg('Please specify a department.');
      return;
    }
    if (!finalSubject) {
      setErrorMsg('Please specify a subject / accounts head.');
      return;
    }
    if (!openingYear) {
      setErrorMsg('Please specify an opening year.');
      return;
    }
    if (!finalSI || isNaN(parseInt(finalSI, 10))) {
      setErrorMsg('Please provide a valid numeric serial number.');
      return;
    }

    const collision = files.find(f => f.fileName === generatedFileName);
    if (collision) {
      setErrorMsg(`The file name ${generatedFileName} is already registered.`);
      return;
    }

    try {
      const finalPerson = isCustomResponsiblePerson ? customResponsiblePerson.trim() : responsiblePerson.trim();
      const newFile: Omit<FileEntry, 'id'> = {
        si: finalSI,
        openingDate,
        department: finalDept,
        subject: finalSubject,
        openingYear,
        responsiblePerson: finalPerson,
        designation: finalDesignation,
        fileName: generatedFileName,
        part: part,
        note: fileNote.trim(),
        createdBy: userProfile?.uid || '',
        createdByName: userProfile?.displayName || 'System Admin',
        createdByEmail: userProfile?.email || '',
        status: isSuperAdmin ? 'approved' : 'pending'
      };

      if (isLocalSandbox) {
        const fullNewFile: FileEntry = {
          id: `local-file-${Date.now()}`,
          ...newFile,
          createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any
        };
        const updated = [...files, fullNewFile].sort((a,b) => a.si.localeCompare(b.si));
        setFiles(updated);
        localStorage.setItem('local_sandbox_files', JSON.stringify(updated));

        setIsAddModalOpen(false);
        setResponsiblePerson('মনির');
        setIsCustomResponsiblePerson(false);
        setCustomResponsiblePerson('');
        setManualSI('');
        setDepartment('বিএসকে.হিসাব');
        setSubject('প্রভিডেন্ট ফান্ড');
        setDesignation('যুগ্ম পরিচালক (JD)');
        setIsCustomDept(false);
        setCustomDept('');
        setIsCustomSubject(false);
        setCustomSubject('');
        setIsCustomDesignation(false);
        setCustomDesignation('');
        setPart('None');
        setFileNote('');
        logAction('FILE_CREATE', `Created file: ${generatedFileName}`);
        return;
      }

      await addDoc(collection(db, 'files'), {
        ...newFile,
        createdAt: serverTimestamp()
      });

      setIsAddModalOpen(false);
      setResponsiblePerson('মনির');
      setIsCustomResponsiblePerson(false);
      setCustomResponsiblePerson('');
      setManualSI('');
      setDepartment('বিএসকে.হিসাব');
      setSubject('প্রভিডেন্ট ফান্ড');
      setDesignation('যুগ্ম পরিচালক (JD)');
      setIsCustomDept(false);
      setCustomDept('');
      setIsCustomSubject(false);
      setCustomSubject('');
      setIsCustomDesignation(false);
      setCustomDesignation('');
      setPart('None');
      setFileNote('');
      logAction('FILE_CREATE', `Created file: ${generatedFileName}`);
    } catch (error) {
      setErrorMsg('Error creating file record. Check permissions.');
      console.error(error);
    }
  };

  
  
  const handleAddBudget = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (userProfile?.role !== 'Admin') return;
    
    setBudgetErrorMsg('');
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const sl = formData.get('sl') as string;
    const budgetCode = formData.get('budgetCode') as string;
    const budgetHead = formData.get('budgetHead') as string;
    const responsiblePerson = formData.get('responsiblePerson') as string;
    const budgetFigure = Number(formData.get('budgetFigure'));
    const fiscalYear = formData.get('fiscalYear') as string || selectedFiscalYear;

    if (!sl || !budgetCode || !budgetHead || !responsiblePerson || !budgetFigure) {
      setBudgetErrorMsg('Please fill all fields');
      return;
    }

    if (isLocalSandbox) {
      const newBudget = {
        id: `local-budget-${budgetCode}-${Date.now()}`,
        sl,
        budgetCode,
        budgetHead,
        responsiblePerson,
        budgetFigure,
        fiscalYear,
        createdAt: new Date().toISOString(),
        createdBy: userProfile?.email || 'ovi.softt@gmail.com',
        note: ''
      };
      const updated = [...budgets, newBudget];
      localStorage.setItem('local_sandbox_budgets', JSON.stringify(updated));
      setBudgets(updated);
      setIsAddBudgetModalOpen(false);
      setIsBudgetCustomResponsible(false);
      setBudgetCustomResponsible('');
      await logAction('BUDGET_ADD', `Added budget: ${budgetCode} (${fiscalYear})`);
    } else {
      try {
        await addDoc(collection(db, 'budgets'), {
          sl,
          budgetCode,
          budgetHead,
          responsiblePerson,
          budgetFigure,
          fiscalYear,
          createdAt: serverTimestamp(),
          createdBy: userProfile.email,
          note: ''
        });
        setIsAddBudgetModalOpen(false);
        setIsBudgetCustomResponsible(false);
        setBudgetCustomResponsible('');
        await logAction('BUDGET_ADD', `Added budget: ${budgetCode} (${fiscalYear})`);
      } catch (err: any) {
        setBudgetErrorMsg(err.message || 'Failed to add budget');
      }
    }
  };

  const handleMigrateSandboxData = async () => {
    if (!userProfile) {
      alert("অনুগ্রহ করে প্রথমে সিস্টেমে লগইন করুন।");
      return;
    }
    if (confirm("আপনি কি সত্যিই আপনার ব্রাউজারে থাকা অফলাইন স্যান্ডবক্সের সমস্ত বাজেট এবং খরচসমূহ এই লাইভ ডাটাবেজে (FIREBASE-MAIN) কপি করতে চান? (Do you want to copy your offline sandbox budgets and expenses to the live database?)")) {
      setIsMigratingData(true);
      try {
        const localBuds = JSON.parse(localStorage.getItem('local_sandbox_budgets') || '[]');
        const localExps = JSON.parse(localStorage.getItem('local_sandbox_expenses') || '[]');
        
        let budgetsAddedCount = 0;
        let expensesAddedCount = 0;

        // 1. Migrate Budgets
        if (localBuds.length > 0) {
          const existingBudgetsMap = new Map();
          budgets.forEach(b => {
            existingBudgetsMap.set(`${b.budgetCode}_${b.fiscalYear}`, true);
          });

          for (const b of localBuds) {
            const key = `${b.budgetCode}_${b.fiscalYear || '2025-2026'}`;
            if (!existingBudgetsMap.has(key)) {
              await addDoc(collection(db, 'budgets'), {
                sl: b.sl || "99",
                budgetCode: b.budgetCode,
                budgetHead: b.budgetHead,
                responsiblePerson: b.responsiblePerson || "Unknown",
                budgetFigure: Number(b.budgetFigure || 0),
                fiscalYear: b.fiscalYear || "2025-2026",
                note: b.note || "",
                createdAt: serverTimestamp(),
                createdBy: userProfile?.email || "imported"
              });
              budgetsAddedCount++;
            }
          }
        }

        // 2. Migrate Expenses
        if (localExps.length > 0) {
          const existingExpensesMap = new Map();
          expenses.forEach(e => {
            existingExpensesMap.set(`${e.budgetCode}_${e.amount}_${e.date}`, true);
          });

          for (const e of localExps) {
            const dateStr = typeof e.createdAt === 'string' ? e.createdAt : new Date().toISOString();
            const key = `${e.budgetCode}_${e.amount}_${e.date}`;
            if (!existingExpensesMap.has(key)) {
              await addDoc(collection(db, 'expenses'), {
                budgetCode: e.budgetCode,
                amount: Number(e.amount || 0),
                description: e.description || "",
                date: e.date || dateStr.split('T')[0],
                createdAt: serverTimestamp(),
                createdBy: userProfile?.email || "imported",
                fiscalYear: e.fiscalYear || "2025-2026"
              });
              expensesAddedCount++;
            }
          }
        }

        alert(`অভিনন্দন! ${budgetsAddedCount} টি বাজেট এবং ${expensesAddedCount} টি খরচ সফলভাবে লাইভ ফায়ারবেস ডাটাবেজে ইম্পোর্ট করা হয়েছে। (Successfully imported ${budgetsAddedCount} budgets and ${expensesAddedCount} expenses to live Firestore!)`);
        setMigrationSuccess(true);
        setLocalSandboxBudgetsCount(0);
        setLocalSandboxExpensesCount(0);
        await logAction('SANDBOX_MIGRATE', `Migrated ${budgetsAddedCount} budgets and ${expensesAddedCount} expenses from local sandbox`);
      } catch (err: any) {
        console.error("Migration error:", err);
        alert(`ইম্পোর্ট করার সময় একটি ত্রুটি ঘটেছে: ${err.message || err}`);
      } finally {
        setIsMigratingData(false);
      }
    }
  };

  const handleDeleteBudget = (id: string) => {
    if (userProfile?.role !== 'Admin') {
      alert('You must be an Admin to delete budget heads.');
      return;
    }
    if (!id) {
      alert('Cannot delete this budget head because it does not have a database ID.');
      return;
    }
    const found = budgets.find(b => b.id === id);
    const bHead = found ? `${found.budgetCode} - ${found.budgetHead}` : id;
    setDeleteConfirm({
      isOpen: true,
      type: 'budget',
      id: id,
      name: bHead
    });
  };

  const handleOpenEditBudget = (budget: any) => {
    setEditBudgetId(budget.id || '');
    setEditBudgetSl(budget.sl || '');
    setEditBudgetCode(budget.budgetCode || '');
    setEditBudgetHead(budget.budgetHead || '');
    setEditBudgetFigure(budget.budgetFigure || 0);
    setEditBudgetFiscalYear(budget.fiscalYear || '2025-2026');
    
    const isCustom = !RESPONSIBLE_PERSONS.includes(budget.responsiblePerson);
    setIsEditBudgetCustomResponsible(isCustom);
    if (isCustom) {
      setEditBudgetCustomResponsible(budget.responsiblePerson || '');
      setEditBudgetResponsible('');
    } else {
      setEditBudgetResponsible(budget.responsiblePerson || '');
      setEditBudgetCustomResponsible('');
    }
    setIsEditBudgetModalOpen(true);
  };

  const handleSaveEditBudget = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hasActionAccess('budget', 'edit')) {
      alert('You do not have permission to edit budgets.');
      return;
    }
    
    const finalResponsible = isEditBudgetCustomResponsible 
      ? editBudgetCustomResponsible.trim() 
      : editBudgetResponsible.trim();

    if (!editBudgetSl || !editBudgetCode || !editBudgetHead || !finalResponsible || !editBudgetFigure) {
      alert('Please fill all fields');
      return;
    }

    if (isLocalSandbox) {
      const updated = budgets.map(b => {
        if (b.id === editBudgetId) {
          return {
            ...b,
            sl: editBudgetSl,
            budgetCode: editBudgetCode,
            budgetHead: editBudgetHead,
            responsiblePerson: finalResponsible,
            budgetFigure: Number(editBudgetFigure),
            fiscalYear: editBudgetFiscalYear,
            updatedAt: new Date().toISOString(),
            updatedBy: userProfile?.email || 'unknown'
          };
        }
        return b;
      });
      localStorage.setItem('local_sandbox_budgets', JSON.stringify(updated));
      setBudgets(updated);
      setIsEditBudgetModalOpen(false);
      await logAction('BUDGET_EDIT', `Updated budget head ${editBudgetCode} (${editBudgetFiscalYear})`);
    } else {
      try {
        await updateDoc(doc(db, 'budgets', editBudgetId), {
          sl: editBudgetSl,
          budgetCode: editBudgetCode,
          budgetHead: editBudgetHead,
          responsiblePerson: finalResponsible,
          budgetFigure: Number(editBudgetFigure),
          fiscalYear: editBudgetFiscalYear,
          updatedAt: serverTimestamp(),
          updatedBy: userProfile?.email || 'unknown'
        });
        setIsEditBudgetModalOpen(false);
        await logAction('BUDGET_EDIT', `Updated budget head ${editBudgetCode} (${editBudgetFiscalYear})`);
      } catch (err: any) {
        alert(err.message || 'Failed to update budget');
      }
    }
  };

  const handleExportToExcel = () => {
    try {
      // 1. Prepare Budgets Data for selected fiscal year
      const budgetData = filteredBudgets.map(item => {
        const totalExpense = filteredExpenses
          .filter(e => e.budgetCode === item.budgetCode)
          .reduce((sum, e) => sum + e.amount, 0);
        const balance = item.budgetFigure - totalExpense;
        return {
          'SL No': item.sl,
          'Budget Code': item.budgetCode,
          'Budget Head (বাজেট খাত)': item.budgetHead,
          'Responsible Person (দায়িত্বপ্রাপ্ত কর্মকর্তা)': item.responsiblePerson,
          'Budget Figure (বরাদ্দকৃত বাজেট - ৳)': item.budgetFigure,
          'Total Expense (মোট ব্যয় - ৳)': totalExpense,
          'Variance Balance (অবশিষ্ট বাজেট - ৳)': balance,
          'Fiscal Year (অর্থবছর)': item.fiscalYear || '2025-2026',
          'Notes (মন্তব্য)': item.note || ''
        };
      });

      // 2. Prepare Expenses Data for selected fiscal year
      const expenseData = filteredExpenses.map((expense, idx) => {
        const budgetHead = (budgets.length > 0 ? budgets : INITIAL_BUDGET_DATA).find(b => b.budgetCode === expense.budgetCode)?.budgetHead || expense.budgetCode;
        const expSerialNo = getExpenseSerialNo(expense);
        const subType = expense.subType || (expense.isFixed ? 'Fixed' : 'Fixed');

        return {
          'SL No': idx + 1,
          'Serial No (সিরিয়াল নং)': expSerialNo,
          'Date (তারিখ)': expense.date,
          'Budget Code': expense.budgetCode,
          'Budget Head (বাজেট খাত)': budgetHead,
          'Type (ধরণ)': expense.expenseType || 'Paid',
          'Status (স্ট্যাটাস)': subType,
          'Description (ব্যয়ের বিবরণ)': expense.description,
          'Amount (ব্যয়ের পরিমাণ - ৳)': expense.amount,
          'Logged By (রেকর্ডকারী)': expense.createdBy || '',
          'Fiscal Year (অর্থবছর)': expense.fiscalYear || '2025-2026'
        };
      });

      // 3. Create Workbook
      const wb = XLSX.utils.book_new();

      // 4. Create Sheets from json data
      const wsBudgets = XLSX.utils.json_to_sheet(budgetData);
      const wsExpenses = XLSX.utils.json_to_sheet(expenseData);

      // Utility to set dynamic column widths based on maximum length of text in each column
      const fitToColumn = (data: any[]) => {
        if (!data || data.length === 0) return [];
        const keys = Object.keys(data[0]);
        return keys.map(key => {
          let maxLen = key.toString().length;
          data.forEach(row => {
            const val = row[key];
            if (val !== undefined && val !== null) {
              const len = val.toString().length;
              if (len > maxLen) maxLen = len;
            }
          });
          // Account for Bengali character widths slightly and limit max size
          return { wch: Math.min(Math.max(maxLen + 4, 12), 60) };
        });
      };

      wsBudgets['!cols'] = fitToColumn(budgetData);
      wsExpenses['!cols'] = fitToColumn(expenseData);

      // Append sheets to workbook with meaningful local and english names
      XLSX.utils.book_append_sheet(wb, wsBudgets, `Budgets (${selectedFiscalYear})`);
      XLSX.utils.book_append_sheet(wb, wsExpenses, `Expenses (${selectedFiscalYear})`);

      // Write file to initiate download in client browser
      XLSX.writeFile(wb, `Budget_Report_${selectedFiscalYear}_${new Date().toISOString().split('T')[0]}.xlsx`);

      if (userProfile?.role !== 'Admin') {
        logAction('BUDGET_EXPORT', `Exported budget report for ${selectedFiscalYear}`);
      }
    } catch (error) {
      console.error('Failed to export Excel:', error);
      alert('Failed to generate Excel report');
    }
  };

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userProfile) return;
    
    setExpenseErrorMsg('');
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const date = formData.get('expenseDate') as string;
    const budgetCode = formData.get('budgetCode') as string;
    const amount = Number(formData.get('amount'));
    const description = formData.get('description') as string;

    if (!date || !budgetCode || !amount || !description) {
      setExpenseErrorMsg('Please fill all fields');
      return;
    }

    const countForCode = expenses.filter(e => e.budgetCode === budgetCode && (e.fiscalYear || '2025-2026') === selectedFiscalYear).length;
    const serialNo = `${budgetCode}-${String(countForCode + 1).padStart(2, '0')}`;

    const parts = date.split('-');
    const formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`;

    if (isLocalSandbox) {
      const newExpense = {
        id: `local-expense-${Date.now()}`,
        serialNo,
        budgetCode,
        amount,
        date: formattedDate,
        description,
        expenseType: addExpenseType,
        subType: addExpenseSubType,
        isFixed: addExpenseSubType === 'Fixed',
        fiscalYear: selectedFiscalYear,
        createdBy: userProfile.email,
        createdAt: {
          toDate: () => new Date(),
          isoString: new Date().toISOString()
        }
      };
      const updated = [newExpense, ...expenses];
      // Save simpler ISO representation for serializability
      const toSave = updated.map(e => {
        const dateStr = (e.createdAt as any)?.isoString || e.createdAt || new Date().toISOString();
        return {
          ...e,
          createdAt: dateStr
        };
      });
      localStorage.setItem('local_sandbox_expenses', JSON.stringify(toSave));
      setExpenses(updated);
      await logAction('EXPENSE_ADD', `Added ${addExpenseType} (${addExpenseSubType}) expense (${serialNo}) of ৳${amount} for ${budgetCode}`);
      setAddExpenseIsFixed(false);
      setAddExpenseAmount('');
      setAddExpenseBudgetCode('');
      setAddExpenseSubType('Fixed');
      setIsAddExpenseModalOpen(false);
    } else {
      try {
        await addDoc(collection(db, 'expenses'), {
          serialNo,
          budgetCode,
          amount,
          date: formattedDate,
          description,
          expenseType: addExpenseType,
          subType: addExpenseSubType,
          isFixed: addExpenseSubType === 'Fixed',
          fiscalYear: selectedFiscalYear,
          createdBy: userProfile.email,
          createdAt: serverTimestamp(),
        });

        await logAction('EXPENSE_ADD', `Added ${addExpenseType} (${addExpenseSubType}) expense (${serialNo}) of ৳${amount} for ${budgetCode}`);
        setAddExpenseIsFixed(false);
        setAddExpenseAmount('');
        setAddExpenseBudgetCode('');
        setAddExpenseSubType('Fixed');
        setIsAddExpenseModalOpen(false);
      } catch (err: any) {
        setExpenseErrorMsg(err.message || 'Failed to add expense');
      }
    }
  };

  const handleOpenEditExpense = (expense: any) => {
    let initialDate = new Date().toISOString().split('T')[0];
    if (expense.date) {
      const parts = expense.date.split('.');
      if (parts.length === 3) {
        initialDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    const expType = expense.expenseType || 'Paid';
    setEditExpenseId(expense.id || '');
    setEditExpenseDate(initialDate);
    setEditExpenseBudgetCode(expense.budgetCode || '');
    setEditExpenseAmount(expense.amount || '');
    setEditExpenseDescription(expense.description || '');
    setEditExpenseType(expType);
    let initialSub = expense.subType;
    if (!initialSub) {
      initialSub = expense.isFixed ? 'Fixed' : 'Fixed';
    }
    if (expType !== 'Advance' && initialSub === 'Adjustment') {
      initialSub = 'Fixed';
    }
    setEditExpenseSubType(initialSub as any);
    setEditExpenseIsFixed(initialSub === 'Fixed');
    setEditExpenseFiscalYear(expense.fiscalYear || selectedFiscalYear);
    setEditExpenseErrorMsg('');
    setIsEditExpenseModalOpen(true);
  };

  const handleSaveEditExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userProfile) return;

    if (!editExpenseDate || !editExpenseBudgetCode || !editExpenseAmount || !editExpenseDescription) {
      setEditExpenseErrorMsg('Please fill all fields');
      return;
    }

    const parts = editExpenseDate.split('-');
    const formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`;

    let serialNo = expenses.find(e => e.id === editExpenseId)?.serialNo;
    if (!serialNo || !serialNo.startsWith(editExpenseBudgetCode)) {
      const existingForCode = expenses.filter(e => e.budgetCode === editExpenseBudgetCode && e.id !== editExpenseId && (e.fiscalYear || '2025-2026') === editExpenseFiscalYear);
      serialNo = `${editExpenseBudgetCode}-${String(existingForCode.length + 1).padStart(2, '0')}`;
    }

    if (isLocalSandbox) {
      const updated = expenses.map(exp => {
        if (exp.id === editExpenseId) {
          return {
            ...exp,
            serialNo,
            budgetCode: editExpenseBudgetCode,
            amount: Number(editExpenseAmount),
            date: formattedDate,
            description: editExpenseDescription,
            expenseType: editExpenseType,
            subType: editExpenseSubType,
            isFixed: editExpenseSubType === 'Fixed',
            fiscalYear: editExpenseFiscalYear,
            updatedAt: new Date().toISOString(),
            updatedBy: userProfile.email
          };
        }
        return exp;
      });
      const toSave = updated.map(e => {
        const dateStr = (e.createdAt as any)?.isoString || e.createdAt || new Date().toISOString();
        return {
          ...e,
          createdAt: dateStr
        };
      });
      localStorage.setItem('local_sandbox_expenses', JSON.stringify(toSave));
      setExpenses(updated);
      await logAction('EXPENSE_EDIT', `Edited expense (${serialNo}): ৳${editExpenseAmount} for ${editExpenseBudgetCode}`);
      setIsEditExpenseModalOpen(false);
    } else {
      try {
        await updateDoc(doc(db, 'expenses', editExpenseId), {
          serialNo,
          budgetCode: editExpenseBudgetCode,
          amount: Number(editExpenseAmount),
          date: formattedDate,
          description: editExpenseDescription,
          expenseType: editExpenseType,
          subType: editExpenseSubType,
          isFixed: editExpenseSubType === 'Fixed',
          fiscalYear: editExpenseFiscalYear,
          updatedAt: serverTimestamp(),
          updatedBy: userProfile.email
        });

        await logAction('EXPENSE_EDIT', `Edited expense (${serialNo}): ৳${editExpenseAmount} for ${editExpenseBudgetCode}`);
        setIsEditExpenseModalOpen(false);
      } catch (err: any) {
        setEditExpenseErrorMsg(err.message || 'Failed to edit expense');
      }
    }
  };

  const handleDeleteExpense = (id: string) => {
    if (userProfile?.role !== 'Admin') return;
    const found = expenses.find(e => e.id === id);
    const expInfo = found ? `${found.budgetCode}: ৳${found.amount.toLocaleString()} (${found.description || ''})` : id;
    setDeleteConfirm({
      isOpen: true,
      type: 'expense',
      id: id,
      name: expInfo
    });
  };

  // Dropdown Options permanent management for Super Admin
  const getActiveOptionsList = (): string[] => {
    const list = dbDropdownOptions[manageOptionsType] || [];
    if (list.length > 0) {
      if (manageOptionsType === 'departments') {
        const required = ['বিসাকে.এইচআর', 'BSK.NBRP-P', 'BSK.NBRP-P(S)', 'BSK.NBRP-P(P)'];
        return Array.from(new Set([...list, ...required]));
      }
      return list;
    }
    
    // Fallback defaults
    if (manageOptionsType === 'departments') return MEMO_DEPARTMENTS;
    if (manageOptionsType === 'subjects') return MEMO_SUBJECTS;
    if (manageOptionsType === 'designations') return MEMO_DESIGNATIONS;
    if (manageOptionsType === 'responsible_persons') return MEMO_RESPONSIBLE_PERSONS;
    return [];
  };

  const saveDropdownOptionsToDB = async (type: string, values: string[]) => {
    if (isLocalSandbox) {
      const updatedOpts = {
        ...dbDropdownOptions,
        [type]: values
      };
      setDbDropdownOptions(updatedOpts);
      localStorage.setItem('local_sandbox_memo_dropdown_options', JSON.stringify(updatedOpts));
      logAction('MEMO_OPTIONS_UPDATE', `Updated ${type} dropdown options in sandbox.`);
    } else {
      try {
        await setDoc(doc(db, 'memo_dropdown_options', type), {
          values,
          updatedAt: serverTimestamp()
        });
        logAction('MEMO_OPTIONS_UPDATE', `Updated ${type} dropdown options.`);
      } catch (e) {
        console.error("Error saving memo dropdown options:", e);
        handleFirestoreError(e, OperationType.WRITE, `memo_dropdown_options/${type}`);
      }
    }
  };

  const handleAddOption = async () => {
    setAddOptionError('');
    const val = newOptionValue.trim();
    if (!val) return;
    const currentList = [...getActiveOptionsList()];
    if (currentList.includes(val)) {
      setAddOptionError('এই মানটি ইতিমধ্যে তালিকায় রয়েছে।');
      return;
    }
    const newList = [...currentList, val];
    
    await saveDropdownOptionsToDB(manageOptionsType, newList);
    setNewOptionValue('');
  };

  const handleUpdateOption = async (index: number) => {
    if (!editingOptionValue.trim()) return;
    const currentList = [...getActiveOptionsList()];
    currentList[index] = editingOptionValue.trim();
    
    await saveDropdownOptionsToDB(manageOptionsType, currentList);
    setEditingOptionIdx(null);
    setEditingOptionValue('');
  };

  const handleRemoveOption = async (index: number) => {
    const currentList = getActiveOptionsList();
    const newList = currentList.filter((_, idx) => idx !== index);
    await saveDropdownOptionsToDB(manageOptionsType, newList);
    if (deletingOptionIdx === index) {
      setDeletingOptionIdx(null);
    }
  };

  const handleCreateMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemoErrorMsg('');

    const finalDept = isMemoCustomDept ? memoCustomDept.trim().toUpperCase() : memoDepartment.trim().toUpperCase();
    const finalSubject = isMemoCustomSubject ? memoCustomSubject.trim() : memoSubject.trim();
    const finalDesignation = isMemoCustomDesignation ? memoCustomDesignation.trim() : memoDesignation.trim();
    const finalSI = memoContext.targetSI;

    if (!finalDept) {
      setMemoErrorMsg('Please specify a department.');
      return;
    }
    if (!finalSubject) {
      setMemoErrorMsg('Please specify a subject / accounts head.');
      return;
    }
    if (!memoReceiver.trim()) {
      setMemoErrorMsg('Please specify a receiver (পাপক / গ্রহণকারী).');
      return;
    }
    if (!finalSI || isNaN(parseInt(finalSI, 10))) {
      setMemoErrorMsg('Please provide a valid numeric serial number.');
      return;
    }

    try {
      const finalMemoPerson = isMemoCustomResponsiblePerson ? memoCustomResponsiblePerson.trim() : memoResponsiblePerson.trim();
      const newMemo: Omit<MemoEntry, 'id'> = {
        si: finalSI,
        openingDate: memoOpeningDate,
        department: finalDept,
        subject: finalSubject,
        receiver: memoReceiver.trim(),
        note: memoNote.trim(),
        responsiblePerson: finalMemoPerson,
        designation: finalDesignation,
        memoNumber: generatedMemoNumber,
        part: memoPart,
        createdBy: userProfile?.uid || '',
        createdByName: userProfile?.displayName || 'System Admin',
        createdByEmail: userProfile?.email || '',
        status: isSuperAdmin ? 'approved' : 'pending'
      };

      if (isLocalSandbox) {
        const fullNewMemo: MemoEntry = {
          id: `local-memo-${Date.now()}`,
          ...newMemo,
          createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any
        };
        const updated = [...memos, fullNewMemo].sort((a,b) => a.si.localeCompare(b.si));
        setMemos(updated);
        localStorage.setItem('local_sandbox_memos', JSON.stringify(updated));

        setIsAddMemoModalOpen(false);
        setMemoReceiver('');
        setMemoNote('');
        setMemoResponsiblePerson('');
        setIsMemoCustomResponsiblePerson(false);
        setMemoCustomResponsiblePerson('');
        setManualMemoSI('');
        setMemoDepartment('');
        setMemoSubject('');
        setMemoDesignation('');
        setIsMemoCustomDept(false);
        setMemoCustomDept('');
        setIsMemoCustomSubject(false);
        setMemoCustomSubject('');
        setIsMemoCustomDesignation(false);
        setMemoCustomDesignation('');
        setMemoPart('None');
        logAction('MEMO_CREATE', `Created memo: ${generatedMemoNumber}`);
        return;
      }
 
      await addDoc(collection(db, 'memos'), {
        ...newMemo,
        createdAt: serverTimestamp()
      });
 
      setIsAddMemoModalOpen(false);
      setMemoReceiver('');
      setMemoNote('');
      setMemoResponsiblePerson('');
      setIsMemoCustomResponsiblePerson(false);
      setMemoCustomResponsiblePerson('');
      setManualMemoSI('');
      setMemoDepartment('');
      setMemoSubject('');
      setMemoDesignation('');
      setIsMemoCustomDept(false);
      setMemoCustomDept('');
      setIsMemoCustomSubject(false);
      setMemoCustomSubject('');
      setIsMemoCustomDesignation(false);
      setMemoCustomDesignation('');
      setMemoPart('None');
      logAction('MEMO_CREATE', `Created memo: ${generatedMemoNumber}`);
    } catch (error) {
      setMemoErrorMsg('Error creating memo record. Check permissions.');
      console.error(error);
    }
  };

  const handleApproveFile = async (fileId: string) => {
    if (!isSuperAdmin) return;
    try {
      if (isLocalSandbox) {
        const updated = files.map(f => f.id === fileId ? { ...f, status: 'approved' as const } : f);
        setFiles(updated);
        localStorage.setItem('local_sandbox_files', JSON.stringify(updated));
        logAction('FILE_APPROVE', `Approved file record ID: ${fileId}`);
        return;
      }
      await updateDoc(doc(db, 'files', fileId), { status: 'approved' });
      logAction('FILE_APPROVE', `Approved file record ID: ${fileId}`);
    } catch (error) {
      console.error(error);
    }
  };

  const handleApproveMemo = async (memoId: string) => {
    if (!isSuperAdmin) return;
    try {
      if (isLocalSandbox) {
        const updated = memos.map(m => m.id === memoId ? { ...m, status: 'approved' as const } : m);
        setMemos(updated);
        localStorage.setItem('local_sandbox_memos', JSON.stringify(updated));
        logAction('MEMO_APPROVE', `Approved memo record ID: ${memoId}`);
        return;
      }
      await updateDoc(doc(db, 'memos', memoId), { status: 'approved' });
      logAction('MEMO_APPROVE', `Approved memo record ID: ${memoId}`);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteFile = (fileId: string, fileName: string) => {
    if (!isSuperAdmin) {
      alert("Sorry, only the Super Admin (ovi.it) has permission to delete records.");
      return;
    }
    setDeleteConfirm({
      isOpen: true,
      type: 'file',
      id: fileId,
      name: fileName
    });
  };

  const handleDeleteMemo = (memoId: string, memoNumber: string) => {
    if (!isSuperAdmin) {
      alert("দুঃখিত, রেকর্ড ডিলিট করার ক্ষমতা শুধুমাত্র সুপার এডমিনের (ovi.it) জন্য সংরক্ষিত।");
      return;
    }
    setDeleteConfirm({
      isOpen: true,
      type: 'memo',
      id: memoId,
      name: memoNumber
    });
  };

  const confirmDeleteAction = async () => {
    const { type, id, name } = deleteConfirm;
    setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
    
    if (type === 'file') {
      if (isLocalSandbox) {
        const updated = files.filter(f => f.id !== id);
        setFiles(updated);
        localStorage.setItem('local_sandbox_files', JSON.stringify(updated));
        logAction('FILE_DELETE', `Deleted file entry in offline sandbox: ${name}`);
        return;
      }
      try {
        await deleteDoc(doc(db, 'files', id));
        logAction('FILE_DELETE', `Deleted file entry: ${name}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `files/${id}`);
      }
    } else if (type === 'memo') {
      if (isLocalSandbox) {
        const updated = memos.filter(m => m.id !== id);
        setMemos(updated);
        localStorage.setItem('local_sandbox_memos', JSON.stringify(updated));
        logAction('MEMO_DELETE', `Deleted memo entry in offline sandbox: ${name}`);
        return;
      }
      try {
        await deleteDoc(doc(db, 'memos', id));
        logAction('MEMO_DELETE', `Deleted memo entry: ${name}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `memos/${id}`);
      }
    } else if (type === 'admin') {
      if (isLocalSandbox) {
        const existing = JSON.parse(localStorage.getItem('local_admin_users') || '[]');
        const updated = existing.filter((u: any) => u.username !== id);
        localStorage.setItem('local_admin_users', JSON.stringify(updated));
        setAdminUsers(updated);
        logAction('ADMIN_DELETE', `Deleted custom Admin ID: ${id}`);
      } else {
        try {
          await deleteDoc(doc(db, 'admin_users', id));
          logAction('ADMIN_DELETE', `Deleted custom Admin ID from Firestore: ${id}`);
        } catch (err: any) {
          console.error("Error deleting custom admin:", err);
          alert("Failed to delete Admin. " + (err.message || ""));
        }
      }
    } else if (type === 'pin') {
      if (isLocalSandbox) {
        const updated = adminPins.filter(p => p.id !== id);
        setAdminPins(updated);
        localStorage.setItem('local_admin_pins', JSON.stringify(updated));
        logAction('PIN_DELETE', `Deleted admin pin code for ${name}`);
      } else {
        try {
          await deleteDoc(doc(db, 'admin_pins', id));
          logAction('PIN_DELETE', `Deleted admin pin code for ${name}`);
        } catch (e) {
          console.error("Error deleting pin:", e);
        }
      }
    } else if (type === 'budget') {
      if (isLocalSandbox) {
        const cleanId = id.replace('local-budget-', '');
        const updated = budgets.filter(b => b.id !== id && b.budgetCode !== id && b.budgetCode !== cleanId);
        localStorage.setItem('local_sandbox_budgets', JSON.stringify(updated));
        setBudgets(updated);
        await logAction('BUDGET_DELETE', `Deleted budget head: ${id}`);
        alert('Budget head deleted successfully!');
      } else {
        try {
          let docIdToDelete = id;
          if (id.startsWith('local-budget-') || id.startsWith('fallback-budget-')) {
            const code = id.replace('local-budget-', '').replace('fallback-budget-', '');
            const found = budgets.find(b => b.budgetCode === code);
            if (found && found.id && !found.id.startsWith('local-') && !found.id.startsWith('fallback-')) {
              docIdToDelete = found.id;
            } else {
              const q = query(collection(db, 'budgets'), where('budgetCode', '==', code));
              const snap = await getDocs(q);
              if (!snap.empty) {
                docIdToDelete = snap.docs[0].id;
              } else {
                const updated = budgets.filter(b => b.id !== id && b.budgetCode !== code);
                setBudgets(updated);
                await logAction('BUDGET_DELETE', `Deleted local fallback budget: ${code}`);
                alert('Budget head deleted successfully!');
                return;
              }
            }
          }

          await deleteDoc(doc(db, 'budgets', docIdToDelete));
          await logAction('BUDGET_DELETE', `Deleted budget head: ${docIdToDelete}`);
          alert('Budget head deleted successfully!');
        } catch (err: any) {
          console.error(err);
          alert('Failed to delete budget head: ' + (err.message || err));
        }
      }
    } else if (type === 'expense') {
      if (isLocalSandbox) {
        const updated = expenses.filter(e => e.id !== id);
        const toSave = updated.map(e => {
          const dateStr = (e.createdAt as any)?.isoString || e.createdAt || new Date().toISOString();
          return {
            ...e,
            createdAt: dateStr
          };
        });
        localStorage.setItem('local_sandbox_expenses', JSON.stringify(toSave));
        setExpenses(updated);
        await logAction('EXPENSE_DELETE', `Deleted expense: ${id}`);
        alert('Expense deleted successfully!');
      } else {
        try {
          await deleteDoc(doc(db, 'expenses', id));
          await logAction('EXPENSE_DELETE', `Deleted expense: ${id}`);
          alert('Expense deleted successfully!');
        } catch (err: any) {
          console.error(err);
          alert('Failed to delete expense: ' + (err.message || err));
        }
      }
    }
  };

  const handleUpdateMyDesignation = async () => {
    if (!newMyDesignation.trim()) return;
    try {
      await updateProfile({ designation: newMyDesignation.trim() });
      setIsEditingMyDesignation(false);
    } catch (error) {
      console.error(error);
    }
  };

  // ------------------------------------------
  // LOGGING, NOTES, PIN & ROLE ESCALATION HANDLERS
  // ------------------------------------------
  const logAction = async (actionType: string, description: string) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userEmail: userProfile?.email || 'ovi.softt@gmail.com',
      userName: userProfile?.displayName || 'System Admin',
      actionType,
      description
    };

    if (isLocalSandbox) {
      const existing = JSON.parse(localStorage.getItem('local_action_logs') || '[]');
      const updated = [logEntry, ...existing];
      localStorage.setItem('local_action_logs', JSON.stringify(updated));
      setActionLogs(updated);
    } else {
      try {
        await addDoc(collection(db, 'action_logs'), logEntry);
      } catch (e) {
        console.error("Error logging action:", e);
      }
    }
  };

  // Real-time Firestore or LocalStorage Sync for Admin PINs and Action Logs
  useEffect(() => {
    if (isLocalSandbox) {
      const pins = localStorage.getItem('local_admin_pins');
      if (pins) {
        setAdminPins(JSON.parse(pins));
      } else {
        const initialPins = [
          { id: 'pin-1', name: 'Super Admin Firoj', pin: '1234' },
          { id: 'pin-2', name: 'Admin Ovi', pin: '9999' }
        ];
        setAdminPins(initialPins);
        localStorage.setItem('local_admin_pins', JSON.stringify(initialPins));
      }

      const customUsers = localStorage.getItem('local_admin_users');
      if (customUsers) {
        setAdminUsers(JSON.parse(customUsers));
      } else {
        const initialUsers = [
          { id: 'admin-1', username: 'ovi.softt', password: 'password123', displayName: 'Ovi Softt', designation: 'Admin Officer', role: 'Admin' }
        ];
        setAdminUsers(initialUsers);
        localStorage.setItem('local_admin_users', JSON.stringify(initialUsers));
      }

      const logs = localStorage.getItem('local_action_logs');
      if (logs) {
        setActionLogs(JSON.parse(logs));
      } else {
        const initialLogs = [
          { timestamp: new Date(Date.now() - 3600000).toISOString(), userEmail: 'ovi.softt@gmail.com', userName: 'Demo Sandbox Admin', actionType: 'SYSTEM_START', description: 'BSK Vault Admin Panel Online' }
        ];
        setActionLogs(initialLogs);
        localStorage.setItem('local_action_logs', JSON.stringify(initialLogs));
      }

      const codeToOfficialMap = new Map(INITIAL_BUDGET_DATA.map(item => [item.budgetCode, item]));

      const localBudgets = localStorage.getItem('local_sandbox_budgets');
      if (localBudgets) {
        const parsed = JSON.parse(localBudgets).map((b: any) => {
          const official = codeToOfficialMap.get(b.budgetCode);
          return {
            ...b,
            budgetHead: official ? official.budgetHead : (b.budgetHead || ''),
            responsiblePerson: official ? official.responsiblePerson : (b.responsiblePerson || '')
          };
        });
        setBudgets(parsed);
        localStorage.setItem('local_sandbox_budgets', JSON.stringify(parsed));
      } else {
        const initialWithIds = INITIAL_BUDGET_DATA.map(b => ({
          id: `local-budget-${b.budgetCode}`,
          ...b,
          fiscalYear: (b as any).fiscalYear || '2025-2026',
          note: ''
        }));
        setBudgets(initialWithIds);
        localStorage.setItem('local_sandbox_budgets', JSON.stringify(initialWithIds));
      }

      const localExpenses = localStorage.getItem('local_sandbox_expenses');
      if (localExpenses) {
        const parsed = JSON.parse(localExpenses);
        const withToDate = parsed.map((e: any) => {
          const dateStr = e.createdAt?.isoString || e.createdAt || new Date().toISOString();
          return {
            ...e,
            createdAt: {
              toDate: () => new Date(dateStr),
              isoString: dateStr
            }
          };
        });
        setExpenses(withToDate);
      } else {
        setExpenses([]);
        localStorage.setItem('local_sandbox_expenses', JSON.stringify([]));
      }

      const localOpts = localStorage.getItem('local_sandbox_memo_dropdown_options');
      if (localOpts) {
        setDbDropdownOptions(JSON.parse(localOpts));
      }
      return;
    }

    // Firestore Sync for Memo Dropdown Options
    const dropdownUnsubscribe = onSnapshot(collection(db, 'memo_dropdown_options'), (snapshot) => {
      const opts: any = {
        departments: [],
        subjects: [],
        designations: [],
        responsible_persons: []
      };
      snapshot.forEach((doc) => {
        opts[doc.id] = doc.data().values || [];
      });
      setDbDropdownOptions(opts);
    }, (error) => {
      console.error("Error reading memo dropdown options:", error);
      handleFirestoreError(error, OperationType.LIST, 'memo_dropdown_options');
    });

    // Firestore Sync for Admin Pins
    const pinsUnsubscribe = onSnapshot(collection(db, 'admin_pins'), (snapshot) => {
      const pinList: any[] = [];
      snapshot.forEach((doc) => {
        pinList.push({ id: doc.id, ...doc.data() });
      });
      setAdminPins(pinList);
    }, (error) => {
      console.error("Error reading admin pins:", error);
    });

    // Firestore Sync for Custom Admin Users
    const adminUsersUnsubscribe = onSnapshot(collection(db, 'admin_users'), (snapshot) => {
      const adminList: any[] = [];
      snapshot.forEach((doc) => {
        adminList.push({ id: doc.id, ...doc.data() });
      });
      setAdminUsers(adminList);
    }, (error) => {
      console.error("Error reading admin users:", error);
    });

    // Firestore Sync for Action Logs
    const logsQuery = query(collection(db, 'action_logs'), orderBy('timestamp', 'desc'));
    
    // Firestore Sync for Budgets
    const budgetsUnsubscribe = onSnapshot(collection(db, 'budgets'), (snapshot) => {
      const budgetData: any[] = [];
      const codeToOfficialMap = new Map(INITIAL_BUDGET_DATA.map(item => [item.budgetCode, item]));

      snapshot.forEach((doc) => {
        const data = doc.data();
        const official = codeToOfficialMap.get(data.budgetCode);
        const targetHead = official ? official.budgetHead : data.budgetHead;
        const targetPerson = official ? official.responsiblePerson : data.responsiblePerson;

        budgetData.push({ id: doc.id, ...data, budgetHead: targetHead, responsiblePerson: targetPerson });
      });
      setBudgets(budgetData.sort((a, b) => Number(a.sl) - Number(b.sl)));

      // Auto-seed missing initial budgets from the spreadsheet to Firestore
      if (!hasSeededRef.current) {
        hasSeededRef.current = true;
        const existingCodes = new Set(budgetData.map(b => b.budgetCode));
        const missingBudgets = INITIAL_BUDGET_DATA.filter(item => !existingCodes.has(item.budgetCode));
        
        if (missingBudgets.length > 0) {
          console.log(`Seeding ${missingBudgets.length} missing budgets into Firestore...`);
          (async () => {
            for (const item of missingBudgets) {
              try {
                await addDoc(collection(db, 'budgets'), {
                  sl: item.sl,
                  budgetCode: item.budgetCode,
                  budgetHead: item.budgetHead,
                  responsiblePerson: item.responsiblePerson,
                  budgetFigure: item.budgetFigure,
                  fiscalYear: '2025-2026',
                  note: '',
                  createdAt: serverTimestamp()
                });
              } catch (err) {
                console.error(`Error seeding budget ${item.budgetCode}:`, err);
              }
            }
            console.log("Finished seeding missing budgets.");
          })();
        }
      }
    }, (error) => {
      console.error("Error reading budgets:", error);
    });

    // Firestore Sync for Expenses
    const expensesUnsubscribe = onSnapshot(query(collection(db, 'expenses'), orderBy('createdAt', 'desc')), (snapshot) => {
      const expenseData: any[] = [];
      snapshot.forEach((doc) => {
        expenseData.push({ id: doc.id, ...doc.data() });
      });
      setExpenses(expenseData);
    }, (error) => {
      console.error("Error reading expenses:", error);
    });

    const logsUnsubscribe = onSnapshot(logsQuery, (snapshot) => {
      const logList: any[] = [];
      snapshot.forEach((doc) => {
        logList.push({ id: doc.id, ...doc.data() });
      });
      setActionLogs(logList);
    }, (error) => {
      console.error("Error reading action logs:", error);
    });

    return () => {
      
      pinsUnsubscribe();
      adminUsersUnsubscribe();
      logsUnsubscribe();
      budgetsUnsubscribe();
      expensesUnsubscribe();
      dropdownUnsubscribe();

    };
  }, [isLocalSandbox]);

  const handleCreateAdminUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName.trim() || !newAdminUsername.trim() || !newAdminPassword.trim()) {
      alert("Please fill in all fields.");
      return;
    }

    const cleanUsername = newAdminUsername.trim().toLowerCase();

    if (cleanUsername === 'ovi.it') {
      alert("Username 'ovi.it' is reserved for Super Admin.");
      return;
    }

    const finalDesignation = newAdminRole === 'Super Admin' 
      ? 'Super Admin' 
      : (isNewAdminCustomDesignation ? newAdminCustomDesignation.trim() : newAdminDesignation);

    const newAdmin = {
      username: cleanUsername,
      displayName: newAdminName.trim(),
      designation: finalDesignation || 'Admin Officer',
      role: 'Admin',
      createdAt: new Date().toISOString(),
      permissions: {
        menus: permissionMenus,
        actions: permissionActions
      }
    };

    if (isLocalSandbox) {
      const existing = JSON.parse(localStorage.getItem('local_admin_users') || '[]');
      if (existing.some((u: any) => u.username === cleanUsername)) {
        alert("Username already exists!");
        return;
      }
      const updated = [...existing, { id: `admin-${Date.now()}`, ...newAdmin, password: newAdminPassword.trim() }];
      localStorage.setItem('local_admin_users', JSON.stringify(updated));
      setAdminUsers(updated);
      logAction('ADMIN_CREATE', `Created custom Admin ID: ${cleanUsername} (${finalDesignation}) with custom permissions`);
      setNewAdminName('');
      setNewAdminUsername('');
      setNewAdminPassword('');
      setNewAdminCustomDesignation('');
      setIsNewAdminCustomDesignation(false);
      setNewAdminRole('Admin');
      setPermissionMenus({
        welcome: true,
        files: true,
        memos: true,
        budget: true,
        expense: true,
        analytics: true,
        security: false,
      });
      setPermissionActions({
        files: { create: true, edit: true, delete: true },
        memos: { create: true, delete: true },
        budget: { create: true, edit: true, delete: true },
        expense: { create: true, edit: true, delete: true }
      });
    } else {
      try {
        const docRef = doc(db, 'admin_users', cleanUsername);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          alert("Username already exists in Firestore!");
          return;
        }

        // Create Firebase Auth User securely using a secondary app instance
        const { initializeApp } = await import('firebase/app');
        const { getAuth, createUserWithEmailAndPassword, signOut: signOutSecondary } = await import('firebase/auth');
        const { firebaseConfigObj } = await import('../firebase');
        
        const secondaryApp = initializeApp(firebaseConfigObj, "SecondaryAppForAdminCreation");
        const secondaryAuth = getAuth(secondaryApp);
        
        const authEmail = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@admin.local`;
        const firebasePassword = newAdminPassword.trim().padEnd(6, '0');
        
        await createUserWithEmailAndPassword(secondaryAuth, authEmail, firebasePassword);
        await signOutSecondary(secondaryAuth); // Sign out the newly created user

        await setDoc(docRef, newAdmin);
        logAction('ADMIN_CREATE', `Created custom Admin ID in Firestore: ${cleanUsername} (${finalDesignation}) with custom permissions`);
        setNewAdminName('');
        setNewAdminUsername('');
        setNewAdminPassword('');
        setNewAdminCustomDesignation('');
        setIsNewAdminCustomDesignation(false);
        setNewAdminRole('Admin');
        setPermissionMenus({
          welcome: true,
          files: true,
          memos: true,
          budget: true,
          expense: true,
          analytics: true,
          security: false,
        });
        setPermissionActions({
          files: { create: true, edit: true, delete: true },
          memos: { create: true, delete: true },
          budget: { create: true, edit: true, delete: true },
          expense: { create: true, edit: true, delete: true }
        });
      } catch (err: any) {
        console.error("Error creating custom admin:", err);
        alert("Failed to create Admin. " + (err.message || ""));
      }
    }
  };

  const handleDeleteAdminUser = (username: string) => {
    if (username === 'ovi.it') return;
    setDeleteConfirm({
      isOpen: true,
      type: 'admin',
      id: username,
      name: username
    });
  };

  const handleOpenEditPermissions = (user: any) => {
    setEditingPermissionsUser(user);
    
    // Default permissions if they don't have any
    const defaultMenus = {
      welcome: true,
      files: true,
      memos: true,
      budget: true,
      expense: true,
      analytics: true,
      employees: true,
      dailyExpenseApproval: true,
      security: false,
    };
    const defaultActions = {
      files: { create: true, edit: true, delete: true },
      memos: { create: true, delete: true },
      budget: { create: true, edit: true, delete: true },
      expense: { create: true, edit: true, delete: true },
      employees: { create: true, edit: true, delete: true },
      dailyExpenseApproval: { create: true, edit: true, delete: true }
    };

    setEditingPermissionMenus({
      ...defaultMenus,
      ...(user.permissions?.menus || {})
    });
    setEditingPermissionActions({
      files: { ...defaultActions.files, ...(user.permissions?.actions?.files || {}) },
      memos: { ...defaultActions.memos, ...(user.permissions?.actions?.memos || {}) },
      budget: { ...defaultActions.budget, ...(user.permissions?.actions?.budget || {}) },
      expense: { ...defaultActions.expense, ...(user.permissions?.actions?.expense || {}) },
      employees: { ...defaultActions.employees, ...(user.permissions?.actions?.employees || {}) },
      dailyExpenseApproval: { ...defaultActions.dailyExpenseApproval, ...(user.permissions?.actions?.dailyExpenseApproval || {}) },
    });

    setIsEditPermissionsModalOpen(true);
  };

  const handleSaveEditPermissions = async () => {
    if (!editingPermissionsUser) return;
    const username = editingPermissionsUser.username;

    const updatedPermissions = {
      menus: editingPermissionMenus,
      actions: editingPermissionActions
    };

    if (isLocalSandbox) {
      const existing = JSON.parse(localStorage.getItem('local_admin_users') || '[]');
      const updated = existing.map((u: any) => {
        if (u.username === username) {
          return {
            ...u,
            permissions: updatedPermissions
          };
        }
        return u;
      });
      localStorage.setItem('local_admin_users', JSON.stringify(updated));
      setAdminUsers(updated);
      logAction('ADMIN_PERMISSIONS_UPDATE', `Updated permissions for Admin ID: ${username}`);
      setIsEditPermissionsModalOpen(false);
      
      // If the current logged-in user updated their own permissions, sync it with userProfile!
      if (userProfile?.email === username) {
        updateProfile({
          permissions: updatedPermissions
        });
        localStorage.setItem('custom_login_permissions', JSON.stringify(updatedPermissions));
      }
    } else {
      try {
        const docRef = doc(db, 'admin_users', username);
        await updateDoc(docRef, {
          permissions: updatedPermissions
        });
        logAction('ADMIN_PERMISSIONS_UPDATE', `Updated permissions for Admin ID in Firestore: ${username}`);
        setIsEditPermissionsModalOpen(false);

        // If the current logged-in user updated their own permissions, sync it with userProfile!
        if (userProfile?.email === username) {
          updateProfile({
            permissions: updatedPermissions
          });
          localStorage.setItem('custom_login_permissions', JSON.stringify(updatedPermissions));
        }
      } catch (err: any) {
        console.error("Error updating user permissions:", err);
        alert("Failed to update permissions. " + (err.message || ""));
      }
    }
  };

  const handleCreatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinName.trim() || !pinCode.trim()) return;
    if (pinCode.length < 4 || pinCode.length > 8 || isNaN(parseInt(pinCode, 10))) {
      alert("PIN code must be a 4 to 8 digit number.");
      return;
    }

    const newPin = {
      name: pinName.trim(),
      pin: pinCode.trim()
    };

    if (isLocalSandbox) {
      const updated = [...adminPins, { id: `pin-${Date.now()}`, ...newPin }];
      setAdminPins(updated);
      localStorage.setItem('local_admin_pins', JSON.stringify(updated));
      logAction('PIN_GENERATE', `Generated admin pin code for ${newPin.name}`);
    } else {
      try {
        await addDoc(collection(db, 'admin_pins'), newPin);
        logAction('PIN_GENERATE', `Generated admin pin code for ${newPin.name}`);
      } catch (e) {
        console.error("Error creating pin:", e);
      }
    }

    setPinName('');
    setPinCode('');
  };

  const handleDeletePin = (id: string, name: string) => {
    setDeleteConfirm({
      isOpen: true,
      type: 'pin',
      id: id,
      name: name
    });
  };

  const handleVerifyPin = () => {
    setVerifyPinError('');
    setVerifyPinSuccess('');
    if (!verifyPinInput.trim()) return;

    const matched = adminPins.find(p => p.pin === verifyPinInput.trim());
    if (matched) {
      updateProfile({ role: 'Admin', designation: 'Super Admin' });
      setVerifyPinSuccess(`এডমিন প্রবেশ অনুমোদিত! স্বাগত, ${matched.name}।`);
      setVerifyPinInput('');
      logAction('PIN_VERIFY_SUCCESS', `Successfully authenticated as Admin using PIN registered for: ${matched.name}`);
    } else {
      setVerifyPinError("ভুল পিন কোড! অনুগ্রহ করে সঠিক এডমিন পিন কোড প্রবেশ করুন।");
      logAction('PIN_VERIFY_FAILED', `Failed attempt to elevate role using PIN: ${verifyPinInput}`);
    }
  };

  // Log successful login once per session
  useEffect(() => {
    if (userProfile?.email) {
      const sessionKey = `logged_login_${userProfile.email}`;
      if (!sessionStorage.getItem(sessionKey)) {
        logAction('LOGIN_SUCCESS', `Successfully logged into administrative console as ${userProfile.displayName || userProfile.email} (${userProfile.designation || 'Staff'}).`);
        sessionStorage.setItem(sessionKey, 'true');
      }
    }
  }, [userProfile]);

  // Memoized filter for Audit & Activity Logs
  const filteredAuditLogs = useMemo(() => {
    return actionLogs.filter(log => {
      const matchesSearch = 
        (log.userEmail || '').toLowerCase().includes(auditSearch.toLowerCase()) ||
        (log.userName || '').toLowerCase().includes(auditSearch.toLowerCase()) ||
        (log.actionType || '').toLowerCase().includes(auditSearch.toLowerCase()) ||
        (log.description || '').toLowerCase().includes(auditSearch.toLowerCase());
      
      if (auditTypeFilter === 'all') return matchesSearch;
      
      let matchesType = false;
      if (auditTypeFilter === 'file') {
        matchesType = log.actionType.startsWith('FILE_') || log.actionType === 'COPY_ID';
      } else if (auditTypeFilter === 'memo') {
        matchesType = log.actionType.startsWith('MEMO_') || log.actionType === 'COPY_ID';
      } else if (auditTypeFilter === 'admin') {
        matchesType = log.actionType.startsWith('ADMIN_');
      } else if (auditTypeFilter === 'pin') {
        matchesType = log.actionType.startsWith('PIN_');
      } else if (auditTypeFilter === 'auth') {
        matchesType = log.actionType === 'LOGIN_SUCCESS' || log.actionType.startsWith('LOGIN_') || log.actionType.startsWith('LOGOUT_');
      } else if (auditTypeFilter === 'note') {
        matchesType = log.actionType.startsWith('NOTE_');
      } else if (auditTypeFilter === 'edit') {
        matchesType = log.actionType.includes('_EDIT_') || log.actionType === 'EDIT_OPEN';
      }
      
      return matchesSearch && matchesType;
    });
  }, [actionLogs, auditSearch, auditTypeFilter]);

  // Export audit logs as CSV
  const downloadAuditCSV = () => {
    try {
      const headers = ['Timestamp', 'User Name', 'User Email', 'Action Type', 'Description'];
      const rows = filteredAuditLogs.map(log => [
        log.timestamp ? new Date(log.timestamp).toLocaleString('en-GB') : '',
        log.userName || '',
        log.userEmail || '',
        log.actionType || '',
        log.description || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => 
          row.map(cell => {
            const str = String(cell).replace(/"/g, '""');
            return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
          }).join(',')
        )
      ].join('\r\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `BSK_Audit_Log_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      logAction('AUDIT_REPORT_DOWNLOAD', `Downloaded system audit logs containing ${filteredAuditLogs.length} items.`);
    } catch (error) {
      console.error("Error exporting audit logs:", error);
    }
  };

  // ------------------------------------------
  // NOTES MANAGEMENT HANDLERS
  // ------------------------------------------
  const handleOpenNotes = async (type: 'file' | 'memo' | 'budget', id: string, name: string) => {
    setNoteType(type);
    setNoteRecordId(id);
    setNoteRecordName(name);

    if (isLocalSandbox) {
      const storedNotes = JSON.parse(localStorage.getItem('local_record_notes') || '{}');
      setCurrentNoteText(storedNotes[`${type}-${id}`] || '');
    } else {
      try {
        const recordRef = doc(db, type === 'file' ? 'files' : type === 'memo' ? 'memos' : 'budgets', id);
        const snap = await getDoc(recordRef);
        if (snap.exists()) {
          const data = snap.data();
          setCurrentNoteText(data.note || '');
        } else {
          setCurrentNoteText('');
        }
      } catch (e) {
        console.error("Error loading note from Firestore:", e);
        const storedNotes = JSON.parse(localStorage.getItem('local_record_notes') || '{}');
        setCurrentNoteText(storedNotes[`${type}-${id}`] || '');
      }
    }
    setIsNoteModalOpen(true);
    logAction('NOTE_VIEW', `Viewed notes for ${type === 'file' ? 'File' : 'Memo'} ${name}`);
  };

  const handleSaveNote = async () => {
    const storedNotes = JSON.parse(localStorage.getItem('local_record_notes') || '{}');
    storedNotes[`${noteType}-${noteRecordId}`] = currentNoteText;
    localStorage.setItem('local_record_notes', JSON.stringify(storedNotes));

    if (!isLocalSandbox) {
      try {
        const recordRef = doc(db, noteType === 'file' ? 'files' : noteType === 'memo' ? 'memos' : 'budgets', noteRecordId);
        await updateDoc(recordRef, { note: currentNoteText });
      } catch (e) {
        console.error("Error saving note to Firestore:", e);
      }
    } else {
      if (noteType === 'file') {
        const updated = files.map(f => f.id === noteRecordId ? { ...f, note: currentNoteText } : f);
        setFiles(updated);
        localStorage.setItem('local_sandbox_files', JSON.stringify(updated));
      } else {
        const updated = memos.map(m => m.id === noteRecordId ? { ...m, note: currentNoteText } : m);
        setMemos(updated);
        localStorage.setItem('local_sandbox_memos', JSON.stringify(updated));
      }
    }

    setIsNoteModalOpen(false);
    logAction('NOTE_SAVE', `Saved notes for ${noteType === 'file' ? 'File' : 'Memo'} ${noteRecordName}`);
  };

  // ------------------------------------------
  // EDIT MANAGEMENT HANDLERS (SUPER ADMIN-ONLY ACCESS)
  // ------------------------------------------
  const handleOpenEdit = (type: 'file' | 'memo', record: any) => {
    if (!isSuperAdmin) {
      alert("দুঃখিত! সুপার এডমিন ব্যতীত অন্য কেউ তথ্য সংশোধন বা এডিট করতে পারবেন না।");
      return;
    }

    setEditingFileType(type);
    setEditingFileId(record.id);

    setEditSI(record.si);
    setEditOpeningDate(record.openingDate);
    setEditDepartment(record.department);
    setEditSubject(record.subject);
    setEditResponsiblePerson(record.responsiblePerson || '');
    setEditDesignation(record.designation || '');
    setEditPart(record.part || 'None');

    if (type === 'file') {
      setEditOpeningYear(record.openingYear || '');
      setEditFileNote(record.note || '');
      setEditFileName(record.fileName || '');
      setIsEditCustomDept(!DEPARTMENTS.includes(record.department));
      setEditCustomDept(!DEPARTMENTS.includes(record.department) ? record.department : '');
      setIsEditCustomSubject(!SUBJECTS_BY_DEPT[record.department]?.includes(record.subject));
      setEditCustomSubject(!SUBJECTS_BY_DEPT[record.department]?.includes(record.subject) ? record.subject : '');
      setIsEditCustomResponsiblePerson(!RESPONSIBLE_PERSONS.includes(record.responsiblePerson));
      setEditCustomResponsiblePerson(!RESPONSIBLE_PERSONS.includes(record.responsiblePerson) ? record.responsiblePerson : '');
      setIsEditCustomDesignation(!DESIGNATIONS.includes(record.designation));
      setEditCustomDesignation(!DESIGNATIONS.includes(record.designation) ? record.designation : '');
    } else {
      setEditReceiver(record.receiver || '');
      setEditMemoNote(record.note || '');
      setEditMemoNumber(record.memoNumber || '');
      setIsEditCustomDept(!MEMO_DEPARTMENTS.includes(record.department));
      setEditCustomDept(!MEMO_DEPARTMENTS.includes(record.department) ? record.department : '');
      setIsEditCustomSubject(!MEMO_SUBJECTS.includes(record.subject));
      setEditCustomSubject(!MEMO_SUBJECTS.includes(record.subject) ? record.subject : '');
      setIsEditCustomResponsiblePerson(!MEMO_RESPONSIBLE_PERSONS.includes(record.responsiblePerson));
      setEditCustomResponsiblePerson(!MEMO_RESPONSIBLE_PERSONS.includes(record.responsiblePerson) ? record.responsiblePerson : '');
      setIsEditCustomDesignation(!MEMO_DESIGNATIONS.includes(record.designation));
      setEditCustomDesignation(!MEMO_DESIGNATIONS.includes(record.designation) ? record.designation : '');
    }

    setIsEditModalOpen(true);
    logAction('EDIT_OPEN', `Opened edit window for ${type} ${record.id}`);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isSuperAdmin) {
      alert("দুঃখিত! সুপার এডমিন ব্যতীত অন্য কেউ তথ্য সংশোধন বা এডিট করতে পারবেন না।");
      return;
    }

    const finalDept = isEditCustomDept ? editCustomDept.trim().toUpperCase() : editDepartment.trim().toUpperCase();
    const finalSubject = isEditCustomSubject ? editCustomSubject.trim() : editSubject.trim();
    const finalPerson = isEditCustomResponsiblePerson ? editCustomResponsiblePerson.trim() : editResponsiblePerson.trim();
    const finalDesignation = isEditCustomDesignation ? editCustomDesignation.trim() : editDesignation.trim();

    if (editingFileType === 'file') {
      const baseMatches = files.filter(f => f.department === finalDept && f.subject === finalSubject && f.openingYear === editOpeningYear);
      let targetEditSI = editSI;
      if (baseMatches.length > 0) {
        // If we found matches, sort them by SI to find the very first one, or just take the first match.
        // Actually, since they might be added in order, [0] is usually the first.
        // But let's be safe and sort by SI ascending to get the real base SI.
        const sorted = [...baseMatches].sort((a, b) => (parseInt(a.si, 10) || 0) - (parseInt(b.si, 10) || 0));
        targetEditSI = sorted[0].si;
      }

      let rawFileName = `${finalDept}.${finalSubject}.${editOpeningYear}.${targetEditSI}`;
      if (editPart && editPart !== 'None') {
        rawFileName += `(${editPart})`;
      }
      const recomputedFileName = rawFileName.replace(/\.{2,}/g, '.');

      const updatedFields: Partial<FileEntry> = {
        si: editSI,
        openingDate: editOpeningDate,
        department: finalDept,
        subject: finalSubject,
        openingYear: editOpeningYear,
        responsiblePerson: finalPerson,
        designation: finalDesignation,
        part: editPart,
        note: editFileNote.trim(),
        fileName: recomputedFileName
      };

      if (isLocalSandbox) {
        const updated = files.map(f => f.id === editingFileId ? { ...f, ...updatedFields } : f);
        setFiles(updated);
        localStorage.setItem('local_sandbox_files', JSON.stringify(updated));
      } else {
        try {
          await updateDoc(doc(db, 'files', editingFileId), updatedFields);
        } catch (err) {
          console.error("Error updating file in Firestore:", err);
          alert("Error updating record.");
          return;
        }
      }
      logAction('FILE_EDIT_SUCCESS', `Successfully edited file: ${recomputedFileName}`);
    } else {
      const dateParts = editOpeningDate.split('.');
      const memoYearVal = dateParts[2] || '2026';
      const baseMemoMatches = memos.filter(m => m.department === finalDept && m.subject === finalSubject && m.openingDate.split('.')[2] === memoYearVal);
      let targetEditMemoSI = editSI;
      if (baseMemoMatches.length > 0) {
        const sorted = [...baseMemoMatches].sort((a, b) => (parseInt(a.si, 10) || 0) - (parseInt(b.si, 10) || 0));
        targetEditMemoSI = sorted[0].si;
      }

      let rawMemoNumber = `স্মারক নং ${finalDept}.${finalSubject}.${memoYearVal}.${targetEditMemoSI}`;
      if (editPart && editPart !== 'None') {
        rawMemoNumber += `(${translatePartToBengali(editPart)})`;
      }
      const recomputedMemoNumber = toBengali(rawMemoNumber);

      const updatedFields: Partial<MemoEntry> = {
        si: editSI,
        openingDate: editOpeningDate,
        department: finalDept,
        subject: finalSubject,
        receiver: editReceiver,
        note: editMemoNote,
        responsiblePerson: finalPerson,
        designation: finalDesignation,
        part: editPart,
        memoNumber: recomputedMemoNumber
      };

      if (isLocalSandbox) {
        const updated = memos.map(m => m.id === editingFileId ? { ...m, ...updatedFields } : m);
        setMemos(updated);
        localStorage.setItem('local_sandbox_memos', JSON.stringify(updated));
      } else {
        try {
          await updateDoc(doc(db, 'memos', editingFileId), updatedFields);
        } catch (err) {
          console.error("Error updating memo in Firestore:", err);
          alert("Error updating record.");
          return;
        }
      }
      logAction('MEMO_EDIT_SUCCESS', `Successfully edited memo: ${recomputedMemoNumber}`);
    }

    setIsEditModalOpen(false);
  };

  // ------------------------------------------
  // FILTER APPLICATION
  // ------------------------------------------
  const filteredFiles = useMemo(() => {
    const filtered = files.filter(f => {
      const matchesSearch = searchQuery === '' || 
        f.si.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.openingYear.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.responsiblePerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.fileName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = selectedDepts.length === 0 || selectedDepts.includes(f.department);
      const matchesSubject = selectedSubjects.length === 0 || selectedSubjects.includes(f.subject);
      const matchesYear = selectedYears.length === 0 || selectedYears.includes(f.openingYear);
      const matchesPerson = selectedPeople.length === 0 || 
        (selectedPeople.includes('(Blanks)') && !f.responsiblePerson) ||
        selectedPeople.includes(f.responsiblePerson);
      const matchesDesignation = selectedDesignations.length === 0 ||
        (selectedDesignations.includes('(Blanks)') && !f.designation) ||
        selectedDesignations.includes(f.designation);

      return matchesSearch && matchesDept && matchesSubject && matchesYear && matchesPerson && matchesDesignation;
    });
    
    return filtered.sort((a, b) => {
      const siA = parseInt(a.si, 10) || 0;
      const siB = parseInt(b.si, 10) || 0;
      return fileSortOrder === 'asc' ? siA - siB : siB - siA;
    });
  }, [files, searchQuery, selectedDepts, selectedSubjects, selectedYears, selectedPeople, selectedDesignations, fileSortOrder]);

  const filteredMemos = useMemo(() => {
    const filtered = memos.filter(m => {
      const matchesSearch = memoSearchQuery === '' || 
        m.si.toLowerCase().includes(memoSearchQuery.toLowerCase()) ||
        m.department.toLowerCase().includes(memoSearchQuery.toLowerCase()) ||
        m.subject.toLowerCase().includes(memoSearchQuery.toLowerCase()) ||
        m.receiver.toLowerCase().includes(memoSearchQuery.toLowerCase()) ||
        m.responsiblePerson.toLowerCase().includes(memoSearchQuery.toLowerCase()) ||
        m.designation.toLowerCase().includes(memoSearchQuery.toLowerCase()) ||
        m.memoNumber.toLowerCase().includes(memoSearchQuery.toLowerCase());

      const matchesDept = selectedMemoDepts.length === 0 || selectedMemoDepts.includes(m.department);
      const matchesSubject = selectedMemoSubjects.length === 0 || selectedMemoSubjects.includes(m.subject);
      const matchesPerson = selectedMemoPeople.length === 0 || 
        (selectedMemoPeople.includes('(Blanks)') && !m.responsiblePerson) ||
        selectedMemoPeople.includes(m.responsiblePerson);
      const matchesDesignation = selectedMemoDesignations.length === 0 ||
        (selectedMemoDesignations.includes('(Blanks)') && !m.designation) ||
        selectedMemoDesignations.includes(m.designation);
      const matchesReceiver = selectedMemoReceivers.length === 0 || selectedMemoReceivers.includes(m.receiver);

      return matchesSearch && matchesDept && matchesSubject && matchesPerson && matchesDesignation && matchesReceiver;
    });
    
    return filtered.sort((a, b) => {
      const siA = parseInt(a.si, 10) || 0;
      const siB = parseInt(b.si, 10) || 0;
      return memoSortOrder === 'asc' ? siA - siB : siB - siA;
    });
  }, [memos, memoSearchQuery, selectedMemoDepts, selectedMemoSubjects, selectedMemoPeople, selectedMemoDesignations, selectedMemoReceivers, memoSortOrder]);

  // ------------------------------------------
  // DATABASE SYNC & FORMAT UTILITY FOR SUPER ADMINS
  // ------------------------------------------
  const handleFixFileFormatsAndDates = async () => {
    if (!isSuperAdmin) {
      alert("Only Super Admin can run database formatting utilities.");
      return;
    }
    const confirmMsg = lang === 'BN'
      ? "আপনি কি ডাটাবেজের সব ফাইল রেজিস্টার রেকর্ডের তারিখ '01.07.2026' করতে চান এবং ফাইল নামের ড্যাশ (-) ডটে (.) রূপান্তর করতে চান? (এটি ডাটাবেজের সব ফাইলে স্থায়ী পরিবর্তন করবে)"
      : "Are you sure you want to change all file register opening dates to '01.07.2026' and convert file name hyphens (-) to dots (.)? (This will permanently update all records)";
    if (!window.confirm(confirmMsg)) return;

    try {
      let updatedCount = 0;
      if (isLocalSandbox) {
        const updated = files.map(file => {
          let updatedName = file.fileName;
          // Replace hyphen with dot before the serial number (e.g. .2026-122 to .2026.122)
          updatedName = updatedName.replace(/(\d{4})-(\d+)/g, '$1.$2');
          // Collapse multiple dots
          updatedName = updatedName.replace(/\.{2,}/g, '.');

          return {
            ...file,
            openingDate: '01.07.2026',
            openingYear: '2026',
            fileName: updatedName
          };
        });
        setFiles(updated);
        localStorage.setItem('local_sandbox_files', JSON.stringify(updated));
        updatedCount = updated.length;
      } else {
        const filesRef = collection(db, 'files');
        const snapshot = await getDocs(filesRef);
        const batch = writeBatch(db);
        
        snapshot.forEach((docSnap) => {
          const file = docSnap.data() as FileEntry;
          let updatedName = file.fileName || '';
          
          // Replace hyphen with dot before the serial number (e.g. .2026-122 to .2026.122)
          updatedName = updatedName.replace(/(\d{4})-(\d+)/g, '$1.$2');
          // Collapse multiple dots
          updatedName = updatedName.replace(/\.{2,}/g, '.');

          batch.update(docSnap.ref, {
            openingDate: '01.07.2026',
            openingYear: '2026',
            fileName: updatedName
          });
          updatedCount++;
        });
        
        await batch.commit();
      }
      
      const successMsg = lang === 'BN'
        ? `সফলভাবে ${updatedCount}টি ফাইল রেকর্ডের তারিখ (01.07.2026) ও ডট ফরম্যাট আপডেট করা হয়েছে!`
        : `Successfully updated ${updatedCount} file records with date '01.07.2026' and dot formats!`;
      alert(successMsg);
      logAction('DATABASE_CLEAN', `Super Admin formatted and synced ${updatedCount} file register records.`);
    } catch (err) {
      console.error(err);
      alert("Error executing format sync: " + err);
    }
  };

  // ------------------------------------------
  // CSV EXPORTS
  // ------------------------------------------
  const handleExportCSV = () => {
    if (filteredFiles.length === 0) return;
    const headers = ['SI', 'Opening Date', 'Department', 'Subject/Accounts Head', 'Opening Year', 'Responsible Person', 'Designation', 'File Name'];
    const csvRows = [headers.join(',')];

    for (const file of filteredFiles) {
      const values = [
        `"${file.si}"`,
        `"${file.openingDate}"`,
        `"${file.department}"`,
        `"${file.subject.replace(/"/g, '""')}"`,
        `"${file.openingYear}"`,
        `"${file.responsiblePerson.replace(/"/g, '""')}"`,
        `"${file.designation}"`,
        `"${file.fileName.replace(/"/g, '""')}"`
      ];
      csvRows.push(values.join(','));
    }

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `File_Opening_Register_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportMemoCSV = () => {
    if (filteredMemos.length === 0) return;
    const headers = ['SI', 'Opening Date', 'Department', 'Subject/Accounts Head', 'Receiver', 'Responsible Person', 'Designation', 'Memo Number'];
    const csvRows = [headers.join(',')];

    for (const memo of filteredMemos) {
      const values = [
        `"${memo.si}"`,
        `"${memo.openingDate}"`,
        `"${memo.department}"`,
        `"${memo.subject.replace(/"/g, '""')}"`,
        `"${memo.receiver.replace(/"/g, '""')}"`,
        `"${memo.responsiblePerson.replace(/"/g, '""')}"`,
        `"${memo.designation}"`,
        `"${memo.memoNumber.replace(/"/g, '""')}"`
      ];
      csvRows.push(values.join(','));
    }

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Memo_Register_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClearAllFilters = () => {
    setSelectedDepts([]);
    setSelectedSubjects([]);
    setSelectedYears([]);
    setSelectedPeople([]);
    setSelectedDesignations([]);
    setSearchQuery('');
  };

  const handleClearMemoFilters = () => {
    setSelectedMemoDepts([]);
    setSelectedMemoSubjects([]);
    setSelectedMemoPeople([]);
    setSelectedMemoDesignations([]);
    setSelectedMemoReceivers([]);
    setMemoSearchQuery('');
  };

  const toggleCheckboxFilter = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    if (list.includes(item)) {
      setList(list.filter(x => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans antialiased text-slate-900 selection:bg-amber-600 selection:text-white flex flex-col" id="erp-app-container">

      {/* Main Header */}
      <header className="bg-[#0A111E] text-white px-4 py-3 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 sticky top-0 z-40 shadow-xl" id="main-header">
        
        {/* Brand & Motto & Address Info */}
        <div className="flex items-center gap-3" id="brand-panel">
          <div>
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
            >
              <Menu size={20} />
            </button>
            
            {/* Drawer Overlay */}
            <div 
              className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
              onClick={() => setIsMenuOpen(false)}
            />

            {/* Drawer Panel */}
            <div 
              className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-[110] transform transition-transform duration-300 ease-in-out flex flex-col ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
              <div className="bg-[#0A111E] px-6 py-5 flex items-center justify-between text-white shrink-0">
                <div className="flex items-center gap-3">
                  <img src="https://lh3.googleusercontent.com/d/1x7Fp3Wsk8PqHLmMePPaah1wPdjs4SSvr" referrerPolicy="no-referrer" alt="BSK Logo" className="h-10 w-auto object-contain brightness-0 invert" />
                </div>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4">
                <div className="px-4 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Main Menu
                </div>
                <div className="space-y-1 px-2">
                  {hasMenuAccess('welcome') && (
                    <button
                      onClick={() => { setActiveTab('welcome'); setIsMenuOpen(false); }}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'welcome' ? 'bg-[#0A111E] text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'}`}
                    >
                      <span className="text-lg">🏠</span> 
                      <span>Welcome Portal</span>
                    </button>
                  )}
                  {hasMenuAccess('files') && (
                    <button
                      onClick={() => { setActiveTab('files'); setIsMenuOpen(false); }}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'files' ? 'bg-[#0A111E] text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'}`}
                    >
                      <span className="text-lg">📂</span> 
                      <span>File Opening</span>
                    </button>
                  )}
                  {hasMenuAccess('memos') && (
                    <button
                      onClick={() => { setActiveTab('memos'); setIsMenuOpen(false); }}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'memos' ? 'bg-[#0A111E] text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'}`}
                    >
                      <span className="text-lg">📝</span> 
                      <span>Memo Register</span>
                    </button>
                  )}
                  {hasMenuAccess('budget') && (
                    <button
                      onClick={() => { setActiveTab('budget'); setIsMenuOpen(false); }}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'budget' ? 'bg-[#0A111E] text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'}`}
                    >
                      <span className="text-lg">💰</span> 
                      <span>Budget Tracker</span>
                    </button>
                  )}
                  {hasMenuAccess('expense') && (
                    <button
                      onClick={() => { setActiveTab('expense'); setIsMenuOpen(false); }}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'expense' ? 'bg-[#0A111E] text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'}`}
                    >
                      <span className="text-lg">💸</span> 
                      <span>Expense Register</span>
                    </button>
                  )}
                  {hasMenuAccess('employees') && (
                    <button
                      onClick={() => { setActiveTab('employees'); setIsMenuOpen(false); }}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'employees' ? 'bg-[#0A111E] text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'}`}
                    >
                      <span className="text-lg">👥</span> 
                      <span>HR (হিউম্যান রিসোর্স)</span>
                    </button>
                  )}
                  {hasMenuAccess('pilotProjectMadhyomik') && (
                    <div className="space-y-1 my-1">
                      <button
                        onClick={() => setIsPilotProjectMenuOpen(!isPilotProjectMenuOpen)}
                        className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-between transition-colors ${
                          activeTab === 'pilotProjectPrimary' || activeTab === 'pilotProjectSecondary' || activeTab === 'pilotProjectMadhyomik' || activeTab === 'pilotProjectUchchoMadhyomik'
                            ? 'bg-amber-50 text-amber-900 border border-amber-200/80 font-black'
                            : 'hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">🚀</span> 
                          <span>পাইলট প্রজেক্ট ২০২৬</span>
                        </div>
                        <ChevronDown 
                          size={16} 
                          className={`transition-transform duration-200 text-slate-400 ${isPilotProjectMenuOpen ? 'rotate-180' : ''}`} 
                        />
                      </button>

                      {isPilotProjectMenuOpen && (
                        <div className="pl-4 space-y-1 border-l-2 border-amber-200/80 ml-4 my-1">
                          <button
                            onClick={() => { setActiveTab('pilotProjectPrimary'); setIsMenuOpen(false); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                              activeTab === 'pilotProjectPrimary' 
                                ? 'bg-[#0A111E] text-white shadow-md' 
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span className="text-sm">🏫</span> 
                            <span>প্রাথমিক (Primary)</span>
                          </button>

                          <button
                            onClick={() => { setActiveTab('pilotProjectSecondary'); setIsMenuOpen(false); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
                              activeTab === 'pilotProjectSecondary' || activeTab === 'pilotProjectMadhyomik' || activeTab === 'pilotProjectUchchoMadhyomik'
                                ? 'bg-[#0A111E] text-white shadow-md' 
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span className="text-sm">🎓</span> 
                            <span>মাধ্যমিক (Secondary)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {hasMenuAccess('dailyExpenseApproval') && (
                    <button
                      onClick={() => { setActiveTab('dailyExpenseApproval'); setIsMenuOpen(false); }}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'dailyExpenseApproval' ? 'bg-[#0A111E] text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'}`}
                    >
                      <span className="text-lg">🧾</span> 
                      <span>দৈনন্দিন খরচের অনুমোদন</span>
                    </button>
                  )}
                  {hasMenuAccess('analytics') && (
                    <button
                      onClick={() => { setActiveTab('analytics'); setIsMenuOpen(false); }}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'analytics' ? 'bg-[#0A111E] text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'}`}
                    >
                      <span className="text-lg">📊</span> 
                      <span>Dashboard</span>
                    </button>
                  )}
                  <a
                    href="https://hallbooking.bskbd.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 hover:bg-slate-100 text-slate-700 transition-colors"
                  >
                    <span className="text-lg">🏢</span> 
                    <span>Hall Room Booking</span>
                  </a>
                  <a
                    href="https://cafe.bskbd.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 hover:bg-slate-100 text-slate-700 transition-colors"
                  >
                    <span className="text-lg">☕</span> 
                    <span>BSKBD Cafe</span>
                  </a>
                  {userProfile?.role === 'Admin' && hasMenuAccess('security') && (
                    <button
                      onClick={() => { setActiveTab('security'); setIsMenuOpen(false); }}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'security' ? 'bg-[#0A111E] text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'}`}
                    >
                      <span className="text-lg">🔒</span> 
                      <span>Security Dashboard</span>
                    </button>
                  )}
                </div>

                <div className="mt-8 px-4 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  System
                </div>
                <div className="space-y-1 px-2">
                  <button
                    onClick={() => { setIsDatabaseBackupModalOpen(true); setIsMenuOpen(false); }}
                    className="w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 hover:bg-slate-100 text-slate-700 transition-colors"
                  >
                    <Database size={18} className="text-[#cca355]" />
                    <span>সম্পূর্ণ ডাটাবেজ ব্যাকআপ</span>
                  </button>
                  <button
                    onClick={() => { setIsSettingsOpen(true); setIsMenuOpen(false); }}
                    className="w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 hover:bg-slate-100 text-slate-700 transition-colors"
                  >
                    <Settings size={18} className="text-slate-500" />
                    <span>Settings</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="h-12 flex items-center justify-start shrink-0" id="bsk-logo-container">
            <img 
              src="https://lh3.googleusercontent.com/d/1x7Fp3Wsk8PqHLmMePPaah1wPdjs4SSvr" 
              alt="BSK Logo" 
              referrerPolicy="no-referrer"
              className="h-12 w-auto object-contain" 
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const svgSibling = e.currentTarget.nextElementSibling as HTMLElement;
                if (svgSibling) svgSibling.style.display = 'block';
              }}
            />
            <svg style={{ display: 'none' }} viewBox="0 0 100 100" className="w-12 h-12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="24" r="9" fill="#cca355" />
              <path d="M12,46 C24,42 32,32 44,48 C50,56 60,78 72,78 L84,78 C88,78 86,64 80,54 C74,44 64,24 52,14 C48,10 40,24 36,32 C30,42 16,48 12,46 Z" fill="#cca355" />
              <path d="M16,84 L88,84 C92,84 94,80 92,76 C88,72 82,72 74,72 L24,72 C18,72 14,76 16,84 Z" fill="#cca355" opacity="0.8" />
            </svg>
          </div>
          
          <div className="flex flex-col text-left" id="brand-text-block">
          </div>
        </div>

        {/* User profile, Live Clock, Connection Badge */}
        <div className="flex flex-wrap items-center gap-3 mt-3 md:mt-0 text-xs self-stretch md:self-auto justify-between md:justify-end border-t border-slate-800/80 md:border-0 pt-3 md:pt-0" id="user-controls-panel">
          
          {/* BSK Enterprise Portal Badge */}
          <div className="flex items-center">
            <span className="bg-[#cca355] text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider shadow-md">
              BSK Enterprise Portal
            </span>
          </div>

          {/* Digital Clock */}
          <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2 text-slate-300 font-mono shadow-inner" id="digital-clock-container">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">সময়:</span>
            <span className="text-[#cca355] font-bold text-xs" id="clock-display-val">{liveTime || "00:00:00 AM"}</span>
          </div>

          {/* Sync Badge */}
          <div className="hidden lg:flex items-center space-x-2 bg-slate-900/40 border border-slate-800 px-2.5 py-1.5 rounded-lg text-[10px]" id="realtime-badge">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0"></span>
            <span className="text-slate-400 font-semibold uppercase tracking-wider">Sync: Online</span>
          </div>

          {/* Language toggle EN/BN indicator */}
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 font-bold text-[10px]" id="lang-switch">
            <button 
              onClick={() => setLang('BN')} 
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${lang === 'BN' ? 'bg-[#cca355] text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
            >
              BN
            </button>
            <button 
              onClick={() => setLang('EN')} 
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${lang === 'EN' ? 'bg-[#cca355] text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
            >
              EN
            </button>
          </div>

          {/* Database Backup & Download Button */}
          <button 
            onClick={() => setIsDatabaseBackupModalOpen(true)}
            className="bg-amber-500/10 hover:bg-amber-500/20 text-[#cca355] border border-[#cca355]/40 px-3 py-1.5 rounded-lg font-bold text-[11px] shadow-xs transition-all duration-200 flex items-center gap-1.5 cursor-pointer hover:border-[#cca355] hover:-translate-y-0.5"
            title="সম্পূর্ণ ডাটাবেজ ব্যাকআপ ও ডাউনলোড করুন"
            id="full-db-backup-header-btn"
          >
            <Database size={13} className="text-[#cca355]" />
            <span className="hidden sm:inline font-black">ডাটাবেজ ব্যাকআপ</span>
            <span className="sm:hidden font-black">ব্যাকআপ</span>
          </button>

          {/* Profile capsule */}
          <div className="flex items-center gap-3 bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-800 shadow-md" id="profile-controls">
            {(userProfile?.photoURL && userProfile.photoURL !== '') && (
              <img 
                src={userProfile.photoURL} 
                alt="Profile" 
                className="w-8 h-8 rounded-full bg-slate-800 object-cover border border-slate-700 shadow"
                id="user-avatar-img"
              />
            )}
            <div className="text-left flex flex-col" id="user-info-text">
              <div className="font-bold text-slate-100 text-xs flex items-center gap-1" id="user-display-name">
                {userProfile?.displayName || 'Ovi'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {/* Red or Slate role indicator like the screenshot */}
                {userProfile?.role === 'Admin' ? (
                  <span className="bg-red-950/80 text-red-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-red-900/40 uppercase tracking-wider flex items-center gap-0.5">
                    🛡️ এডমিন
                  </span>
                ) : (
                  <span className="bg-slate-800 text-slate-300 text-[8px] font-black px-1.5 py-0.5 rounded border border-slate-700/50 uppercase tracking-wider flex items-center gap-0.5">
                    🛡️ সহযোগী
                  </span>
                )}
                
                <span className="text-[9px] text-slate-400 font-bold">•</span>
                
                <div className="text-[9px] text-[#cca355] font-bold" id="user-designation-badge">
                  {isEditingMyDesignation ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()} id="edit-designation-input-container">
                      <input 
                        type="text" 
                        value={newMyDesignation}
                        onChange={(e) => setNewMyDesignation(e.target.value)}
                        className="text-[9px] border border-slate-700 rounded px-1 py-0.5 w-16 bg-slate-900 text-white focus:outline-none"
                        autoFocus
                        id="new-designation-text-input"
                      />
                      <button 
                        onClick={handleUpdateMyDesignation}
                        className="bg-green-600 text-white p-0.5 rounded hover:bg-green-700"
                        id="save-designation-btn"
                      >
                        <Check size={9} />
                      </button>
                    </div>
                  ) : (
                    <span 
                      className="cursor-pointer hover:underline decoration-dotted transition-colors" 
                      onClick={() => setIsEditingMyDesignation(true)}
                      title="Click to edit"
                      id="display-designation-span"
                    >
                      {userProfile?.designation || 'Admin Officer'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Red Logout Button */}
          <button 
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-md shadow-red-950/20 transition-all duration-200 flex items-center gap-1 cursor-pointer hover:-translate-y-0.5"
            title="Logout"
            id="logout-btn"
          >
            <LogOut size={12} />
            <span>আউট</span>
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="p-4 md:p-6 lg:p-8 flex-grow max-w-[1600px] mx-auto w-full flex flex-col gap-6" id="main-content-canvas">
        
        {/* VIEW 0: WELCOME PORTAL */}
        {activeTab === 'welcome' && (
          <div className="flex-grow bg-[#FAF8F5] border border-amber-100/50 shadow-inner rounded-3xl min-h-[75vh] flex flex-col items-center justify-center py-16 px-4 md:px-8 text-center" id="welcome-portal-view">
            
            {/* Logo Section */}
            <div className="mb-6 flex flex-col items-center animate-fade-in" id="welcome-logo-container">
              <img 
                src="https://lh3.googleusercontent.com/d/1x7Fp3Wsk8PqHLmMePPaah1wPdjs4SSvr" 
                alt="BSK Logo" 
                referrerPolicy="no-referrer"
                className="h-32 w-auto object-contain" 
              />
              {/* Bengali title removed as requested */}
            </div>

            {/* Title & Subtitle */}
            <div className="mb-10 text-center" id="welcome-title-container">
              <span className="text-slate-500 font-medium text-lg md:text-xl tracking-wider uppercase block" id="welcome-intro-text">
                Welcome to
              </span>
              <h1 className="text-3xl md:text-5.5xl font-extrabold text-slate-900 tracking-tight mt-1 font-sans" id="welcome-main-heading">
                BSK Enterprise Portal
              </h1>
            </div>

            {/* Decorative Separator */}
            <div className="flex items-center justify-center gap-3 w-full max-w-md mx-auto mb-10" id="welcome-separator">
              <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent to-amber-300" />
              <span className="text-amber-600 text-lg">✦</span>
              <div className="h-[1px] flex-grow bg-gradient-to-l from-transparent to-amber-300" />
            </div>

            {/* Welcome Back Card */}
            <div className="bg-white rounded-2xl border border-amber-100/60 shadow-[0_12px_40px_rgba(184,144,71,0.06)] max-w-2xl w-full p-6 md:p-8 flex flex-col md:flex-row items-center divide-y md:divide-y-0 md:divide-x divide-slate-100 gap-6 md:gap-0" id="welcome-user-card">
              
              {/* Left Column: User details */}
              <div className="flex items-center gap-4 w-full md:w-3/5 pb-6 md:pb-0 md:pr-6 text-left" id="welcome-card-left">
                <div className="bg-amber-50 text-amber-700 h-16 w-16 rounded-full flex items-center justify-center shrink-0 border border-amber-100 shadow-sm" id="welcome-user-avatar">
                  <User size={28} />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block" id="welcome-back-label">
                    Welcome back,
                  </span>
                  <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 leading-tight mt-0.5" id="welcome-user-name">
                    {userProfile?.displayName || 'Liha Akter'}
                  </h2>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded mt-1.5 inline-block" id="welcome-user-designation">
                    {userProfile?.designation || 'Administrator'}
                  </span>
                </div>
              </div>

              {/* Right Column: Date Info */}
              <div className="w-full md:w-2/5 pt-6 md:pt-0 md:pl-6 flex items-center gap-4 text-left" id="welcome-card-right">
                <div className="bg-amber-50 text-amber-700 h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border border-amber-100 shadow-sm" id="welcome-date-icon">
                  <Calendar size={22} />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-black text-slate-800 leading-tight" id="welcome-current-date">
                    {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </h3>
                  <span className="text-xs font-bold text-slate-500 block mt-0.5" id="welcome-current-day">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                  </span>
                </div>
              </div>

            </div>

            {/* Bengali Motto removed as requested */}

            {/* Footer rights */}
            <div className="mt-16 text-slate-400 text-[11px] font-bold tracking-wide" id="welcome-footer">
              © {new Date().getFullYear()} BSK. ALL RIGHTS RESERVED.
            </div>

          </div>
        )}

        {/* VIEW 1: FILE REGISTER */}
        {activeTab === 'files' && (
          <div className="flex flex-col gap-6" id="files-tab-container">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 flex flex-col gap-4" id="file-register-section">
              
              {/* Panel Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3" id="file-register-title-row">
                <div className="text-left">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-xl">📂</span>
                    {"File Opening Register"}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{"Log of file opening dates and custom unique ID generation"}</p>
                </div>
                <span className="text-[10px] text-amber-700 font-black bg-amber-100 px-2.5 py-1 rounded-full uppercase self-start sm:self-auto shadow-xs">
                  {files.length} Records
                </span>
              </div>

              {/* Search and Action Bar */}
              <div className="flex flex-col sm:flex-row gap-3" id="file-actions-controls">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input 
                    type="text"
                    placeholder={"Search File Register..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-[#cca355] focus:bg-white transition-all text-slate-700 placeholder:text-slate-400 font-medium"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-md"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2" id="file-action-buttons">
                  {(selectedDepts.length > 0 || selectedSubjects.length > 0 || selectedYears.length > 0 || selectedPeople.length > 0 || selectedDesignations.length > 0 || searchQuery !== '') && (
                    <button 
                      onClick={handleClearAllFilters}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] font-bold px-2.5 py-2 rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                      title="Clear filters"
                    >
                      <RefreshCw size={12} />
                    </button>
                  )}

                  <button 
                    onClick={handleExportCSV}
                    disabled={filteredFiles.length === 0}
                    className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-[11px] font-bold px-3 py-2 rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                    title="CSV এক্সপোর্ট"
                  >
                    <Download size={12} />
                    <span>CSV</span>
                  </button>

                  {isSuperAdmin && (
                    <button 
                      onClick={handleFixFileFormatsAndDates}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-black px-3 py-2 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-sm border border-amber-400"
                      title={lang === 'BN' ? "সব ফাইলের তারিখ ও ড্যাশ ঠিক করুন" : "Format Dates & Dots for All Files"}
                    >
                      <Database size={12} />
                      <span>{lang === 'BN' ? "ডাটা ঠিক করুন" : "Fix Database"}</span>
                    </button>
                  )}

                  {hasActionAccess('files', 'create') && (
                    <button 
                      onClick={() => setIsAddModalOpen(true)}
                      className="bg-[#0A111E] hover:bg-[#162238] text-white text-[11px] font-bold px-3.5 py-2 rounded-lg border border-slate-700 hover:border-amber-500/50 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus size={13} className="text-[#cca355]" />
                      <span>{"Add File"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Active Filter Pills row */}
              {(selectedDepts.length > 0 || selectedSubjects.length > 0 || selectedYears.length > 0 || selectedPeople.length > 0 || selectedDesignations.length > 0) && (
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg text-[10px]">
                  <span className="font-bold text-slate-400 mr-1">{"Active Filters:"}</span>
                  {selectedDepts.map(d => (
                    <span key={d} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 font-semibold border border-amber-500/20">
                      {d} <X size={9} className="cursor-pointer text-amber-700 hover:text-amber-950" onClick={() => toggleCheckboxFilter(selectedDepts, setSelectedDepts, d)} />
                    </span>
                  ))}
                  {selectedSubjects.map(s => (
                    <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                      {s} <X size={9} className="cursor-pointer" onClick={() => toggleCheckboxFilter(selectedSubjects, setSelectedSubjects, s)} />
                    </span>
                  ))}
                  {selectedYears.map(y => (
                    <span key={y} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                      {y} <X size={9} className="cursor-pointer" onClick={() => toggleCheckboxFilter(selectedYears, setSelectedYears, y)} />
                    </span>
                  ))}
                </div>
              )}

              {/* Table Spreadsheet View */}
              <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-xs flex flex-col bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#0A111E] text-slate-300 text-[10px] font-bold uppercase border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3 font-bold text-[#cca355] text-center w-12">
                          <button onClick={() => setFileSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="flex items-center justify-center w-full gap-1 hover:text-amber-300">
                            SI {fileSortOrder === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                          </button>
                        </th>
                        <th className="py-2.5 px-3 font-bold">Date</th>
                        
                        {/* Dept Column Filter Header */}
                        <th className="py-2.5 px-3 relative">
                          <div 
                            className="flex items-center gap-1 cursor-pointer hover:text-white select-none"
                            onClick={() => setActiveFilterColumn(activeFilterColumn === 'department' ? null : 'department')}
                          >
                            Dept <Filter size={9} className={selectedDepts.length > 0 ? "text-[#cca355]" : "text-slate-500"} />
                          </div>
                          {activeFilterColumn === 'department' && (
                            <div className="absolute left-2 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-2.5 text-slate-800 normal-case">
                              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-[9px] font-bold text-slate-400">
                                <span>FILTER DEPT</span>
                                <button onClick={() => setSelectedDepts([])} className="text-amber-600 hover:underline">Clear</button>
                              </div>
                              <div className="max-h-32 overflow-y-auto flex flex-col gap-1 text-[11px]">
                                {uniqueFilterValues.departments.map(dept => (
                                  <label key={dept} className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                                    <input type="checkbox" checked={selectedDepts.includes(dept)} onChange={() => toggleCheckboxFilter(selectedDepts, setSelectedDepts, dept)} className="rounded text-amber-600 w-3 h-3" />
                                    {dept}
                                  </label>
                                ))}
                              </div>
                              <button onClick={() => setActiveFilterColumn(null)} className="w-full bg-slate-900 text-white text-[9px] font-bold py-1 mt-2 rounded">OK</button>
                            </div>
                          )}
                        </th>

                        {/* Subject Column Filter Header */}
                        <th className="py-2.5 px-3 relative">
                          <div 
                            className="flex items-center gap-1 cursor-pointer hover:text-white select-none"
                            onClick={() => setActiveFilterColumn(activeFilterColumn === 'subject' ? null : 'subject')}
                          >
                            Subject <Filter size={9} className={selectedSubjects.length > 0 ? "text-[#cca355]" : "text-slate-500"} />
                          </div>
                          {activeFilterColumn === 'subject' && (
                            <div className="absolute left-2 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-2.5 text-slate-800 normal-case">
                              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-[9px] font-bold text-slate-400">
                                <span>FILTER SUBJECT</span>
                                <button onClick={() => setSelectedSubjects([])} className="text-amber-600 hover:underline">Clear</button>
                              </div>
                              <div className="max-h-32 overflow-y-auto flex flex-col gap-1 text-[11px]">
                                {uniqueFilterValues.subjects.map(sub => (
                                  <label key={sub} className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                                    <input type="checkbox" checked={selectedSubjects.includes(sub)} onChange={() => toggleCheckboxFilter(selectedSubjects, setSelectedSubjects, sub)} className="rounded text-amber-600 w-3 h-3" />
                                    <span className="truncate max-w-[150px]">{sub}</span>
                                  </label>
                                ))}
                              </div>
                              <button onClick={() => setActiveFilterColumn(null)} className="w-full bg-slate-900 text-white text-[9px] font-bold py-1 mt-2 rounded">OK</button>
                            </div>
                          )}
                        </th>

                        <th className="py-2.5 px-3 font-bold">Officer</th>
                        <th className="py-2.5 px-3 font-bold">Unique File Name [ID]</th>
                        <th className="py-2.5 px-3 text-center w-36">Action</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-[11px] text-slate-600">
                      {loadingFiles ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-400 font-semibold animate-pulse">
                            <RefreshCw className="animate-spin text-amber-600 inline mr-2" size={14} />
                            {"Loading..."}
                          </td>
                        </tr>
                      ) : filteredFiles.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            <AlertCircle size={20} className="mx-auto text-slate-300 mb-1" />
                            <span>{"No file records found."}</span>
                          </td>
                        </tr>
                      ) : (
                        filteredFiles.map((file) => (
                          <tr key={file.id} className={`hover:bg-slate-50/65 transition-all ${file.status === 'pending' ? 'opacity-60 bg-red-50/30' : ''}`}>
                            <td className="py-2 px-3 text-center font-mono font-bold text-slate-800 bg-slate-50/50 border-r border-slate-100">
                              <div className="flex items-center justify-center gap-1.5">
                                <span>{file.si}</span>
                                {file.status === 'pending' && (
                                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0" title="Pending Approval"></span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-slate-500 font-medium whitespace-nowrap">{file.openingDate}</td>
                            <td className="py-2 px-3">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/10 text-[#a87f2a] border border-amber-500/20 uppercase">{file.department}</span>
                            </td>
                            <td className="py-2 px-3 text-slate-800 font-semibold truncate max-w-[120px]" title={file.subject}>{file.subject}</td>
                            <td className="py-2 px-3 text-slate-700" title={file.designation}>{file.responsiblePerson || '-'}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900 bg-amber-500/[0.02] border-l border-slate-100">
                              <div className="flex items-center gap-1.5 group/id">
                                <span className="truncate" title={file.fileName}>{file.fileName}</span>
                                {file.part && file.part !== 'None' && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0 font-sans">
                                    {file.part}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* APPROVE (SUPER ADMIN ONLY) */}
                                {isSuperAdmin && file.status === 'pending' && (
                                  <button 
                                    onClick={() => handleApproveFile(file.id)} 
                                    title={"Approve Record"}
                                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition cursor-pointer"
                                  >
                                    <CheckCircle size={13} />
                                  </button>
                                )}

                                {/* NOTE */}
                                <button 
                                  onClick={() => handleOpenNotes('file', file.id, file.fileName)} 
                                  title={"Add/View Note"}
                                  className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition cursor-pointer"
                                >
                                  <ClipboardList size={13} />
                                </button>

                                {/* EDIT (SUPER ADMIN ONLY) */}
                                {/* EDIT */}
                                {hasActionAccess('files', 'edit') ? (
                                  <button 
                                    onClick={() => handleOpenEdit('file', file)} 
                                    title={"Edit Record"}
                                    className="p-1 rounded transition cursor-pointer text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                  >
                                    <Edit size={13} />
                                  </button>
                                ) : (
                                  <button 
                                    disabled
                                    title={"Locked (Lacks permission)"}
                                    className="p-1 text-slate-300 cursor-not-allowed"
                                  >
                                    <Lock size={11} />
                                  </button>
                                )}

                                {/* COPY */}
                                <button 
                                  onClick={() => {
                                    handleCopyText(file.fileName);
                                    logAction('COPY_ID', `Copied unique ID: ${file.fileName}`);
                                  }}
                                  title={"Copy Unique ID"}
                                  className="p-1 text-[#cca355] hover:text-[#b0873a] hover:bg-amber-50 rounded transition cursor-pointer"
                                >
                                  {copiedId === file.fileName ? (
                                    <Check size={13} className="text-green-600" />
                                  ) : (
                                    <Copy size={13} />
                                  )}
                                </button>

                                {/* DELETE */}
                                {hasActionAccess('files', 'delete') ? (
                                  <button 
                                    onClick={() => handleDeleteFile(file.id, file.fileName)} 
                                    title={"Delete"}
                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                ) : (
                                  <button 
                                    disabled
                                    title={"Delete option locked (Lacks permission)"}
                                    className="p-1 text-slate-300 bg-slate-50 border border-slate-100 rounded cursor-not-allowed flex items-center gap-0.5"
                                  >
                                    <Trash2 size={11} className="text-slate-300" />
                                    <Lock size={9} className="text-slate-400" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                <div className="bg-slate-50 px-3 py-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <span>SHOWING {filteredFiles.length} OF {files.length} FILE RECORDS</span>
                  <span>BSK VAULT</span>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* VIEW 1.2: MEMO REGISTER */}
        {activeTab === 'memos' && (
          <div className="flex flex-col gap-6" id="memos-tab-container">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 flex flex-col gap-4" id="memo-register-section">
              
              {/* Panel Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3" id="memo-register-title-row">
                <div className="text-left">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-xl">📝</span>
                    {"মেমো রেজিস্টার (Memo Register)"}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{"পত্রাদি ও মেমোরেন্ডাম পাঠানোর তারিখ, গ্রাহক ও মেমো নাম্বার তথ্যছক"}</p>
                </div>
                <span className="text-[10px] text-indigo-700 font-black bg-indigo-50 px-2.5 py-1 rounded-full uppercase self-start sm:self-auto shadow-xs border border-indigo-100">
                  {toBengali(memos.length.toString())} Records
                </span>
              </div>

              {/* Search and Action Bar */}
              <div className="flex flex-col sm:flex-row gap-3" id="memo-actions-controls">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input 
                    type="text"
                    placeholder={"মেমো আইডি, গ্রাহক, বিভাগ বা দায়িত্বপ্রাপ্ত দিয়ে খুঁজুন..."}
                    value={memoSearchQuery}
                    onChange={(e) => setMemoSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white transition-all text-slate-700 placeholder:text-slate-400 font-medium"
                  />
                  {memoSearchQuery && (
                    <button 
                      onClick={() => setMemoSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-md"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2" id="memo-action-buttons">
                  {(selectedMemoDepts.length > 0 || selectedMemoSubjects.length > 0 || selectedMemoPeople.length > 0 || selectedMemoDesignations.length > 0 || selectedMemoReceivers.length > 0 || memoSearchQuery !== '') && (
                    <button 
                      onClick={handleClearMemoFilters}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] font-bold px-2.5 py-2 rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                      title="Clear filters"
                    >
                      <RefreshCw size={12} />
                    </button>
                  )}

                  <button 
                    onClick={handleExportMemoCSV}
                    disabled={filteredMemos.length === 0}
                    className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-[11px] font-bold px-3 py-2 rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                    title="CSV এক্সপোর্ট"
                  >
                    <Download size={12} />
                    <span>CSV</span>
                  </button>

                  {hasActionAccess('memos', 'create') && (
                    <button 
                      onClick={() => setIsAddMemoModalOpen(true)}
                      className="bg-[#0A111E] hover:bg-[#162238] text-white text-[11px] font-bold px-3.5 py-2 rounded-lg border border-slate-700 hover:border-indigo-500/50 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus size={13} className="text-[#cca355]" />
                      <span>{"মেমো এন্ট্রি"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Active Filter Pills row for Memo */}
              {(selectedMemoDepts.length > 0 || selectedMemoSubjects.length > 0 || selectedMemoPeople.length > 0 || selectedMemoDesignations.length > 0 || selectedMemoReceivers.length > 0) && (
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-indigo-500/5 border border-indigo-500/10 rounded-lg text-[10px]">
                  <span className="font-bold text-slate-400 mr-1">{"সক্রিয় ফিল্টার:"}</span>
                  {selectedMemoDepts.map(d => (
                    <span key={d} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-700 font-semibold border border-indigo-500/20">
                      {d} <X size={9} className="cursor-pointer text-indigo-700 hover:text-indigo-950" onClick={() => toggleCheckboxFilter(selectedMemoDepts, setSelectedMemoDepts, d)} />
                    </span>
                  ))}
                  {selectedMemoSubjects.map(s => (
                    <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                      {s} <X size={9} className="cursor-pointer" onClick={() => toggleCheckboxFilter(selectedMemoSubjects, setSelectedMemoSubjects, s)} />
                    </span>
                  ))}
                  {selectedMemoReceivers.map(r => (
                    <span key={r} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                      {r} <X size={9} className="cursor-pointer" onClick={() => toggleCheckboxFilter(selectedMemoReceivers, setSelectedMemoReceivers, r)} />
                    </span>
                  ))}
                </div>
              )}

              {/* Memo Table Spreadsheet View */}
              <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-xs flex flex-col bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#0A111E] text-slate-300 text-[10px] font-bold uppercase border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3 font-bold text-[#cca355] text-center w-12">
                          <button onClick={() => setMemoSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="flex items-center justify-center w-full gap-1 hover:text-amber-300">
                            SI {memoSortOrder === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                          </button>
                        </th>
                        <th className="py-2.5 px-3 font-bold">Date</th>
                        
                        {/* Memo Dept Column Filter Header */}
                        <th className="py-2.5 px-3 relative">
                          <div 
                            className="flex items-center gap-1 cursor-pointer hover:text-white select-none"
                            onClick={() => setActiveMemoFilterColumn(activeMemoFilterColumn === 'department' ? null : 'department')}
                          >
                            Dept <Filter size={9} className={selectedMemoDepts.length > 0 ? "text-[#cca355]" : "text-slate-500"} />
                          </div>
                          {activeMemoFilterColumn === 'department' && (
                            <div className="absolute left-2 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-2.5 text-slate-800 normal-case">
                              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-[9px] font-bold text-slate-400">
                                <span>FILTER DEPT</span>
                                <button onClick={() => setSelectedMemoDepts([])} className="text-amber-600 hover:underline">Clear</button>
                              </div>
                              <div className="max-h-32 overflow-y-auto flex flex-col gap-1 text-[11px]">
                                {uniqueMemoFilterValues.departments.map(dept => (
                                  <label key={dept} className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                                    <input type="checkbox" checked={selectedMemoDepts.includes(dept)} onChange={() => toggleCheckboxFilter(selectedMemoDepts, setSelectedMemoDepts, dept)} className="rounded text-amber-600 w-3 h-3" />
                                    {dept}
                                  </label>
                                ))}
                              </div>
                              <button onClick={() => setActiveMemoFilterColumn(null)} className="w-full bg-slate-900 text-white text-[9px] font-bold py-1 mt-2 rounded">OK</button>
                            </div>
                          )}
                        </th>

                        {/* Memo Subject Column Filter Header */}
                        <th className="py-2.5 px-3 relative">
                          <div 
                            className="flex items-center gap-1 cursor-pointer hover:text-white select-none"
                            onClick={() => setActiveMemoFilterColumn(activeMemoFilterColumn === 'subject' ? null : 'subject')}
                          >
                            Subject <Filter size={9} className={selectedMemoSubjects.length > 0 ? "text-[#cca355]" : "text-slate-500"} />
                          </div>
                          {activeMemoFilterColumn === 'subject' && (
                            <div className="absolute left-2 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-2.5 text-slate-800 normal-case">
                              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-[9px] font-bold text-slate-400">
                                <span>FILTER SUBJECT</span>
                                <button onClick={() => setSelectedMemoSubjects([])} className="text-amber-600 hover:underline">Clear</button>
                              </div>
                              <div className="max-h-32 overflow-y-auto flex flex-col gap-1 text-[11px]">
                                {uniqueMemoFilterValues.subjects.map(sub => (
                                  <label key={sub} className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
                                    <input type="checkbox" checked={selectedMemoSubjects.includes(sub)} onChange={() => toggleCheckboxFilter(selectedMemoSubjects, setSelectedMemoSubjects, sub)} className="rounded text-amber-600 w-3 h-3" />
                                    <span className="truncate max-w-[150px]">{sub}</span>
                                  </label>
                                ))}
                              </div>
                              <button onClick={() => setActiveMemoFilterColumn(null)} className="w-full bg-slate-900 text-white text-[9px] font-bold py-1 mt-2 rounded">OK</button>
                            </div>
                          )}
                        </th>

                        <th className="py-2.5 px-3 font-bold">Receiver</th>
                        <th className="py-2.5 px-3 font-bold hidden md:table-cell">Details</th>
                        <th className="py-2.5 px-3 font-bold">Officer</th>
                        <th className="py-2.5 px-3 font-bold">Memo Number</th>
                        <th className="py-2.5 px-3 text-center w-36">Action</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-[11px] text-slate-600">
                      {loadingMemos ? (
                        <tr>
                          <td colSpan={9} className="py-10 text-center text-slate-400 font-semibold animate-pulse">
                            <RefreshCw className="animate-spin text-indigo-600 inline mr-2" size={14} />
                            {"লোড হচ্ছে..."}
                          </td>
                        </tr>
                      ) : filteredMemos.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400">
                            <AlertCircle size={20} className="mx-auto text-slate-300 mb-1" />
                            <span>{"কোন মেমো এন্ট্রি পাওয়া যায়নি।"}</span>
                          </td>
                        </tr>
                      ) : (
                        filteredMemos.map((memo) => (
                          <tr key={memo.id} className={`hover:bg-slate-50/65 transition-all ${memo.status === 'pending' ? 'opacity-60 bg-red-50/30' : ''}`}>
                            <td className="py-2 px-3 text-center font-mono font-bold text-slate-800 bg-slate-50/50 border-r border-slate-100">
                              <div className="flex items-center justify-center gap-1.5">
                                <span>{toBengali(memo.si)}</span>
                                {memo.status === 'pending' && (
                                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0" title="Pending Approval"></span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-slate-500 font-medium whitespace-nowrap">{toBengali(memo.openingDate)}</td>
                            <td className="py-2 px-3">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-500/10 text-indigo-700 border border-indigo-500/20 uppercase">{memo.department}</span>
                            </td>
                            <td className="py-2 px-3 text-slate-800 font-semibold truncate max-w-[100px]" title={memo.subject}>{memo.subject}</td>
                            <td className="py-2 px-3 text-slate-800 font-bold whitespace-nowrap truncate max-w-[90px]" title={memo.receiver}>{memo.receiver}</td>
                            <td className="py-2 px-3 text-slate-500 font-medium truncate max-w-[150px] hidden md:table-cell" title={memo.note}>{memo.note || '-'}</td>
                            <td className="py-2 px-3 text-slate-700">{memo.responsiblePerson || '-'}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900 bg-indigo-50/[0.02] border-l border-slate-100">
                              <div className="flex items-center gap-1.5 group/id">
                                <span className="truncate" title={memo.memoNumber}>{toBengali(memo.memoNumber)}</span>
                                {memo.part && memo.part !== 'None' && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 shrink-0 font-sans">
                                    {memo.part === 'Part 1' ? 'খণ্ড ১' : memo.part === 'Part 2' ? 'খণ্ড ২' : memo.part === 'Part 3' ? 'খণ্ড ৩' : memo.part === 'Part 4' ? 'খণ্ড ৪' : memo.part === 'Part 5' ? 'খণ্ড ৫' : memo.part}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* APPROVE (SUPER ADMIN ONLY) */}
                                {isSuperAdmin && memo.status === 'pending' && (
                                  <button 
                                    onClick={() => handleApproveMemo(memo.id)} 
                                    title={"অনুমোদন করুন"}
                                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition cursor-pointer"
                                  >
                                    <CheckCircle size={13} />
                                  </button>
                                )}

                                {/* NOTE */}
                                <button 
                                  onClick={() => handleOpenNotes('memo', memo.id, memo.memoNumber)} 
                                  title={"নোট রাখুন"}
                                  className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition cursor-pointer"
                                >
                                  <ClipboardList size={13} />
                                </button>

                                {/* EDIT (SUPER ADMIN ONLY) */}
                                <button 
                                  onClick={() => handleOpenEdit('memo', memo)} 
                                  title={isSuperAdmin ? ("তথ্য সংশোধন") : ("শুধুমাত্র সুপার এডমিনদের জন্য লকড")}
                                  className={`p-1 rounded transition cursor-pointer ${isSuperAdmin ? 'text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50' : 'text-slate-300 hover:text-red-500 cursor-not-allowed'}`}
                                >
                                  {isSuperAdmin ? <Edit size={13} /> : <Lock size={11} />}
                                </button>

                                {/* COPY */}
                                <button 
                                  onClick={() => {
                                    handleCopyText(memo.memoNumber);
                                    logAction('COPY_ID', `Copied memo unique ID: ${memo.memoNumber}`);
                                  }}
                                  title={"মেমো নাম্বার কপি করুন"}
                                  className="p-1 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition cursor-pointer"
                                >
                                  {copiedId === memo.memoNumber ? (
                                    <Check size={13} className="text-green-600" />
                                  ) : (
                                    <Copy size={13} />
                                  )}
                                </button>

                                {/* DELETE */}
                                {hasActionAccess('memos', 'delete') ? (
                                  <button 
                                    onClick={() => handleDeleteMemo(memo.id, memo.memoNumber)} 
                                    title={"ডিলিট করুন"}
                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                ) : (
                                  <button 
                                    disabled
                                    title={"ডিলিট অপশন লকড (অনুমতি নেই)"}
                                    className="p-1 text-slate-300 bg-slate-50 border border-slate-100 rounded cursor-not-allowed flex items-center gap-0.5"
                                  >
                                    <Trash2 size={11} className="text-slate-300" />
                                    <Lock size={9} className="text-slate-400" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                <div className="bg-slate-50 px-3 py-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <span>SHOWING {toBengali(filteredMemos.length.toString())} OF {toBengali(memos.length.toString())} MEMO RECORDS</span>
                  <span>BSK VAULT</span>
                </div>
              </div>
            </section>
          </div>
        )}

        
        
        
        {/* VIEW 1.3: BUDGET TRACKER */}
        {activeTab === 'budget' && (
          <div className="flex flex-col gap-6" id="budget-tab-container">
            {!isLocalSandbox && (localSandboxBudgetsCount > 0 || localSandboxExpensesCount > 0) && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
                <div className="flex gap-3 text-left">
                  <div className="bg-amber-100 text-amber-800 p-2.5 rounded-xl shrink-0 mt-0.5 md:mt-0">
                    <Database size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">অফলাইন স্যান্ডবক্স ডেটা সনাক্ত করা হয়েছে! (Offline Sandbox Data Found!)</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      আপনার ব্রাউজারে অফলাইন স্যান্ডবক্সের <strong>{toBengali(localSandboxBudgetsCount.toString())} টি বাজেট</strong> এবং <strong>{toBengali(localSandboxExpensesCount.toString())} টি খরচ (Expense)</strong> পাওয়া গেছে। আপনি কি পূর্বে স্যান্ডবক্স মোডে এই এন্ট্রিগুলো করেছিলেন? এগুলো সরাসরি এই লাইভ ডাটাবেজে (FIREBASE-MAIN) ইম্পোর্ট করে নিতে পারেন।
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 w-full md:w-auto">
                  <button
                    onClick={handleMigrateSandboxData}
                    disabled={isMigratingData}
                    className="w-full md:w-auto bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    {isMigratingData ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span>☁️</span>
                    )}
                    <span>লাইভ ডাটাবেজে ইম্পোর্ট করুন (Import to Live DB)</span>
                  </button>
                </div>
              </div>
            )}

            <section className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div className="text-left">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-xl">💰</span>
                    {"বাজেট ট্র্যাকার (Budget Tracker)"}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{"Track budget heads, figures, and variances"}</p>
                </div>

                <div className="flex items-center flex-wrap gap-3">
                  {/* Fiscal Year Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">অর্থবছর:</span>
                    <select
                      value={selectedFiscalYear}
                      onChange={(e) => setSelectedFiscalYear(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 h-[34px] text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="2025-2026">2025-2026</option>
                      <option value="2026-2027">2026-2027</option>
                      <option value="2024-2025">2024-2025</option>
                      <option value="2023-2024">2023-2024</option>
                    </select>
                  </div>

                  {/* Add Budget Button */}
                  {hasActionAccess('budget', 'create') && (
                    <button 
                      onClick={() => setIsAddBudgetModalOpen(true)}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 h-[34px] rounded-lg font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg"
                    >
                      <Plus size={14} /> 
                      <span>Add Budget</span>
                    </button>
                  )}

                  {/* Add Expense Button */}
                  {hasActionAccess('expense', 'create') && (
                    <button 
                      onClick={() => setIsAddExpenseModalOpen(true)}
                      className="bg-amber-500 hover:bg-amber-600 text-white px-4 h-[34px] rounded-lg font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg"
                    >
                      <Plus size={14} /> 
                      <span>Add Expense</span>
                    </button>
                  )}

                  {/* Excel Report Download Icon Button */}
                  <button 
                    onClick={handleExportToExcel}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-[34px] w-[34px] rounded-lg font-bold shadow-md transition-all flex items-center justify-center cursor-pointer hover:shadow-lg shrink-0"
                    title="Excel রিপোর্ট ডাউনলোড করুন (Export to Excel)"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-xl mt-4">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                      <th className="p-3 border-b border-slate-200 text-center w-12">SL</th>
                      <th className="p-3 border-b border-slate-200 w-24">Budget Code</th>
                      <th className="p-3 border-b border-slate-200 w-64">Budget Head</th>
                      <th className="p-3 border-b border-slate-200 w-32">Responsible Person</th>
                      <th className="p-3 border-b border-slate-200 text-right w-32">Budget Figure</th>
                      <th className="p-3 border-b border-slate-200 text-right w-32">Variance / Expense</th>
                      <th className="p-3 border-b border-slate-200 text-right w-32">Balance</th>
                      <th className="p-3 border-b border-slate-200 text-center w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {filteredBudgets.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400 font-semibold">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <span className="text-3xl">📂</span>
                            <p className="text-sm font-bold text-slate-600">এই অর্থবছরের জন্য কোনো বাজেট পাওয়া যায়নি</p>
                            <p className="text-[11px] text-slate-400">No budgets found for fiscal year {selectedFiscalYear}</p>
                            {hasActionAccess('budget', 'create') && (
                              <button 
                                onClick={async () => {
                                  if (confirm(`Do you want to initialize the default budget structure for ${selectedFiscalYear}?`)) {
                                    for (const item of INITIAL_BUDGET_DATA) {
                                      try {
                                        await addDoc(collection(db, 'budgets'), {
                                          sl: item.sl,
                                          budgetCode: item.budgetCode,
                                          budgetHead: item.budgetHead,
                                          responsiblePerson: item.responsiblePerson,
                                          budgetFigure: item.budgetFigure,
                                          fiscalYear: selectedFiscalYear,
                                          note: '',
                                          createdAt: serverTimestamp(),
                                          createdBy: userProfile.email
                                        });
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    }
                                  }
                                }}
                                className="mt-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                              >
                                ⚡ Initialize with Default Structure (ডিফল্ট স্ট্রাকচার দিয়ে শুরু করুন)
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredBudgets.map((item, index) => {
                        const totalExpense = filteredExpenses
                          .filter(e => e.budgetCode === item.budgetCode)
                          .reduce((sum, e) => sum + e.amount, 0);
                        const balance = item.budgetFigure - totalExpense;
                        const budgetExpenses = filteredExpenses.filter(e => e.budgetCode === item.budgetCode);
                        const isExpanded = expandedBudgetCode === item.budgetCode;
                        return (
                          <React.Fragment key={index}>
                        <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-center text-slate-400 font-medium">{item.sl}</td>
                          <td className="p-3 font-bold text-slate-700">{item.budgetCode}</td>
                          <td className="p-3 text-slate-600 truncate max-w-xs" title={item.budgetHead}>{item.budgetHead}</td>
                          <td className="p-3">
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold">{item.responsiblePerson}</span>
                          </td>
                          <td className="p-3 text-right font-black text-slate-800">
                            ৳ {item.budgetFigure.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-medium text-amber-600">
                            <div className="flex items-center justify-end gap-2">
                              <span>৳ {totalExpense.toLocaleString()}</span>
                              {budgetExpenses.length > 0 && (
                                <button 
                                  onClick={() => setExpandedBudgetCode(isExpanded ? null : item.budgetCode)}
                                  className="text-slate-400 hover:text-amber-600 p-1 bg-slate-100 hover:bg-amber-50 rounded flex items-center justify-center cursor-pointer"
                                  title="View Details"
                                >
                                  {isExpanded ? <ChevronDown size={14} className="rotate-180 transition-transform" /> : <ChevronDown size={14} className="transition-transform" />}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className={`p-3 text-right font-black ${balance < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {balance < 0 ? `- ৳ ${Math.abs(balance).toLocaleString()}` : `৳ ${balance.toLocaleString()}`}
                          </td>

                          <td className="p-3 text-center flex items-center justify-center gap-1.5 font-sans">
                            {hasActionAccess('budget', 'edit') && (
                              <button 
                                onClick={() => handleOpenEditBudget(item)}
                                className="text-indigo-400 hover:text-indigo-600 p-1 transition cursor-pointer"
                                title="Edit Budget"
                              >
                                <Edit size={14} />
                              </button>
                            )}
                            {hasActionAccess('budget', 'delete') && (
                              <button 
                                onClick={() => handleDeleteBudget(item.id)}
                                className="text-red-400 hover:text-red-600 p-1 transition cursor-pointer"
                                title="Delete Budget"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                            <button 
                                onClick={() => handleOpenNotes('budget', item.id, item.budgetHead)}
                                className={`p-1 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                                  item.note ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                                }`}
                                title={item.note ? "View/Edit Note" : "Add Note"}
                              >
                                <ClipboardList size={14} />
                            </button>
                          </td>

                        </tr>
                          {isExpanded && budgetExpenses.length > 0 && (
                            <tr className="bg-slate-50/50">
                              <td colSpan={8} className="p-4 border-b border-slate-100">
                                <div className="bg-white rounded-lg border border-amber-100 p-4 shadow-sm mx-auto max-w-4xl">
                                  <h4 className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <ClipboardList size={14} /> Expense Details (ব্যয়ের বিবরণ)
                                  </h4>
                                  <div className="space-y-2.5">
                                    {budgetExpenses.map((exp, expIdx) => {
                                      const formattedDateTime = exp.createdAt?.toDate 
                                        ? exp.createdAt.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                                        : '';
                                      const formattedDateOnly = exp.createdAt?.toDate
                                        ? exp.createdAt.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                        : exp.date;

                                      const expSerialNo = getExpenseSerialNo(exp);

                                      return (
                                        <div key={exp.id} className="flex flex-col p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-amber-200 hover:bg-amber-50/5 transition-all shadow-xs">
                                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3 text-xs">
                                            <div>
                                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">সিরিয়াল নম্বর (Serial No)</span>
                                              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-lg inline-block mt-1">
                                                {expSerialNo}
                                              </span>
                                            </div>
                                            <div>
                                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">কি বাবদ (Purpose)</span>
                                              <span className="font-bold text-slate-700 block mt-1">{exp.description}</span>
                                            </div>
                                            <div>
                                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ব্যয়ের ধরণ (Type)</span>
                                              <div className="mt-1">
                                                {(() => {
                                                  let badgeClass = 'bg-slate-100 text-slate-700 border border-slate-200';
                                                  const type = exp.expenseType || 'Paid';
                                                  if (type === 'Advance') {
                                                    badgeClass = 'bg-sky-50 text-sky-700 border border-sky-200';
                                                  } else if (type === 'Paid') {
                                                    badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                                                  } else if (type === 'Payment') {
                                                    badgeClass = 'bg-indigo-50 text-indigo-700 border border-indigo-200';
                                                  }
                                                  return (
                                                    <span className={`px-2 py-0.5 rounded-lg font-bold text-[10px] inline-block ${badgeClass}`}>
                                                      {type === 'Advance' ? 'Advance (অগ্রিম)' :
                                                       type === 'Payment' ? 'Payment (পেমেন্ট)' : 'Paid (পরিশোধিত)'}
                                                    </span>
                                                  );
                                                })()}
                                              </div>
                                            </div>
                                            <div>
                                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">স্ট্যাটাস (Status)</span>
                                              <div className="mt-1">
                                                {(() => {
                                                  const subType = exp.subType || (exp.isFixed ? 'Fixed' : 'Fixed');
                                                  let subBadgeClass = 'bg-slate-100 text-slate-700 border border-slate-200';
                                                  let subBn = 'ফিক্সড';
                                                  if (subType === 'Complete') {
                                                    subBadgeClass = 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-extrabold';
                                                    subBn = 'কমপ্লিট';
                                                  } else if (subType === 'Adjustment') {
                                                    subBadgeClass = 'bg-amber-50 text-amber-800 border border-amber-300 font-extrabold';
                                                    subBn = 'অ্যাডজাস্টমেন্ট';
                                                  } else if (subType === 'Fixed') {
                                                    subBadgeClass = 'bg-slate-100 text-slate-800 border border-slate-300 font-extrabold';
                                                    subBn = 'ফিক্সড';
                                                  }
                                                  return (
                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] inline-block ${subBadgeClass}`}>
                                                      {subType} ({subBn})
                                                    </span>
                                                  );
                                                })()}
                                              </div>
                                            </div>
                                            <div>
                                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">তারিখ ও সময় (Date & Time)</span>
                                              <span className="font-semibold text-slate-600 block mt-1">
                                                📅 {formattedDateOnly} {formattedDateTime && <span className="text-slate-500 font-medium ml-1.5">🕒 {formattedDateTime}</span>}
                                              </span>
                                            </div>
                                            <div>
                                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">কত টাকা (Amount)</span>
                                              <span className="font-black text-amber-600 block mt-1 text-sm">৳ {exp.amount.toLocaleString()}</span>
                                            </div>
                                            <div>
                                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">কে এন্ট্রি দিয়েছে (Entered By)</span>
                                              <span className="font-semibold text-slate-500 block mt-1 truncate" title={exp.createdBy}>
                                                👤 {exp.createdBy.split('@')[0]}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                  </tbody>
                </table>
              </div>

              {/* Budget Tab Bottom Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 border-t border-slate-100 pt-5">
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between shadow-xs">
                  <div className="text-left">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider block">মোট বাজেট (Total Budget)</span>
                    <span className="text-xl font-extrabold text-slate-800 mt-1 block">
                      ৳ {budgetTotals.budgetSum.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg flex items-center justify-center w-9 h-9">
                    <span className="text-lg">💰</span>
                  </div>
                </div>

                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 flex items-center justify-between shadow-xs">
                  <div className="text-left">
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider block">মোট ব্যয় (Total Expense)</span>
                    <span className="text-xl font-extrabold text-slate-800 mt-1 block">
                      ৳ {budgetTotals.expenseSum.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-amber-100 text-amber-700 p-2 rounded-lg flex items-center justify-center w-9 h-9">
                    <span className="text-lg">💸</span>
                  </div>
                </div>

                <div className={`rounded-xl p-4 flex items-center justify-between shadow-xs border ${
                  budgetTotals.balanceSum < 0 
                    ? 'bg-red-50/50 border-red-100' 
                    : 'bg-emerald-50/50 border-emerald-100'
                }`}>
                  <div className="text-left">
                    <span className={`text-[10px] font-black uppercase tracking-wider block ${
                      budgetTotals.balanceSum < 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                      অবशिष्ट বাজেট (Variance Balance)
                    </span>
                    <span className={`text-xl font-extrabold mt-1 block ${
                      budgetTotals.balanceSum < 0 ? 'text-red-700' : 'text-emerald-800'
                    }`}>
                      {budgetTotals.balanceSum < 0 
                        ? `- ৳ ${Math.abs(budgetTotals.balanceSum).toLocaleString()}` 
                        : `৳ ${budgetTotals.balanceSum.toLocaleString()}`
                      }
                    </span>
                  </div>
                  <div className={`p-2 rounded-lg flex items-center justify-center w-9 h-9 ${
                    budgetTotals.balanceSum < 0 
                      ? 'bg-red-100 text-red-600' 
                      : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    <span className="text-lg">🛡️</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* VIEW 1.4: EXPENSE REGISTER */}
        {activeTab === 'expense' && (
          <div className="flex flex-col gap-6" id="expense-tab-container">
            {!isLocalSandbox && (localSandboxBudgetsCount > 0 || localSandboxExpensesCount > 0) && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
                <div className="flex gap-3 text-left">
                  <div className="bg-amber-100 text-amber-800 p-2.5 rounded-xl shrink-0 mt-0.5 md:mt-0">
                    <Database size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">অফলাইন স্যান্ডবক্স ডেটা সনাক্ত করা হয়েছে! (Offline Sandbox Data Found!)</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      আপনার ব্রাউজারে অফলাইন স্যান্ডবক্সের <strong>{toBengali(localSandboxBudgetsCount.toString())} টি বাজেট</strong> এবং <strong>{toBengali(localSandboxExpensesCount.toString())} টি খরচ (Expense)</strong> পাওয়া গেছে। আপনি কি পূর্বে স্যান্ডবক্স মোডে এই এন্ট্রিগুলো করেছিলেন? এগুলো সরাসরি এই লাইভ ডাটাবেজে (FIREBASE-MAIN) ইম্পোর্ট করে নিতে পারেন।
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 w-full md:w-auto">
                  <button
                    onClick={handleMigrateSandboxData}
                    disabled={isMigratingData}
                    className="w-full md:w-auto bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    {isMigratingData ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span>☁️</span>
                    )}
                    <span>লাইভ ডাটাবেজে ইম্পোর্ট করুন (Import to Live DB)</span>
                  </button>
                </div>
              </div>
            )}

            <section className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div className="text-left">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-xl">💸</span>
                    {"ব্যয় রেজিস্টার (Expense Register)"}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{"Log daily and periodic expenditures"}</p>
                </div>

                <div className="flex items-center flex-wrap gap-3">
                  {/* Fiscal Year Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">অর্থবছর:</span>
                    <select
                      value={selectedFiscalYear}
                      onChange={(e) => setSelectedFiscalYear(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="2025-2026">2025-2026</option>
                      <option value="2026-2027">2026-2027</option>
                      <option value="2024-2025">2024-2025</option>
                      <option value="2023-2024">2023-2024</option>
                    </select>
                  </div>

                  <button 
                    onClick={() => setIsAddExpenseModalOpen(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-1.5 rounded-lg font-bold text-xs shadow-md transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-lg">+</span> 
                    Add Expense
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto border border-slate-200 rounded-xl mt-4">
                <table className="w-full text-left border-collapse min-w-[850px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                      <th className="p-3 border-b border-slate-200 w-24">Date</th>
                      <th className="p-3 border-b border-slate-200 w-28">Serial No</th>
                      <th className="p-3 border-b border-slate-200 w-24">Code</th>
                      <th className="p-3 border-b border-slate-200 w-44">Budget Head</th>
                      <th className="p-3 border-b border-slate-200 w-28">Type (টাইপ)</th>
                      <th className="p-3 border-b border-slate-200 w-32">Status (স্ট্যাটাস)</th>
                      <th className="p-3 border-b border-slate-200 w-44">Description</th>
                      <th className="p-3 border-b border-slate-200 text-right w-28">Amount</th>
                      <th className="p-3 border-b border-slate-200 text-right w-28">Created By</th>
                      <th className="p-3 border-b border-slate-200 text-center w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {filteredExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-400 font-semibold">
                          No expenses recorded yet for fiscal year {selectedFiscalYear}.
                        </td>
                      </tr>
                    ) : (
                      filteredExpenses.map((expense) => {
                        const budgetHead = (budgets.length > 0 ? budgets : INITIAL_BUDGET_DATA).find(b => b.budgetCode === expense.budgetCode)?.budgetHead || expense.budgetCode;
                        
                        const expSerialNo = getExpenseSerialNo(expense);

                        const type = expense.expenseType || 'Paid';
                        let typeBg = 'bg-slate-100 text-slate-700 border-slate-200';
                        let typeBn = 'পরিশোধিত';
                        if (type === 'Advance') {
                          typeBg = 'bg-sky-50 text-sky-700 border-sky-200';
                          typeBn = 'অগ্রিম';
                        } else if (type === 'Paid') {
                          typeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                          typeBn = 'পরিশোধিত';
                        } else if (type === 'Payment') {
                          typeBg = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                          typeBn = 'পেমেন্ট';
                        }

                        const subType = expense.subType || (expense.isFixed ? 'Fixed' : 'Fixed');
                        let subTypeBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                        let subTypeBn = 'ফিক্সড';
                        if (subType === 'Complete') {
                          subTypeBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold';
                          subTypeBn = 'কমপ্লিট';
                        } else if (subType === 'Adjustment') {
                          subTypeBadgeClass = 'bg-amber-50 text-amber-800 border-amber-300 font-extrabold';
                          subTypeBn = 'অ্যাডজাস্টমেন্ট';
                        } else if (subType === 'Fixed') {
                          subTypeBadgeClass = 'bg-slate-100 text-slate-800 border-slate-300 font-extrabold';
                          subTypeBn = 'ফিক্সড';
                        }

                        return (
                          <tr key={expense.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-slate-600 font-medium">{expense.date}</td>
                            <td className="p-3 font-mono font-bold text-indigo-600">{expSerialNo}</td>
                            <td className="p-3 font-bold text-slate-700">{expense.budgetCode}</td>
                            <td className="p-3 text-slate-600 truncate max-w-[180px]" title={budgetHead}>{budgetHead}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-lg font-bold text-[10px] border inline-block ${typeBg}`}>
                                {type} ({typeBn})
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] border inline-block ${subTypeBadgeClass}`}>
                                {subType} ({subTypeBn})
                              </span>
                            </td>
                            <td className="p-3 text-slate-500 truncate max-w-[180px]" title={expense.description}>{expense.description}</td>
                            <td className="p-3 text-right font-black text-amber-600">
                              ৳ {expense.amount.toLocaleString()}
                            </td>
                            <td className="p-3 text-right text-slate-400 text-[10px]">{expense.createdBy}</td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {hasActionAccess('expense', 'edit') && (
                                  <button 
                                    onClick={() => handleOpenEditExpense(expense)}
                                    className="text-indigo-400 hover:text-indigo-600 p-1 cursor-pointer transition-colors"
                                    title="Edit Expense"
                                  >
                                    <Edit size={14} />
                                  </button>
                                )}
                                {hasActionAccess('expense', 'delete') && (
                                  <button 
                                    onClick={() => handleDeleteExpense(expense.id)}
                                    className="text-red-400 hover:text-red-600 p-1 cursor-pointer transition-colors"
                                    title="Delete Expense"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* VIEW 2: ANALYTICS & DASHBOARD */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6" id="analytics-container">
            
            {/* KPI top metrics row */}
            <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-panel">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block">{lang === 'BN' ? "মোট নিবন্ধিত ফাইল" : "Total Registered Files"}</span>
                  <span className="text-3xl font-black text-slate-800 mt-1 block">{files.length}</span>
                  <span className="text-[10px] text-green-600 font-bold mt-1.5 inline-flex items-center gap-0.5">
                    ▲ Live Firestore
                  </span>
                </div>
                <div className="text-3xl bg-amber-500/10 p-3 rounded-xl text-[#cca355]">📁</div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block">{lang === 'BN' ? "মোট নিবন্ধিত মেমো" : "Total Registered Memos"}</span>
                  <span className="text-3xl font-black text-slate-800 mt-1 block">{toBengali(memos.length.toString())}</span>
                  <span className="text-[10px] text-indigo-600 font-bold mt-1.5 inline-flex items-center gap-0.5">
                    ■ Active Correspondence
                  </span>
                </div>
                <div className="text-3xl bg-indigo-500/10 p-3 rounded-xl text-indigo-600">📝</div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block">{lang === 'BN' ? "সক্রিয় ডিপার্টমেন্ট সংখ্যা" : "Active Departments Count"}</span>
                  <span className="text-3xl font-black text-slate-800 mt-1 block">
                    {Array.from(new Set([...files.map(f => f.department), ...memos.map(m => m.department)])).length}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold mt-1.5 inline-block">
                    {lang === 'BN' ? "বিভাগ ভিত্তিক রিয়েল-টাইম ডাটা" : "Department-wise Real-time Data"}
                  </span>
                </div>
                <div className="text-3xl bg-blue-500/10 p-3 rounded-xl text-blue-600">⚙️</div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block">{lang === 'BN' ? "চলতি অর্থবছরের এন্ট্রি" : "Current FY Entries"}</span>
                  <span className="text-3xl font-black text-slate-800 mt-1 block">
                    {files.filter(f => f.openingYear === '2026').length + memos.filter(m => m.openingDate.includes('.2026')).length}
                  </span>
                  <span className="text-[10px] text-amber-600 font-semibold mt-1.5 inline-block">
                    {lang === 'BN' ? "২০২৬ আর্থিক সালের ডাটা" : "FY 2026 Data"}
                  </span>
                </div>
                <div className="text-3xl bg-green-500/10 p-3 rounded-xl text-green-600">📊</div>
              </div>
            </div>

            {/* Custom High Fidelity Chart 1: Department Distribution */}
            <div className="md:col-span-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm" id="chart-dept-dist">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <span>📂</span> {lang === 'BN' ? "বিভাগ ভিত্তিক ফাইল ও মেমো বণ্টন" : "Department-wise File & Memo Distribution"}
              </h3>
              <div className="space-y-4 animate-fade-in">
                {Array.from(new Set([...uniqueFilterValues.departments, ...uniqueMemoFilterValues.departments])).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">{lang === 'BN' ? "কোন বিভাগীয় ডেটা নেই" : "No department data available"}</p>
                ) : (
                  Array.from(new Set([...uniqueFilterValues.departments, ...uniqueMemoFilterValues.departments])).slice(0, 8).map(dept => {
                    const fileCount = files.filter(f => f.department === dept).length;
                    const memoCount = memos.filter(m => m.department === dept).length;
                    const total = fileCount + memoCount;
                    const totalEntries = files.length + memos.length;
                    const percent = totalEntries > 0 ? (total / totalEntries) * 100 : 0;
                    return (
                      <div key={dept} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">{dept}</span>
                          <span className="font-semibold text-slate-600">{fileCount} {lang === 'BN' ? "ফাইল" : "Files"} / {memoCount} {lang === 'BN' ? "মেমো" : "Memos"} ({percent.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                          <div 
                            style={{ width: `${percent}%` }}
                            className="bg-gradient-to-r from-[#cca355] to-amber-500 h-full rounded-full transition-all duration-500"
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Custom High Fidelity Chart 2: Dynamic SVG Trendline over Years */}
            <div className="md:col-span-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between" id="chart-year-trend">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>📈</span> {lang === 'BN' ? "ফাইল ও মেমো নিবন্ধন বার্ষিক প্রবণতা (Trend)" : "Annual File & Memo Registration Trend"}
                </h3>
                <p className="text-xs text-slate-400 font-semibold mb-4">{lang === 'BN' ? "বিভিন্ন অর্থবছরে নতুন ফাইল ও মেমো রেজিস্টার খোলার লাইভ গ্রাফ" : "Live chart showing new files and memos opened across years"}</p>
              </div>

              {uniqueFilterValues.years.length < 1 ? (
                <div className="py-12 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 rounded-lg flex items-center justify-center">
                  {lang === 'BN' ? "প্রবণতা গ্রাফ দেখানোর জন্য ফাইল এন্ট্রি প্রয়োজন।" : "File entries are required to display the trend graph."}
                </div>
              ) : (
                <div className="w-full">
                  <svg viewBox="0 0 600 200" className="w-full h-auto">
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#cca355" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#cca355" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    <line x1="50" y1="30" x2="550" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="50" y1="80" x2="550" y2="80" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="50" y1="130" x2="550" y2="130" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="50" y1="160" x2="550" y2="160" stroke="#e2e8f0" strokeWidth="1.5" />

                    {(() => {
                      const trendYears = Array.from(new Set([...uniqueFilterValues.years, '2026'])).sort();
                      const trendCounts = trendYears.map(y => files.filter(f => f.openingYear === y).length + memos.filter(m => m.openingDate.includes(`.${y}`)).length);
                      const maxTrendCount = Math.max(...trendCounts, 1);
                      
                      const pointsData = trendYears.map((y, i) => {
                        const x = 50 + i * (500 / (trendYears.length - 1 || 1));
                        const currentVal = files.filter(f => f.openingYear === y).length + memos.filter(m => m.openingDate.includes(`.${y}`)).length;
                        const cy = 160 - (currentVal / maxTrendCount) * 110;
                        return { x, cy, year: y, count: currentVal };
                      });

                      const linePath = pointsData.map(p => `${p.x},${p.cy}`).join(' L ');
                      const areaPath = `M 50,160 L ${linePath} L ${pointsData[pointsData.length - 1].x},160 Z`;

                      return (
                        <>
                          <path d={areaPath} fill="url(#areaGrad)" />
                          <path d={`M ${linePath}`} stroke="#cca355" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                          {pointsData.map((p) => (
                            <g key={p.year} className="group cursor-pointer">
                              <circle cx={p.x} cy={p.cy} r="5" fill="#cca355" stroke="#ffffff" strokeWidth="2" />
                              <text x={p.x} y={p.cy - 12} textAnchor="middle" className="text-[10px] font-bold fill-slate-700 font-mono">
                                {p.count}
                              </text>
                              <text x={p.x} y="180" textAnchor="middle" className="text-[10px] font-bold fill-slate-400 font-mono">
                                {p.year}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              )}
              
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>{lang === 'BN' ? "মডেল আপডেট: লাইভ সিনক্রোনাস ক্লাউড গ্রাফ" : "Model Update: Live Synchronous Cloud Graph"}</span>
                <span>{lang === 'BN' ? "বিশ্বসাহিত্য কেন্দ্র এনালিটিক্স ইঞ্জিন" : "BSK Enterprise Portal Analytics Engine"}</span>
              </div>
            </div>

            {/* Workload Board: Responsible Person Shares */}
            <div className="md:col-span-12 bg-white p-6 rounded-xl border border-slate-200 shadow-sm" id="workload-section">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <span>👥</span> {lang === 'BN' ? "দায়িত্বপ্রাপ্ত কর্মকর্তাদের কাজের বণ্টন (Staff Shares)" : "Workload Distribution (Staff Shares)"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="staff-grid">
                {Array.from(new Set([...uniqueFilterValues.people, ...uniqueMemoFilterValues.people])).length === 0 ? (
                  <p className="text-xs text-slate-400 italic font-medium">{lang === 'BN' ? "কোন কর্মকর্তা এসাইন করা নেই" : "No officers assigned"}</p>
                ) : (
                  Array.from(new Set([...uniqueFilterValues.people, ...uniqueMemoFilterValues.people])).slice(0, 8).map(person => {
                    const personFiles = files.filter(f => f.responsiblePerson === person);
                    const personMemos = memos.filter(m => m.responsiblePerson === person);
                    const total = personFiles.length + personMemos.length;
                    const dsg = personFiles[0]?.designation || personMemos[0]?.designation || 'Staff';
                    
                    return (
                      <div key={person} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#cca355]/10 border border-[#cca355]/20 flex items-center justify-center font-bold text-[#a87f2a] text-xs">
                              {person.slice(0, 2)}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800">{person}</h4>
                              <p className="text-[10px] text-slate-400 font-semibold">{dsg}</p>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-slate-800">{total}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{lang === 'BN' ? "নিবন্ধিত কার্যক্রম" : "Registered Tasks"}</span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-200/50 flex flex-wrap gap-1">
                          <span className="text-[8px] font-black bg-amber-500/10 text-amber-800 px-1 py-0.5 rounded uppercase">{personFiles.length} F</span>
                          <span className="text-[8px] font-black bg-indigo-500/10 text-indigo-800 px-1 py-0.5 rounded uppercase">{personMemos.length} M</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}

        {/* VIEW 4: DATABASE SECURITY LOGS */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6" id="security-panel">
            
            {/* System Status Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="telemetry-widgets">
              <div className="bg-[#0A111E] text-white p-5 rounded-xl border border-slate-800 shadow">
                <span className="text-[10px] text-[#cca355] font-black uppercase tracking-widest block">DATABASE STATUS</span>
                <span className="text-2xl font-bold mt-2 block">FIRESTORE SECURE</span>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-green-400">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span>
                  Connected Node • OK
                </div>
              </div>

              <div className="bg-[#0A111E] text-white p-5 rounded-xl border border-slate-800 shadow">
                <span className="text-[10px] text-[#cca355] font-black uppercase tracking-widest block">AUTHENTICATION</span>
                <span className="text-2xl font-bold mt-2 block">GOOGLE OAUTH 2.0</span>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-blue-400">
                  <span>🔒</span> MFA & Role Verification Active
                </div>
              </div>

              <div className="bg-[#cca355] text-slate-950 p-5 rounded-xl border border-amber-600 shadow">
                <span className="text-[10px] text-slate-800 font-extrabold uppercase tracking-widest block">SYSTEM INTEGRITY</span>
                <span className="text-2xl font-black mt-2 block">COMPLIANT</span>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-900 font-semibold">
                  <span>✓</span> BSK Vault Policies Active
                </div>
              </div>
            </div>

            {/* Database Full Backup Action Banner */}
            <div className="bg-gradient-to-r from-[#0A111E] via-slate-900 to-indigo-950 rounded-2xl p-5 text-white border border-[#cca355]/40 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[#cca355] shrink-0">
                  <Database size={24} />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>{lang === 'BN' ? 'সম্পূর্ণ ডাটাবেজ ব্যাকআপ ও এক্সপোর্ট' : 'Complete Database Backup & Export'}</span>
                    <span className="bg-[#cca355] text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">Full DB</span>
                  </h4>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    {lang === 'BN' 
                      ? 'সকল ফাইল, মেমো, কর্মকর্তা-কর্মচারী, ভাউচার ও পাইলট প্রকল্পের তথ্য JSON ও মাল্টি-শীট এক্সেলে ব্যাকআপ নিন।'
                      : 'Download full JSON database dump or multi-sheet Excel workbook covering all active collections.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDatabaseBackupModalOpen(true)}
                className="px-5 py-2.5 bg-[#cca355] hover:bg-[#b58f47] text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-2 cursor-pointer shadow-md shrink-0 hover:scale-105"
              >
                <Download size={15} />
                <span>{lang === 'BN' ? 'ব্যাকআপ ডাউনলোড করুন' : 'Download Database Backup'}</span>
              </button>
            </div>

            {/* Super Admin User Management Panels */}
            {(userProfile?.email === 'ovi.it' || userProfile?.designation === 'Super Admin') ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="admin-management-grid">
                
                {/* Left Form Panel: Create Admin ID */}
                <div className="lg:col-span-5 bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm" id="create-admin-form-container">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <span>🛡️</span> {lang === 'BN' ? "নতুন এডমিন আইডি তৈরি করুন" : "Create New Admin ID"}
                  </h3>
                  
                  <form onSubmit={handleCreateAdminUser} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                        Full Name / কর্মকর্তার নাম <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. Fahim Rahman"
                        value={newAdminName}
                        onChange={(e) => setNewAdminName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                        User ID / ইউজার আইডি <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. fahim.it"
                        value={newAdminUsername}
                        onChange={(e) => setNewAdminUsername(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                        Password / পাসওয়ার্ড <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="password"
                        required
                        placeholder="••••••••"
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                        Role / ভূমিকা <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-4 p-1">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                          <input 
                            type="radio" 
                            name="newAdminRole" 
                            value="Admin" 
                            checked={newAdminRole === 'Admin'} 
                            onChange={() => setNewAdminRole('Admin')} 
                            className="text-amber-500 focus:ring-amber-500"
                          />
                          Admin / এডমিন
                        </label>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                          <input 
                            type="radio" 
                            name="newAdminRole" 
                            value="Super Admin" 
                            checked={newAdminRole === 'Super Admin'} 
                            onChange={() => setNewAdminRole('Super Admin')} 
                            className="text-amber-500 focus:ring-amber-500"
                          />
                          Super Admin / সুপার এডমিন
                        </label>
                      </div>
                    </div>

                    {newAdminRole === 'Admin' && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                              Designation / পদবী
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input 
                                type="checkbox"
                                id="new-admin-custom-dsg-checkbox"
                                checked={isNewAdminCustomDesignation}
                                onChange={(e) => setIsNewAdminCustomDesignation(e.target.checked)}
                                className="rounded text-amber-500 w-3 h-3"
                              />
                              <label htmlFor="new-admin-custom-dsg-checkbox" className="text-[9px] font-bold text-slate-500 cursor-pointer">Custom / নিজে লিখুন</label>
                            </div>
                          </div>
                          {isNewAdminCustomDesignation ? (
                            <input 
                              type="text"
                              placeholder="e.g. Executive"
                              value={newAdminCustomDesignation}
                              onChange={(e) => setNewAdminCustomDesignation(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
                            />
                          ) : (
                            <select
                              value={newAdminDesignation}
                              onChange={(e) => setNewAdminDesignation(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
                            >
                              <option value="Admin Officer">Admin Officer</option>
                              <option value="Accounts Head">Accounts Head</option>
                              <option value="Manager">Manager</option>
                              <option value="Director">Director</option>
                              <option value="Coordinator">Coordinator</option>
                            </select>
                          )}
                        </div>

                        {/* Permission Configuration UI */}
                        <div className="space-y-4 border-t border-slate-200 pt-3 mt-2">
                          <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3.5 space-y-2.5">
                            <h4 className="text-[10px] font-bold text-[#cca355] uppercase tracking-wider flex items-center gap-1.5">
                              <span>🔑</span> {lang === 'BN' ? "মেনু দৃশ্যমানতা (Menu Visibility)" : "Menu Visibility"}
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.keys(permissionMenus).map((menuKey) => {
                                const label = menuKey === 'welcome' ? 'Welcome Portal' :
                                              menuKey === 'files' ? 'File Opening' :
                                              menuKey === 'memos' ? 'Memo Register' :
                                              menuKey === 'budget' ? 'Budget Tracker' :
                                              menuKey === 'expense' ? 'Expense Register' :
                                              menuKey === 'employees' ? 'HR (হিউম্যান রিসোর্স)' :
                                              menuKey === 'pilotProjectMadhyomik' ? 'পাইলট প্রজেক্ট (মাধ্যমিক)' :
                                              menuKey === 'pilotProjectUchchoMadhyomik' ? 'পাইলট প্রজেক্ট (উচ্চ মাধ্যমিক)' :
                                              menuKey === 'dailyExpenseApproval' ? 'দৈনন্দিন খরচের অনুমোদন' :
                                              menuKey === 'analytics' ? 'Dashboard' : 'Security Dashboard';
                                return (
                                  <label key={menuKey} className="flex items-center gap-1.5 text-[10px] text-slate-700 font-bold cursor-pointer hover:text-amber-600 transition-colors">
                                    <input 
                                      type="checkbox"
                                      checked={(permissionMenus as any)[menuKey]}
                                      onChange={(e) => setPermissionMenus(prev => ({ ...prev, [menuKey]: e.target.checked }))}
                                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 w-3 h-3"
                                    />
                                    {label}
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                            <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                              <span>⚙️</span> {lang === 'BN' ? "অনুমোদিত কর্মসমূহ (Allowed Actions)" : "Allowed Actions"}
                            </h4>
                            <div className="space-y-2 divide-y divide-slate-200/50 text-[10px]">
                              {Object.keys(permissionActions).map((secKey) => {
                                const label = secKey === 'files' ? 'File Opening' :
                                              secKey === 'memos' ? 'Memo Register' :
                                              secKey === 'budget' ? 'Budget Tracker' :
                                              secKey === 'employees' ? 'HR (হিউম্যান রিসোর্স)' :
                                              secKey === 'dailyExpenseApproval' ? 'দৈনন্দিন খরচের অনুমোদন' :
                                              'Expense Register';
                                const actionsObj = (permissionActions as any)[secKey];
                                return (
                                  <div key={secKey} className="pt-2 first:pt-0">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide block mb-1">{label}</span>
                                    <div className="flex flex-wrap gap-2.5">
                                      {Object.keys(actionsObj).map((actKey) => {
                                        const actLabel = actKey === 'create' ? 'Create' :
                                                         actKey === 'edit' ? 'Edit' : 'Delete';
                                        return (
                                          <label key={actKey} className="flex items-center gap-1 text-[10px] text-slate-600 font-bold cursor-pointer hover:text-amber-600 transition-colors">
                                            <input 
                                              type="checkbox"
                                              checked={actionsObj[actKey]}
                                              onChange={(e) => setPermissionActions(prev => ({
                                                ...prev,
                                                [secKey]: {
                                                  ...(prev as any)[secKey],
                                                  [actKey]: e.target.checked
                                                }
                                              }))}
                                              className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 w-2.5 h-2.5"
                                            />
                                            {actLabel}
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#0A111E] hover:bg-slate-800 text-white font-bold rounded-lg text-xs tracking-wider uppercase transition shadow active:scale-[0.98] cursor-pointer"
                    >
                      {lang === 'BN' ? "এডমিন আইডি তৈরি করুন" : "Generate Admin Account"}
                    </button>
                  </form>
                </div>

                {/* Right Panel: List of Admins */}
                <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between" id="admin-list-container">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <span>👥</span> {lang === 'BN' ? "নিবন্ধিত এডমিন তালিকা" : "Registered Custom Admins"}
                    </h3>
                    
                    <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100">
                            <th className="py-2.5 px-3">Name</th>
                            <th className="py-2.5 px-3">User ID</th>
                            <th className="py-2.5 px-3 font-mono">Password</th>
                            <th className="py-2.5 px-3">{lang === 'BN' ? 'পদবী' : 'Designation'}</th>
                            <th className="py-2.5 px-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {adminUsers.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                                No custom admins created yet.
                              </td>
                            </tr>
                          ) : (
                            adminUsers.map((u: any) => (
                              <tr key={u.id} className="hover:bg-slate-50/50 transition">
                                <td className="py-2.5 px-3 font-semibold text-slate-800">{u.displayName}</td>
                                <td className="py-2.5 px-3 font-bold font-mono text-[#cca355]">{u.username}</td>
                                <td className="py-2.5 px-3 font-mono text-slate-500">
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded font-bold border border-slate-200/50">
                                    {u.password}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-medium text-slate-400">{u.designation}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => handleOpenEditPermissions(u)}
                                      className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition cursor-pointer"
                                      title="Edit Permissions (অনুমতি পরিবর্তন)"
                                    >
                                      <Key size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteAdminUser(u.username)}
                                      className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition cursor-pointer"
                                      title="Delete Account"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="mt-4 bg-amber-50/50 border border-amber-100/80 p-3.5 rounded-lg text-[11px] text-slate-600">
                    <span className="font-bold text-amber-800 block mb-0.5">ℹ️ {lang === 'BN' ? "সম্পাদনা অধিকারের নিয়মাবলী" : "Edit Access Regulations"}</span>
                    {lang === 'BN' 
                      ? "উপরে তৈরি করা এডমিন আইডি দিয়ে লগইন করা ব্যবহারকারীগণ ফাইল ও মেমো এডিটের সম্পূর্ণ অধিকার পাবেন। গুগল দিয়ে সরাসরি লগইন করা ব্যবহারকারীগণ শুধুমাত্র দেখতে পারবেন, কোনো পরিবর্তন করার অ্যাক্সেস পাবেন না।"
                      : "Users logged in with Admin accounts listed above have full editing permissions. Direct Google Sign-In users will have View-Only rights with no modify access."}
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl flex items-center gap-4 text-xs font-semibold text-slate-600 shadow-inner" id="non-admin-restriction-banner">
                <span className="text-2xl">🔒</span>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">{lang === 'BN' ? "ইউজার ম্যানেজমেন্ট সীমাবদ্ধ" : "Role Management Restricted"}</h4>
                  <p className="text-slate-500">
                    {lang === 'BN' 
                      ? "এডমিন আইডি তৈরি বা ডিলিট করার সুবিধা শুধুমাত্র সুপার এডমিনের (ovi.it) জন্য সীমাবদ্ধ। সাধারণ ব্যবহারকারীগণ লগ ইন ট্রানজেকশন দেখতে পারেন।" 
                      : "Only the Super Admin (ovi.it) has privilege to create or delete Admin IDs. General users can only view transaction logs."}
                  </p>
                </div>
              </div>
            )}

            {/* SUPER ADMIN AUDIT LOG PANELS (ONLY FOR SUPER ADMIN) */}
            {isSuperAdmin && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col gap-4 p-5" id="super-admin-audit-panel">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <span className="p-1.5 bg-amber-50 rounded text-amber-600">🛡️</span>
                      {lang === 'BN' ? "সুপার এডমিন রিয়েল-টাইম অডিট ও অ্যাক্টিভিটি লগ" : "Super Admin Real-time Audit & Activity Logs"}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">
                      {lang === 'BN' ? "সকল কর্মকর্তার লগইন, ফাইল এন্ট্রি, এডিট ও ডিলিট অ্যাক্টিভিটি ট্র্যাকিং" : "Tracking logins, file entries, edits, and deletions from all administrators"}
                    </p>
                  </div>
                  <button
                    onClick={downloadAuditCSV}
                    className="self-start sm:self-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-lg text-xs tracking-wide transition shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Download size={14} />
                    <span>{lang === 'BN' ? "এক্সেল/CSV রিপোর্ট ডাউনলোড" : "Download Excel/CSV Report"}</span>
                  </button>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                  {/* Search input */}
                  <div className="sm:col-span-7 relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder={lang === 'BN' ? "ইমেইল, নাম, বিস্তারিত বা কাজের ধরন দিয়ে খুঁজুন..." : "Search by Email, Name, action description..."}
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-xs font-semibold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
                    />
                  </div>
                  {/* Filter category */}
                  <div className="sm:col-span-5 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">{lang === 'BN' ? "ক্যাটাগরি:" : "Type:"}</span>
                    <select
                      value={auditTypeFilter}
                      onChange={(e) => setAuditTypeFilter(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-bold focus:border-amber-500 outline-none transition cursor-pointer"
                    >
                      <option value="all">{lang === 'BN' ? "সব রেকর্ড (All Logs)" : "All Records"}</option>
                      <option value="auth">{lang === 'BN' ? "লগইন/লগআউট (Logins/Logout)" : "Logins & Sessions"}</option>
                      <option value="file">{lang === 'BN' ? "ফাইল এন্ট্রি ও ডিলিট (File Actions)" : "File Register Actions"}</option>
                      <option value="memo">{lang === 'BN' ? "মেমো এন্ট্রি ও ডিলিট (Memo Actions)" : "Memo Register Actions"}</option>
                      <option value="edit">{lang === 'BN' ? "রেকর্ড এডিট (Edit Actions)" : "Edit Operations"}</option>
                      <option value="note">{lang === 'BN' ? "নোট ভিউ ও সেভ (Notes History)" : "Notes Log"}</option>
                      <option value="admin">{lang === 'BN' ? "এডমিন অ্যাকাউন্ট (Admin User Mgmt)" : "Admin ID Mgmt"}</option>
                      <option value="pin">{lang === 'BN' ? "পিন জেনারেশন ও ডিলিট (PIN Actions)" : "PIN Access Codes"}</option>
                    </select>
                  </div>
                </div>

                {/* Log Table Container */}
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 sticky top-0 z-10">
                        <th className="py-3 px-4">{lang === 'BN' ? "সময় ও তারিখ" : "Date & Time"}</th>
                        <th className="py-3 px-4">{lang === 'BN' ? "ইউজার/কর্মকর্তা" : "Administrator"}</th>
                        <th className="py-3 px-4">{lang === 'BN' ? "ইমেইল/আইডি" : "Email / Username"}</th>
                        <th className="py-3 px-4">{lang === 'BN' ? "অ্যাকশন টাইপ" : "Action Type"}</th>
                        <th className="py-3 px-4">{lang === 'BN' ? "বিস্তারিত বিবরণ" : "Description"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAuditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400 italic">
                            {lang === 'BN' ? "কোনো ম্যাচিং অ্যাক্টিভিটি লগ পাওয়া যায়নি।" : "No matching activity logs found."}
                          </td>
                        </tr>
                      ) : (
                        filteredAuditLogs.map((log, index) => {
                          let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";
                          if (log.actionType === 'LOGIN_SUCCESS') {
                            badgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
                          } else if (log.actionType.includes('CREATE')) {
                            badgeStyle = "bg-green-50 text-green-700 border-green-200";
                          } else if (log.actionType.includes('DELETE')) {
                            badgeStyle = "bg-red-50 text-red-700 border-red-200";
                          } else if (log.actionType.includes('EDIT')) {
                            badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
                          } else if (log.actionType.startsWith('PIN_')) {
                            badgeStyle = "bg-purple-50 text-purple-700 border-purple-200";
                          } else if (log.actionType.startsWith('NOTE_')) {
                            badgeStyle = "bg-indigo-50 text-indigo-700 border-indigo-200";
                          }

                          return (
                            <tr key={index} className="hover:bg-slate-50/50 transition">
                              <td className="py-3 px-4 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                                {log.timestamp ? new Date(log.timestamp).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A'}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px] uppercase border border-slate-200">
                                    {(log.userName || 'A').charAt(0)}
                                  </div>
                                  <span className="font-semibold text-slate-800">{log.userName || 'Anonymous'}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-[#cca355] font-bold">
                                {log.userEmail || 'unknown'}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 text-[9px] font-black rounded border ${badgeStyle}`}>
                                  {log.actionType}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-600 font-medium max-w-xs truncate" title={log.description}>
                                {log.description}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Stats Summary Row */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-3 border-t border-slate-100 pt-3">
                  <span className="font-semibold">
                    {lang === 'BN' ? `মোট ফিল্টারকৃত লগ: ${toBengali(filteredAuditLogs.length.toString())} টি` : `Total Filtered Logs: ${filteredAuditLogs.length}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-bold text-emerald-600">{lang === 'BN' ? "অডিট সেশন সক্রিয় ও সুরক্ষিত" : "Audit Session Active & Encrypted"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Logs */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm" id="audit-log-scroller">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{lang === 'BN' ? "রিয়েল-টাইম সিস্টেম ট্রানজেকশন লগ (Live Sync Log)" : "Real-time System Transaction Log (Live Sync Log)"}</span>
                <span className="text-[10px] text-green-600 font-bold bg-green-50 border border-green-200 px-2.5 py-0.5 rounded">STREAMING</span>
              </div>
              
              <div className="divide-y divide-slate-100 font-mono text-[11px] text-slate-500" id="audit-log-lines">
                <div className="p-3.5 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-bold">[SYNC SUCCESS]</span>
                    <span>Firebase listener successfully attached to collections 'files' & 'memos'</span>
                  </div>
                  <span className="text-slate-400 font-semibold text-right">{new Date().toLocaleDateString('en-GB')} {liveTime}</span>
                </div>

                <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500 font-bold">[AUTH OK]</span>
                    <span>Verified user profile credentials for user: {userProfile?.email}</span>
                  </div>
                  <span className="text-slate-400 font-semibold text-right">System Session Initialized</span>
                </div>

                <div className="p-3.5 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-600 font-bold">[DATA OK]</span>
                    <span>Parsed {files.length} file records & {toBengali(memos.length.toString())} memo records successfully.</span>
                  </div>
                  <span className="text-slate-400 font-semibold text-right">Cached Local Sync</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'employees' && (
          <div className="flex-1 overflow-y-auto px-6 py-6" id="employees-tab-container">
            <EmployeeDatabase
              lang={lang}
              userProfile={userProfile}
              hasActionAccess={hasActionAccess}
              logAction={logAction}
            />
          </div>
        )}

        {(activeTab === 'pilotProjectPrimary') && (
          <div className="flex-1 overflow-y-auto px-6 py-6" id="pilot-project-primary-tab-container">
            <PilotProject
              level="primary"
              userProfile={userProfile}
              hasActionAccess={hasActionAccess}
              logAction={logAction}
              lang={lang}
            />
          </div>
        )}

        {(activeTab === 'pilotProjectSecondary' || activeTab === 'pilotProjectMadhyomik' || activeTab === 'pilotProjectUchchoMadhyomik') && (
          <div className="flex-1 overflow-y-auto px-6 py-6" id="pilot-project-secondary-tab-container">
            <PilotProject
              level="secondary"
              userProfile={userProfile}
              hasActionAccess={hasActionAccess}
              logAction={logAction}
              lang={lang}
            />
          </div>
        )}

        {activeTab === 'dailyExpenseApproval' && (
          <div className="flex-1 overflow-y-auto px-6 py-6" id="daily-expense-approval-tab-container">
            <DailyExpenseApproval
              userProfile={userProfile}
              hasActionAccess={hasActionAccess}
              logAction={logAction}
              budgets={budgets}
            />
          </div>
        )}

      </main>

      {/* Footer Info */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 gap-2 mt-auto" id="main-footer">
        <div className="flex space-x-4">
          <span>Session ID: BSK-492021-X</span>
          <span>Database Node: FIREBASE-MAIN</span>
        </div>
        <div className="font-semibold tracking-wider uppercase">
          INTEGRATED BSK ERP SYSTEM v2.5.0
        </div>
      </footer>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-red-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-red-50 text-red-800 px-5 py-4 flex items-center gap-3 border-b border-red-100">
              <AlertCircle size={24} className="text-red-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold">
                  {deleteConfirm.type === 'file' ? 'Confirm Record Deletion' : 'রেকর্ড ডিলিট নিশ্চিতকরণ'}
                </h3>
                <p className="text-[10px] text-red-600 font-medium uppercase tracking-wider">
                  {deleteConfirm.type === 'file' ? 'This action is irreversible' : 'এই অ্যাকশনটি পরিবর্তন করা সম্ভব নয়'}
                </p>
              </div>
            </div>

            <div className="p-5 text-sm">
              <p className="text-slate-600 leading-relaxed mb-4">
                {deleteConfirm.type !== 'file' ? (
                  <>
                    আপনি কি নিশ্চিতভাবে এই রেকর্ডটি ডিলিট করতে চান?
                    <br />
                    <strong className="text-red-600 font-semibold block mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-md font-mono text-xs">
                      {deleteConfirm.name}
                    </strong>
                  </>
                ) : (
                  <>
                    Are you sure you want to permanently delete this record?
                    <br />
                    <strong className="text-red-600 font-semibold block mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-md font-mono text-xs">
                      {deleteConfirm.name}
                    </strong>
                  </>
                )}
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold text-xs cursor-pointer transition-colors"
                >
                  {deleteConfirm.type === 'file' ? 'Cancel' : 'বাতিল করুন'}
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteAction}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-sm shadow-red-200 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Trash2 size={13} />
                  <span>{deleteConfirm.type === 'file' ? 'Yes, Delete' : 'নিশ্চিত করুন'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE FILE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden fade-in flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#cca355]" />
                <div>
                  <h3 className="text-sm font-bold text-white">নতুন Register File</h3>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">BSK File Opening Register</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1 rounded transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFile} className="p-6 space-y-4 overflow-y-auto flex-1">
              {errorMsg && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                    {'Opening Date'} <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="date"
                    required
                    onChange={handleDateChange}
                    className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 bg-transparent text-xs font-semibold"
                  />
                  <p className="text-[10px] text-slate-400">
                    Format: <span className="font-bold text-slate-600">{openingDate}</span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                    {'Serial Number (SI)'} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2 mb-1">
                    <input 
                      type="checkbox" 
                      id="auto-si-checkbox"
                      checked={useAutoSI}
                      onChange={(e) => setUseAutoSI(e.target.checked)}
                      className="rounded text-blue-600 w-3.5 h-3.5"
                    />
                    <label htmlFor="auto-si-checkbox" className="text-xs font-bold text-slate-600 cursor-pointer">
                      Auto ({nextSI})
                    </label>
                  </div>
                  {!useAutoSI && (
                    <input 
                      type="text"
                      required={!useAutoSI}
                      placeholder="e.g. 017"
                      value={manualSI}
                      onChange={(e) => setManualSI(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      className="w-full border-b border-slate-300 py-0.5 focus:border-blue-500 outline-none text-slate-700 font-mono text-xs font-bold bg-transparent"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  {'Department'} <span className="text-red-500">*</span>
                </label>
                <select 
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    const standards = SUBJECTS_BY_DEPT[e.target.value];
                    if (standards && standards.length > 0) {
                      setSubject(standards[0]);
                      setIsCustomSubject(false);
                    }
                  }}
                  className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                >
                  {(editingFileType === 'memo' ? memoDepartmentOptions : departmentOptions).map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  {'Subject / Accounts Head'} <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3 mb-1">
                  <input 
                    type="checkbox"
                    id="custom-subject-checkbox"
                    checked={isCustomSubject}
                    onChange={(e) => setIsCustomSubject(e.target.checked)}
                    className="rounded text-blue-600 w-3.5 h-3.5"
                  />
                  <label htmlFor="custom-subject-checkbox" className="text-xs font-bold text-slate-600 cursor-pointer">
                    Type Custom Subject
                  </label>
                </div>
                {isCustomSubject ? (
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Accounts General"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                  />
                ) : (
                  <select 
                    value={subject}
                    onChange={(e) => {
                      const selectedSub = e.target.value;
                      setSubject(selectedSub);
                      // Auto-select department if it matches a standard subject
                      if (!isCustomDept) {
                        const matchedDept = Object.keys(SUBJECTS_BY_DEPT).find(dept => 
                          SUBJECTS_BY_DEPT[dept].includes(selectedSub)
                        );
                        if (matchedDept) {
                          setDepartment(matchedDept);
                        }
                      }
                    }}
                    className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                  >
                    {(editingFileType === 'memo' ? memoSubjectOptions : subjectOptions).map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                )}
              </div>
              {/* Note / Remarks */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  Note / মন্তব্য
                </label>
                <input
                  type="text"
                  placeholder="Optional notes or remarks..."
                  value={fileNote}
                  onChange={(e) => setFileNote(e.target.value)}
                  className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                      Responsible Person
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="checkbox"
                        id="custom-person-checkbox"
                        checked={isCustomResponsiblePerson}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsCustomResponsiblePerson(checked);
                          if (!checked) {
                            setCustomResponsiblePerson('');
                            setResponsiblePerson('মনির');
                          }
                        }}
                        className="rounded text-blue-600 w-3 h-3"
                      />
                      <label htmlFor="custom-person-checkbox" className="text-[10px] font-bold text-slate-500 cursor-pointer">Custom / Type Manually</label>
                    </div>
                  </div>
                  {isCustomResponsiblePerson ? (
                    <input 
                      type="text"
                      placeholder="Enter Person Name"
                      value={customResponsiblePerson}
                      onChange={(e) => setCustomResponsiblePerson(e.target.value)}
                      className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 text-xs font-semibold"
                    />
                  ) : (
                    <select 
                      value={responsiblePerson}
                      onChange={(e) => setResponsiblePerson(e.target.value)}
                      className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                    >
                      {(editingFileType === 'memo' ? memoResponsiblePersonOptions : responsiblePersonOptions).map(person => (
                        <option key={person} value={person}>{person}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                      Designation
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        id="custom-dsg-checkbox"
                        checked={isCustomDesignation}
                        onChange={(e) => setIsCustomDesignation(e.target.checked)}
                        className="rounded text-blue-600 w-3 h-3"
                      />
                      <label htmlFor="custom-dsg-checkbox" className="text-[10px] font-bold text-slate-500 cursor-pointer">Custom / Type Manually</label>
                    </div>
                  </div>
                  {isCustomDesignation ? (
                    <input 
                      type="text"
                      placeholder="e.g. Executive"
                      value={customDesignation}
                      onChange={(e) => setCustomDesignation(e.target.value)}
                      className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 text-xs font-semibold"
                    />
                  ) : (
                    <select 
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                    >
                      {(editingFileType === 'memo' ? memoDesignationOptions : designationOptions).map(dsg => (
                        <option key={dsg} value={dsg}>{dsg}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Part Selection Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block flex items-center justify-between">
                  <span>Part</span>
                  {fileContext.existingParts.length > 0 && (
                    <span className="text-[9px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded normal-case">
                      Existing: {fileContext.existingParts.map(p => p === 'None' ? 'Base' : p).join(', ')}
                    </span>
                  )}
                </label>
                <select 
                  value={part}
                  onChange={(e) => setPart(e.target.value)}
                  className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                >
                  <option value="None" disabled={fileContext.existingParts.includes('None')}>None</option>
                  <option value="Part 2" disabled={fileContext.existingParts.includes('Part 2')}>Part 2</option>
                  <option value="Part 3" disabled={fileContext.existingParts.includes('Part 3')}>Part 3</option>
                  <option value="Part 4" disabled={fileContext.existingParts.includes('Part 4')}>Part 4</option>
                  <option value="Part 5" disabled={fileContext.existingParts.includes('Part 5')}>Part 5</option>
                </select>
              </div>

              {/* Live Preview */}
              <div className="bg-slate-900 rounded-lg p-3 text-white text-center flex flex-col items-center justify-center border border-slate-700">
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-[2px] mb-1">Live Unique File Name</span>
                <div className="text-xs font-mono font-bold text-green-400 break-all bg-slate-800 px-3 py-1.5 rounded w-full">{generatedFileName}</div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold text-xs cursor-pointer">Cancel</button>
                <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-2 rounded-lg font-black text-xs shadow-lg cursor-pointer">Save File</button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      
      {/* MANAGE DROPDOWN OPTIONS MODAL (SUPER ADMIN ONLY) */}
      {isManageOptionsModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="text-indigo-400 animate-spin" style={{ animationDuration: '6s' }} size={18} />
                <h3 className="font-bold text-sm text-white">{manageOptionsTitle}</h3>
              </div>
              <button 
                onClick={() => {
                  setIsManageOptionsModalOpen(false);
                  setEditingOptionIdx(null);
                  setDeletingOptionIdx(null);
                  setAddOptionError('');
                  setNewOptionValue('');
                }}
                className="hover:bg-white/10 p-1.5 rounded-lg transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col overflow-hidden space-y-4">
              {/* Add Input */}
              <div className="space-y-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="নতুন মান লিখুন..."
                    value={newOptionValue}
                    onChange={(e) => {
                      setNewOptionValue(e.target.value);
                      if (addOptionError) setAddOptionError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:border-indigo-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus size={14} />
                    <span>যোগ করুন</span>
                  </button>
                </div>
                {addOptionError && (
                  <p className="text-[11px] text-red-500 font-bold flex items-center gap-1 mt-1 animate-pulse">
                    <AlertCircle size={12} />
                    <span>{addOptionError}</span>
                  </p>
                )}
              </div>

              {/* List of Options */}
              <div className="flex-1 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-100 bg-slate-50/50 p-1 min-h-[200px]">
                {getActiveOptionsList().length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                    কোনো মান নেই
                  </div>
                ) : (
                  getActiveOptionsList().map((option, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 hover:bg-white rounded-md transition-all group">
                      {editingOptionIdx === idx ? (
                        <div className="flex gap-2 flex-1 items-center">
                          <input
                            type="text"
                            value={editingOptionValue}
                            onChange={(e) => setEditingOptionValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleUpdateOption(idx);
                              }
                            }}
                            className="flex-1 border border-indigo-500 rounded px-2 py-1 text-xs font-semibold outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateOption(idx)}
                            className="bg-green-600 hover:bg-green-700 text-white p-1 rounded cursor-pointer flex items-center justify-center transition-colors"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingOptionIdx(null);
                              setEditingOptionValue('');
                            }}
                            className="bg-slate-300 hover:bg-slate-400 text-slate-700 p-1 rounded cursor-pointer flex items-center justify-center transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : deletingOptionIdx === idx ? (
                        <div className="flex gap-2 flex-1 items-center justify-between bg-red-50 p-1.5 rounded border border-red-200 animate-pulse w-full">
                          <span className="text-xs text-red-700 font-bold flex items-center gap-1">
                            <AlertCircle size={12} className="text-red-500" />
                            <span>মুছে ফেলবেন কি?</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(idx)}
                              className="bg-red-600 hover:bg-red-700 text-white text-[10px] px-2.5 py-1 rounded-md font-bold cursor-pointer transition-colors"
                            >
                              হ্যাঁ
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingOptionIdx(null)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] px-2.5 py-1 rounded-md font-bold cursor-pointer transition-colors"
                            >
                              না
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs text-slate-700 font-bold">{option}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingOptionIdx(idx);
                                setEditingOptionValue(option);
                                setDeletingOptionIdx(null);
                              }}
                              className="text-slate-500 hover:text-indigo-600 p-1.5 rounded hover:bg-slate-100 cursor-pointer transition-colors"
                              title="সম্পাদনা করুন"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingOptionIdx(idx);
                                setEditingOptionIdx(null);
                              }}
                              className="text-slate-400 hover:text-red-600 p-1.5 rounded hover:bg-slate-100 cursor-pointer transition-colors"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-5 py-3 flex justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsManageOptionsModalOpen(false);
                  setEditingOptionIdx(null);
                  setDeletingOptionIdx(null);
                  setAddOptionError('');
                  setNewOptionValue('');
                }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold text-xs cursor-pointer transition-colors"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE BUDGET MODAL */}
      {isAddBudgetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden fade-in flex flex-col max-h-[90vh]">
            
            <div className="bg-indigo-600 text-white px-6 py-4 flex items-center justify-between border-b border-indigo-700">
              <div className="flex items-center gap-2">
                <span className="text-xl">💰</span>
                <div>
                  <h3 className="text-sm font-bold text-white">নতুন বাজেট খাত এন্ট্রি করুন</h3>
                  <p className="text-[10px] text-indigo-200 font-medium uppercase tracking-wider">Budget Tracker</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddBudgetModalOpen(false)}
                className="text-indigo-200 hover:text-white hover:bg-indigo-700 p-1 rounded transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddBudget} className="p-6 overflow-y-auto flex-1">
              {budgetErrorMsg && (
                <div className="mb-4 bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg border border-red-200 flex items-center gap-2">
                  <AlertCircle size={14} /> {budgetErrorMsg}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">SL No.</label>
                    <input 
                      type="text"
                      required
                      name="sl"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Budget Code</label>
                    <input 
                      type="text"
                      required
                      name="budgetCode"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Budget Head (খাতের নাম)</label>
                  <input 
                    type="text"
                    required
                    name="budgetHead"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white outline-none transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Responsible Person</label>
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="checkbox"
                        id="budget-custom-person-checkbox"
                        checked={isBudgetCustomResponsible}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsBudgetCustomResponsible(checked);
                          if (!checked) {
                            setBudgetCustomResponsible('');
                          }
                        }}
                        className="rounded text-indigo-600 w-3 h-3 cursor-pointer"
                      />
                      <label htmlFor="budget-custom-person-checkbox" className="text-[10px] font-bold text-slate-500 cursor-pointer">Custom / নিজে লিখুন</label>
                    </div>
                  </div>
                  {isBudgetCustomResponsible ? (
                    <input 
                      type="text"
                      required
                      name="responsiblePerson"
                      placeholder="Enter Custom Person Name"
                      value={budgetCustomResponsible}
                      onChange={(e) => setBudgetCustomResponsible(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white outline-none transition font-semibold text-slate-800"
                    />
                  ) : (
                    <select 
                      required
                      name="responsiblePerson"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white outline-none transition cursor-pointer"
                    >
                      <option value="">Select Person...</option>
                      {RESPONSIBLE_PERSONS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  )}
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Budget Figure (পরিমাণ)</label>
                  <input 
                    type="number"
                    required
                    name="budgetFigure"
                    min="1"
                    placeholder="Enter amount in BDT"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Fiscal Year (অর্থবছর)</label>
                  <select
                    name="fiscalYear"
                    defaultValue={selectedFiscalYear}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white outline-none transition cursor-pointer font-bold text-slate-700"
                  >
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-2027">2026-2027</option>
                    <option value="2024-2025">2024-2025</option>
                    <option value="2023-2024">2023-2024</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddBudgetModalOpen(false)}
                  className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <Save size={16} /> Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BUDGET MODAL */}
      {isEditBudgetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden fade-in flex flex-col max-h-[90vh]">
            
            <div className="bg-indigo-600 text-white px-6 py-4 flex items-center justify-between border-b border-indigo-700">
              <div className="flex items-center gap-2">
                <span className="text-xl">✍️</span>
                <div>
                  <h3 className="text-sm font-bold text-white">বাজেট খাত সংশোধন করুন</h3>
                  <p className="text-[10px] text-indigo-200 font-medium uppercase tracking-wider">Edit Budget Head</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditBudgetModalOpen(false)}
                className="text-indigo-200 hover:text-white hover:bg-indigo-700 p-1 rounded transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditBudget} className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">SL No.</label>
                    <input 
                      type="text"
                      required
                      value={editBudgetSl}
                      onChange={(e) => setEditBudgetSl(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Budget Code</label>
                    <input 
                      type="text"
                      required
                      value={editBudgetCode}
                      onChange={(e) => setEditBudgetCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Budget Head (খাতের নাম)</label>
                  <input 
                    type="text"
                    required
                    value={editBudgetHead}
                    onChange={(e) => setEditBudgetHead(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white outline-none transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Responsible Person</label>
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="checkbox"
                        id="edit-budget-custom-person-checkbox"
                        checked={isEditBudgetCustomResponsible}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsEditBudgetCustomResponsible(checked);
                          if (!checked) {
                            setEditBudgetCustomResponsible('');
                          }
                        }}
                        className="rounded text-indigo-600 w-3 h-3 cursor-pointer"
                      />
                      <label htmlFor="edit-budget-custom-person-checkbox" className="text-[10px] font-bold text-slate-500 cursor-pointer">Custom / নিজে লিখুন</label>
                    </div>
                  </div>
                  {isEditBudgetCustomResponsible ? (
                    <input 
                      type="text"
                      required
                      placeholder="Enter Custom Person Name"
                      value={editBudgetCustomResponsible}
                      onChange={(e) => setEditBudgetCustomResponsible(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white outline-none transition font-semibold text-slate-800"
                    />
                  ) : (
                    <select 
                      required
                      value={editBudgetResponsible}
                      onChange={(e) => setEditBudgetResponsible(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white outline-none transition cursor-pointer"
                    >
                      <option value="">Select Person...</option>
                      {RESPONSIBLE_PERSONS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  )}
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Budget Figure (পরিমাণ)</label>
                  <input 
                    type="number"
                    required
                    value={editBudgetFigure}
                    onChange={(e) => setEditBudgetFigure(e.target.value)}
                    min="1"
                    placeholder="Enter amount in BDT"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Fiscal Year (অর্থবছর)</label>
                  <select
                    value={editBudgetFiscalYear}
                    onChange={(e) => setEditBudgetFiscalYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white outline-none transition cursor-pointer font-bold text-slate-700"
                  >
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-2027">2026-2027</option>
                    <option value="2024-2025">2024-2025</option>
                    <option value="2023-2024">2023-2024</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEditBudgetModalOpen(false)}
                  className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE EXPENSE MODAL */}
      {isAddExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden fade-in flex flex-col max-h-[90vh]">
            
            <div className="bg-amber-600 text-white px-6 py-4 flex items-center justify-between border-b border-amber-700">
              <div className="flex items-center gap-2">
                <span className="text-xl">💸</span>
                <div>
                  <h3 className="text-sm font-bold text-white">নতুন ব্যয় এন্ট্রি করুন</h3>
                  <p className="text-[10px] text-amber-100 font-medium uppercase tracking-wider">Expense Register</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddExpenseModalOpen(false)}
                className="text-amber-100 hover:text-white hover:bg-amber-700 p-1 rounded transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-6 overflow-y-auto flex-1">
              {expenseErrorMsg && (
                <div className="mb-4 bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg border border-red-200 flex items-center gap-2">
                  <AlertCircle size={14} /> {expenseErrorMsg}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date (তারিখ)</label>
                  <input 
                    type="date"
                    required
                    name="expenseDate"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:bg-white outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Budget Head (বাজেট খাত)</label>
                  <select 
                    required
                    name="budgetCode"
                    value={addExpenseBudgetCode}
                    onChange={(e) => setAddExpenseBudgetCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:bg-white outline-none transition"
                  >
                    <option value="">Select a budget head...</option>
                    {filteredBudgets.map(item => (
                      <option key={item.budgetCode} value={item.budgetCode}>
                        {item.budgetCode} - {item.budgetHead}
                      </option>
                    ))}
                  </select>
                  {addExpenseNextSerial && (
                    <div className="mt-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 p-2 rounded-lg flex items-center justify-between">
                      <span>অটো সিরিয়াল নম্বর (Serial No):</span>
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200">{addExpenseNextSerial}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Expense Type (ব্যয়ের ধরণ)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'Advance', label: 'Advance', bnLabel: 'অগ্রিম', colorClass: 'border-sky-500 text-sky-700 bg-sky-50/50', activeClass: 'ring-2 ring-sky-500 bg-sky-50 border-sky-500 text-sky-800' },
                      { value: 'Paid', label: 'Paid', bnLabel: 'পরিশোধিত', colorClass: 'border-emerald-500 text-emerald-700 bg-emerald-50/50', activeClass: 'ring-2 ring-emerald-500 bg-emerald-50 border-emerald-500 text-emerald-800' },
                      { value: 'Payment', label: 'Payment', bnLabel: 'পেমেন্ট', colorClass: 'border-indigo-500 text-indigo-700 bg-indigo-50/50', activeClass: 'ring-2 ring-indigo-500 bg-indigo-50 border-indigo-500 text-indigo-800' },
                    ].map((opt) => {
                      const isSelected = addExpenseType === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setAddExpenseType(opt.value as any);
                            if (opt.value !== 'Advance' && addExpenseSubType === 'Adjustment') {
                              setAddExpenseSubType('Fixed');
                            }
                          }}
                          className={`border rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                            isSelected ? opt.activeClass : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {isSelected ? (
                              <span className="text-emerald-600 font-bold text-xs">✓</span>
                            ) : (
                              <span className="w-2.5 h-2.5 rounded-full border border-slate-300"></span>
                            )}
                            <span className="text-xs font-bold uppercase">{opt.label}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium">{opt.bnLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Status / Category (ক্যাটাগরি / স্ট্যাটাস)
                  </label>
                  <div className={`grid gap-2 ${addExpenseType === 'Advance' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {(addExpenseType === 'Advance' ? [
                      { value: 'Fixed', label: 'Fixed', bnLabel: 'ফিক্সড', activeClass: 'ring-2 ring-slate-500 bg-slate-100 border-slate-500 text-slate-800' },
                      { value: 'Adjustment', label: 'Adjustment', bnLabel: 'অ্যাডজাস্টমেন্ট', activeClass: 'ring-2 ring-amber-500 bg-amber-50 border-amber-500 text-amber-800' },
                      { value: 'Complete', label: 'Complete', bnLabel: 'কমপ্লিট', activeClass: 'ring-2 ring-emerald-500 bg-emerald-50 border-emerald-500 text-emerald-800' }
                    ] : [
                      { value: 'Fixed', label: 'Fixed', bnLabel: 'ফিক্সড', activeClass: 'ring-2 ring-slate-500 bg-slate-100 border-slate-500 text-slate-800' },
                      { value: 'Complete', label: 'Complete', bnLabel: 'কমপ্লিট', activeClass: 'ring-2 ring-emerald-500 bg-emerald-50 border-emerald-500 text-emerald-800' }
                    ]).map((subOpt) => {
                      const isSubSelected = addExpenseSubType === subOpt.value;
                      return (
                        <button
                          key={subOpt.value}
                          type="button"
                          onClick={() => setAddExpenseSubType(subOpt.value as any)}
                          className={`border rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                            isSubSelected ? subOpt.activeClass : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {isSubSelected ? (
                              <span className="text-emerald-600 font-bold text-xs">✓</span>
                            ) : (
                              <span className="w-2.5 h-2.5 rounded-full border border-slate-300"></span>
                            )}
                            <span className="text-xs font-bold uppercase">{subOpt.label}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium">{subOpt.bnLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount (পরিমাণ)</label>
                  <input 
                    type="number"
                    required
                    name="amount"
                    value={addExpenseAmount}
                    onChange={(e) => setAddExpenseAmount(e.target.value)}
                    readOnly={addExpenseIsFixed}
                    min="1"
                    placeholder="Enter amount in BDT"
                    className={`w-full border rounded-lg px-3 py-2 text-sm font-bold transition outline-none ${
                      addExpenseIsFixed 
                        ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' 
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500 focus:bg-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description (বিবরণ)</label>
                  <input 
                    type="text"
                    required
                    name="description"
                    placeholder="e.g. Purchased cleaning supplies"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:bg-white outline-none transition"
                  />
                </div>

              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddExpenseModalOpen(false)}
                  className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-600 shadow-md transition flex items-center gap-2"
                >
                  <Save size={16} /> Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EXPENSE MODAL */}
      {isEditExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden fade-in flex flex-col max-h-[90vh]">
            
            <div className="bg-amber-600 text-white px-6 py-4 flex items-center justify-between border-b border-amber-700">
              <div className="flex items-center gap-2">
                <Edit size={18} />
                <div>
                  <h3 className="text-sm font-bold text-white">ব্যয় এন্ট্রি সংশোধন করুন (Edit Expense)</h3>
                  <p className="text-[10px] text-amber-100 font-medium uppercase tracking-wider">Expense Register</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditExpenseModalOpen(false)}
                className="text-amber-100 hover:text-white hover:bg-amber-700 p-1 rounded transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditExpense} className="p-6 overflow-y-auto flex-1">
              {editExpenseErrorMsg && (
                <div className="mb-4 bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg border border-red-200 flex items-center gap-2">
                  <AlertCircle size={14} /> {editExpenseErrorMsg}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date (তারিখ)</label>
                  <input 
                    type="date"
                    required
                    value={editExpenseDate}
                    onChange={(e) => setEditExpenseDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:bg-white outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Budget Head (বাজেট খাত)</label>
                  <select 
                    required
                    value={editExpenseBudgetCode}
                    onChange={(e) => setEditExpenseBudgetCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:bg-white outline-none transition cursor-pointer"
                  >
                    <option value="">Select a budget head...</option>
                    {filteredBudgets.map(item => (
                      <option key={item.budgetCode} value={item.budgetCode}>
                        {item.budgetCode} - {item.budgetHead}
                      </option>
                    ))}
                  </select>
                  {editExpenseBudgetCode && (
                    <div className="mt-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 p-2 rounded-lg flex items-center justify-between">
                      <span>সিরিয়াল নম্বর (Serial No):</span>
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200">
                        {(() => {
                          const existing = expenses.find(e => e.id === editExpenseId);
                          if (existing?.serialNo && existing.serialNo.startsWith(editExpenseBudgetCode)) {
                            return existing.serialNo;
                          }
                          const count = expenses.filter(e => e.budgetCode === editExpenseBudgetCode && e.id !== editExpenseId && (e.fiscalYear || '2025-2026') === editExpenseFiscalYear).length;
                          return `${editExpenseBudgetCode}-${String(count + 1).padStart(2, '0')}`;
                        })()}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Expense Type (ব্যয়ের ধরণ)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'Advance', label: 'Advance', bnLabel: 'অগ্রিম', activeClass: 'ring-2 ring-sky-500 bg-sky-50 border-sky-500 text-sky-800' },
                      { value: 'Paid', label: 'Paid', bnLabel: 'পরিশোধিত', activeClass: 'ring-2 ring-emerald-500 bg-emerald-50 border-emerald-500 text-emerald-800' },
                      { value: 'Payment', label: 'Payment', bnLabel: 'পেমেন্ট', activeClass: 'ring-2 ring-indigo-500 bg-indigo-50 border-indigo-500 text-indigo-800' },
                    ].map((opt) => {
                      const isSelected = editExpenseType === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setEditExpenseType(opt.value as any);
                            if (opt.value !== 'Advance' && editExpenseSubType === 'Adjustment') {
                              setEditExpenseSubType('Fixed');
                            }
                          }}
                          className={`border rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                            isSelected ? opt.activeClass : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {isSelected ? (
                              <span className="text-emerald-600 font-bold text-xs">✓</span>
                            ) : (
                              <span className="w-2.5 h-2.5 rounded-full border border-slate-300"></span>
                            )}
                            <span className="text-xs font-bold uppercase">{opt.label}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium">{opt.bnLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Status / Category (ক্যাটাগরি / স্ট্যাটাস)
                  </label>
                  <div className={`grid gap-2 ${editExpenseType === 'Advance' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {(editExpenseType === 'Advance' ? [
                      { value: 'Fixed', label: 'Fixed', bnLabel: 'ফিক্সড', activeClass: 'ring-2 ring-slate-500 bg-slate-100 border-slate-500 text-slate-800' },
                      { value: 'Adjustment', label: 'Adjustment', bnLabel: 'অ্যাডজাস্টমেন্ট', activeClass: 'ring-2 ring-amber-500 bg-amber-50 border-amber-500 text-amber-800' },
                      { value: 'Complete', label: 'Complete', bnLabel: 'কমপ্লিট', activeClass: 'ring-2 ring-emerald-500 bg-emerald-50 border-emerald-500 text-emerald-800' }
                    ] : [
                      { value: 'Fixed', label: 'Fixed', bnLabel: 'ফিক্সড', activeClass: 'ring-2 ring-slate-500 bg-slate-100 border-slate-500 text-slate-800' },
                      { value: 'Complete', label: 'Complete', bnLabel: 'কমপ্লিট', activeClass: 'ring-2 ring-emerald-500 bg-emerald-50 border-emerald-500 text-emerald-800' }
                    ]).map((subOpt) => {
                      const isSubSelected = editExpenseSubType === subOpt.value;
                      return (
                        <button
                          key={subOpt.value}
                          type="button"
                          onClick={() => setEditExpenseSubType(subOpt.value as any)}
                          className={`border rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                            isSubSelected ? subOpt.activeClass : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {isSubSelected ? (
                              <span className="text-emerald-600 font-bold text-xs">✓</span>
                            ) : (
                              <span className="w-2.5 h-2.5 rounded-full border border-slate-300"></span>
                            )}
                            <span className="text-xs font-bold uppercase">{subOpt.label}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium">{subOpt.bnLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount (পরিমাণ)</label>
                  <input 
                    type="number"
                    required
                    value={editExpenseAmount}
                    onChange={(e) => setEditExpenseAmount(e.target.value)}
                    readOnly={editExpenseIsFixed}
                    min="1"
                    placeholder="Enter amount in BDT"
                    className={`w-full border rounded-lg px-3 py-2 text-sm font-bold transition outline-none ${
                      editExpenseIsFixed 
                        ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' 
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500 focus:bg-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description (বিবরণ)</label>
                  <input 
                    type="text"
                    required
                    value={editExpenseDescription}
                    onChange={(e) => setEditExpenseDescription(e.target.value)}
                    placeholder="e.g. Purchased cleaning supplies"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:bg-white outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Fiscal Year (অর্থবছর)</label>
                  <select
                    value={editExpenseFiscalYear}
                    onChange={(e) => setEditExpenseFiscalYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:bg-white outline-none transition cursor-pointer font-bold text-slate-700"
                  >
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-2027">2026-2027</option>
                    <option value="2024-2025">2024-2025</option>
                    <option value="2023-2024">2023-2024</option>
                  </select>
                </div>

              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEditExpenseModalOpen(false)}
                  className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-600 shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE MEMO MODAL */}
      {isAddMemoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden fade-in flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Send size={18} className="text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">নতুন মেমো নথি রেজিস্টার করুন</h3>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">BSK Memo Register</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddMemoModalOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1 rounded transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateMemo} className="p-6 space-y-4 overflow-y-auto flex-1">
              {memoErrorMsg && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{memoErrorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                    {'মেমোর তারিখ'} <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="date"
                    required
                    onChange={handleMemoDateChange}
                    className="w-full border-b border-slate-300 py-1 focus:border-indigo-500 outline-none text-slate-700 bg-transparent text-xs font-semibold"
                  />
                  <p className="text-[10px] text-slate-400">
                    Format: <span className="font-bold text-slate-600">{memoOpeningDate}</span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                    {'ক্রমিক নম্বর (SI)'} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2 mb-1">
                    <input 
                      type="checkbox" 
                      id="memo-auto-si-checkbox"
                      checked={useMemoAutoSI}
                      onChange={(e) => setUseMemoAutoSI(e.target.checked)}
                      className="rounded text-indigo-600 w-3.5 h-3.5"
                    />
                    <label htmlFor="memo-auto-si-checkbox" className="text-xs font-bold text-slate-600 cursor-pointer">
                      Auto ({nextMemoSI})
                    </label>
                  </div>
                  {!useMemoAutoSI && (
                    <input 
                      type="text"
                      required={!useMemoAutoSI}
                      placeholder="e.g. 017"
                      value={manualMemoSI}
                      onChange={(e) => setManualMemoSI(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      className="w-full border-b border-slate-300 py-0.5 focus:border-indigo-500 outline-none text-slate-700 font-mono text-xs font-bold bg-transparent"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                      বিভাগ <span className="text-red-500">*</span>
                    </label>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setManageOptionsType('departments');
                          setManageOptionsTitle('বিভাগ তালিকা পরিবর্তন করুন');
                          setIsManageOptionsModalOpen(true);
                        }}
                        className="p-0.5 hover:bg-slate-100 rounded text-indigo-600 flex items-center justify-center cursor-pointer transition-colors"
                        title="বিভাগ তালিকা ম্যানেজ করুন"
                      >
                        <Settings size={12} />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMemoCustomDept(!isMemoCustomDept);
                      if (isMemoCustomDept) {
                        setMemoCustomDept('');
                        setMemoDepartment('');
                      }
                    }}
                    className="p-1 hover:bg-slate-100 rounded text-indigo-600 flex items-center justify-center cursor-pointer transition-colors"
                    title={isMemoCustomDept ? "dropdown থেকে সিলেক্ট করুন" : "নতুন বিভাগ যোগ করুন"}
                  >
                    <Plus size={14} className={isMemoCustomDept ? "rotate-45 text-red-500" : ""} />
                  </button>
                </div>
                {isMemoCustomDept ? (
                  <input 
                    type="text"
                    required
                    placeholder="নতুন বিভাগ লিখুন (যেমন: বিসাকে.আইটি)"
                    value={memoCustomDept}
                    onChange={(e) => setMemoCustomDept(e.target.value)}
                    className="w-full border-b border-slate-300 py-1 focus:border-indigo-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                  />
                ) : (
                  <select 
                    required
                    value={memoDepartment}
                    onChange={(e) => {
                      setMemoDepartment(e.target.value);
                    }}
                    className="w-full border-b border-slate-300 py-1 focus:border-indigo-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                  >
                    <option value="">-- বিভাগ নির্বাচন করুন --</option>
                    {memoDepartmentOptions.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                      {editingFileType === 'file' ? 'Subject / Accounts Head' : 'বিষয় / হিসাবের খাত'} <span className="text-red-500">*</span>
                    </label>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setManageOptionsType('subjects');
                          setManageOptionsTitle('বিষয় / হিসাবের খাত তালিকা পরিবর্তন করুন');
                          setIsManageOptionsModalOpen(true);
                        }}
                        className="p-0.5 hover:bg-slate-100 rounded text-indigo-600 flex items-center justify-center cursor-pointer transition-colors"
                        title="বিষয় তালিকা ম্যানেজ করুন"
                      >
                        <Settings size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <input 
                    type="checkbox"
                    id="memo-custom-subject-checkbox"
                    checked={isMemoCustomSubject}
                    onChange={(e) => setIsMemoCustomSubject(e.target.checked)}
                    className="rounded text-indigo-600 w-3.5 h-3.5"
                  />
                  <label htmlFor="memo-custom-subject-checkbox" className="text-xs font-bold text-slate-600 cursor-pointer">
                    Type Custom Subject / নিজে লিখুন
                  </label>
                </div>
                {isMemoCustomSubject ? (
                  <input 
                    type="text"
                    required
                    placeholder="e.g. 3rd Qrt Bill"
                    value={memoCustomSubject}
                    onChange={(e) => setMemoCustomSubject(e.target.value)}
                    className="w-full border-b border-slate-300 py-1 focus:border-indigo-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                  />
                ) : (
                  <select 
                    required
                    value={memoSubject}
                    onChange={(e) => {
                      setMemoSubject(e.target.value);
                    }}
                    className="w-full border-b border-slate-300 py-1 focus:border-indigo-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                  >
                    <option value="">-- বিষয় নির্বাচন করুন --</option>
                    {memoSubjectOptions.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  {'পত্রের বিস্তারিত বিষয়'}
                </label>
                <textarea 
                  placeholder="পত্রের বিস্তারিত বিষয় (ঐচ্ছিক)"
                  value={memoNote}
                  onChange={(e) => setMemoNote(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 focus:border-indigo-500 outline-none text-slate-700 text-xs font-semibold resize-y min-h-[60px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  {'প্রাপক'} <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Sec, MoE"
                  value={memoReceiver}
                  onChange={(e) => setMemoReceiver(e.target.value)}
                  className="w-full border-b border-slate-300 py-1 focus:border-indigo-500 outline-none text-slate-700 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between h-6">
                    <div className="flex items-center gap-1 truncate">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block truncate">
                        Responsible Person
                      </label>
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setManageOptionsType('responsible_persons');
                            setManageOptionsTitle('কর্মকর্তা তালিকা পরিবর্তন করুন');
                            setIsManageOptionsModalOpen(true);
                          }}
                          className="p-0.5 hover:bg-slate-100 rounded text-indigo-600 flex items-center justify-center cursor-pointer transition-colors"
                          title="কর্মকর্তা তালিকা ম্যানেজ করুন"
                        >
                          <Settings size={12} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-bold text-slate-500">
                      <input 
                        type="checkbox"
                        id="memo-custom-person-checkbox"
                        checked={isMemoCustomResponsiblePerson}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsMemoCustomResponsiblePerson(checked);
                          if (!checked) {
                            setMemoCustomResponsiblePerson('');
                            setMemoResponsiblePerson('');
                          }
                        }}
                        className="rounded text-indigo-600 w-3 h-3 cursor-pointer"
                      />
                      <label htmlFor="memo-custom-person-checkbox" className="cursor-pointer whitespace-nowrap select-none">Custom / নিজে লিখুন</label>
                    </div>
                  </div>
                  {isMemoCustomResponsiblePerson ? (
                    <input 
                      type="text"
                      required
                      placeholder="Enter Person Name"
                      value={memoCustomResponsiblePerson}
                      onChange={(e) => setMemoCustomResponsiblePerson(e.target.value)}
                      className="w-full border-b border-slate-300 py-1 focus:border-indigo-500 outline-none text-slate-700 text-xs font-semibold"
                    />
                  ) : (
                    <select 
                      required
                      value={memoResponsiblePerson}
                      onChange={(e) => setMemoResponsiblePerson(e.target.value)}
                      className="w-full border-b border-slate-300 py-1 focus:border-indigo-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                    >
                      <option value="">-- দায়িত্বপ্রাপ্ত কর্মকর্তা --</option>
                      {memoResponsiblePersonOptions.map(person => (
                        <option key={person} value={person}>{person}</option>
                      ))}
                    </select>
                  )}
                </div>
 
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between h-6">
                    <div className="flex items-center gap-1 truncate">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block truncate">
                        Designation
                      </label>
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setManageOptionsType('designations');
                            setManageOptionsTitle('পদবি তালিকা পরিবর্তন করুন');
                            setIsManageOptionsModalOpen(true);
                          }}
                          className="p-0.5 hover:bg-slate-100 rounded text-indigo-600 flex items-center justify-center cursor-pointer transition-colors"
                          title="পদবি তালিকা ম্যানেজ করুন"
                        >
                          <Settings size={12} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-bold text-slate-500">
                      <input 
                        type="checkbox"
                        id="memo-custom-dsg-checkbox"
                        checked={isMemoCustomDesignation}
                        onChange={(e) => setIsMemoCustomDesignation(e.target.checked)}
                        className="rounded text-indigo-600 w-3 h-3 cursor-pointer"
                      />
                      <label htmlFor="memo-custom-dsg-checkbox" className="cursor-pointer whitespace-nowrap select-none">Custom / নিজে লিখুন</label>
                    </div>
                  </div>
                  {isMemoCustomDesignation ? (
                    <input 
                      type="text"
                      required
                      placeholder="e.g. AD, ACC"
                      value={memoCustomDesignation}
                      onChange={(e) => setMemoCustomDesignation(e.target.value)}
                      className="w-full border-b border-slate-300 py-1 focus:border-indigo-500 outline-none text-slate-700 text-xs font-semibold"
                    />
                  ) : (
                    <select 
                      required
                      value={memoDesignation}
                      onChange={(e) => setMemoDesignation(e.target.value)}
                      className="w-full border-b border-slate-300 py-1 focus:border-indigo-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                    >
                      <option value="">-- পদবি নির্বাচন করুন --</option>
                      {memoDesignationOptions.map(dsg => (
                        <option key={dsg} value={dsg}>{dsg}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Live Preview */}
              <div className="bg-slate-900 rounded-lg p-3 text-white text-center flex flex-col items-center justify-center border border-slate-700">
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-[2px] mb-1">Live Unique Memo Number</span>
                <div className="text-xs font-mono font-bold text-green-400 break-all bg-slate-800 px-3 py-1.5 rounded w-full">{generatedMemoNumber}</div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddMemoModalOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold text-xs cursor-pointer">Cancel</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-black text-xs shadow-lg cursor-pointer">Save Memo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW 5: EDIT MODAL (ADMIN ONLY) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in" id="edit-modal">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8 animate-slide-up max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-[#0A111E] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-[#cca355] text-lg">📝</span>
                <div>
                  <h3 className="font-black text-sm tracking-wide uppercase">
                    {editingFileType === 'file' ? 'Edit Record Entry' : 'তথ্য সংশোধন ও এডিট'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
                    {editingFileType === 'file' ? `Editing File: ${editFileName}` : `Editing Memo: ${editMemoNumber}`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)} 
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto flex-1">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* SI Number */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                    Serial Number <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    value={editSI}
                    onChange={(e) => setEditSI(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 font-mono text-xs font-bold bg-transparent"
                  />
                </div>

                {/* Opening Date */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                    {editingFileType === 'file' ? 'Date' : 'তারিখ (Date)'} <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="DD.MM.YYYY"
                    value={editOpeningDate}
                    onChange={(e) => setEditOpeningDate(e.target.value)}
                    className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 font-mono text-xs font-bold bg-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Opening Year (File Only) */}
                {editingFileType === 'file' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                      {'Opening Year'} <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text"
                      required
                      value={editOpeningYear}
                      onChange={(e) => setEditOpeningYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 font-mono text-xs font-bold bg-transparent"
                    />
                  </div>
                )}

                {/* Receiver & Note (Memo Only) */}
                {editingFileType === 'memo' && (
                  <div className="col-span-1 sm:col-span-2 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                        {'পত্রের বিস্তারিত বিষয়'}
                      </label>
                      <textarea 
                        placeholder="পত্রের বিস্তারিত বিষয় (ঐচ্ছিক)"
                        value={editMemoNote}
                        onChange={(e) => setEditMemoNote(e.target.value)}
                        className="w-full border border-slate-300 rounded p-2 focus:border-blue-500 outline-none text-slate-700 text-xs font-semibold resize-y min-h-[60px] bg-white/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                        Receiver (গ্রাহক / প্রাপক) <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text"
                        required
                        value={editReceiver}
                        onChange={(e) => setEditReceiver(e.target.value)}
                        className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 text-xs font-bold bg-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Department Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                      {editingFileType === 'file' ? 'Department' : 'বিভাগ'} <span className="text-red-500">*</span>
                    </label>
                    {isSuperAdmin && editingFileType === 'memo' && (
                      <button
                        type="button"
                        onClick={() => {
                          setManageOptionsType('departments');
                          setManageOptionsTitle('বিভাগ তালিকা পরিবর্তন করুন');
                          setIsManageOptionsModalOpen(true);
                        }}
                        className="p-0.5 hover:bg-slate-100 rounded text-indigo-600 flex items-center justify-center cursor-pointer transition-colors"
                        title="বিভাগ তালিকা ম্যানেজ করুন"
                      >
                        <Settings size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <select 
                  value={editDepartment}
                  onChange={(e) => {
                    setEditDepartment(e.target.value);
                    const standards = SUBJECTS_BY_DEPT[e.target.value];
                    if (standards && standards.length > 0) {
                      setEditSubject(standards[0]);
                      setIsEditCustomSubject(false);
                    }
                  }}
                  className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                >
                  {(editingFileType === 'memo' ? memoDepartmentOptions : departmentOptions).map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Subject Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                      {editingFileType === 'file' ? 'Subject / Accounts Head' : 'বিষয় / হিসাবের খাত'} <span className="text-red-500">*</span>
                    </label>
                    {isSuperAdmin && editingFileType === 'memo' && (
                      <button
                        type="button"
                        onClick={() => {
                          setManageOptionsType('subjects');
                          setManageOptionsTitle('বিষয় / হিসাবের খাত তালিকা পরিবর্তন করুন');
                          setIsManageOptionsModalOpen(true);
                        }}
                        className="p-0.5 hover:bg-slate-100 rounded text-indigo-600 flex items-center justify-center cursor-pointer transition-colors"
                        title="বিষয় তালিকা ম্যানেজ করুন"
                      >
                        <Settings size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <input 
                    type="checkbox"
                    id="edit-custom-subject-checkbox"
                    checked={isEditCustomSubject}
                    onChange={(e) => setIsEditCustomSubject(e.target.checked)}
                    className="rounded text-blue-600 w-3.5 h-3.5"
                  />
                  <label htmlFor="edit-custom-subject-checkbox" className="text-xs font-bold text-slate-600 cursor-pointer">
                    Type Custom Subject
                  </label>
                </div>
                {isEditCustomSubject ? (
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Accounts General"
                    value={editCustomSubject}
                    onChange={(e) => setEditCustomSubject(e.target.value)}
                    className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                  />
                ) : (
                  <select 
                    value={editSubject}
                    onChange={(e) => {
                      const selectedSub = e.target.value;
                      setEditSubject(selectedSub);
                      if (!isEditCustomDept && editingFileType === 'file') {
                        const matchedDept = Object.keys(SUBJECTS_BY_DEPT).find(dept => 
                          SUBJECTS_BY_DEPT[dept].includes(selectedSub)
                        );
                        if (matchedDept) {
                          setEditDepartment(matchedDept);
                        }
                      }
                    }}
                    className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                  >
                    {(editingFileType === 'memo' ? memoSubjectOptions : subjectOptions).map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                )}
              </div>
              {/* Note / Remarks */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  Note / মন্তব্য
                </label>
                <input
                  type="text"
                  placeholder="Optional notes or remarks..."
                  value={editingFileType === 'memo' ? editMemoNote : editFileNote}
                  onChange={(e) => editingFileType === 'memo' ? setEditMemoNote(e.target.value) : setEditFileNote(e.target.value)}
                  className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                />
              </div>

              {/* Responsible Person & Designation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                        Responsible Person
                      </label>
                      {isSuperAdmin && editingFileType === 'memo' && (
                        <button
                          type="button"
                          onClick={() => {
                            setManageOptionsType('responsible_persons');
                            setManageOptionsTitle('কর্মকর্তা তালিকা পরিবর্তন করুন');
                            setIsManageOptionsModalOpen(true);
                          }}
                          className="p-0.5 hover:bg-slate-100 rounded text-indigo-600 flex items-center justify-center cursor-pointer transition-colors"
                          title="কর্মকর্তা তালিকা ম্যানেজ করুন"
                        >
                          <Settings size={12} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="checkbox"
                        id="edit-custom-person-checkbox"
                        checked={isEditCustomResponsiblePerson}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsEditCustomResponsiblePerson(checked);
                          if (!checked) {
                            setEditCustomResponsiblePerson('');
                            setEditResponsiblePerson(editingFileType === 'file' ? RESPONSIBLE_PERSONS[0] : MEMO_RESPONSIBLE_PERSONS[0]);
                          }
                        }}
                        className="rounded text-blue-600 w-3 h-3"
                      />
                      <label htmlFor="edit-custom-person-checkbox" className="text-[10px] font-bold text-slate-500 cursor-pointer">Custom</label>
                    </div>
                  </div>
                  {isEditCustomResponsiblePerson ? (
                    <input 
                      type="text"
                      placeholder="Enter Person Name"
                      value={editCustomResponsiblePerson}
                      onChange={(e) => setEditCustomResponsiblePerson(e.target.value)}
                      className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                    />
                  ) : (
                    <select 
                      value={editResponsiblePerson}
                      onChange={(e) => setEditResponsiblePerson(e.target.value)}
                      className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                    >
                      {(editingFileType === 'memo' ? memoResponsiblePersonOptions : responsiblePersonOptions).map(person => (
                        <option key={person} value={person}>{person}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                        Designation
                      </label>
                      {isSuperAdmin && editingFileType === 'memo' && (
                        <button
                          type="button"
                          onClick={() => {
                            setManageOptionsType('designations');
                            setManageOptionsTitle('পদবি তালিকা পরিবর্তন করুন');
                            setIsManageOptionsModalOpen(true);
                          }}
                          className="p-0.5 hover:bg-slate-100 rounded text-indigo-600 flex items-center justify-center cursor-pointer transition-colors"
                          title="পদবি তালিকা ম্যানেজ করুন"
                        >
                          <Settings size={12} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <input 
                        type="checkbox"
                        id="edit-custom-dsg-checkbox"
                        checked={isEditCustomDesignation}
                        onChange={(e) => setIsEditCustomDesignation(e.target.checked)}
                        className="rounded text-blue-600 w-3 h-3"
                      />
                      <label htmlFor="edit-custom-dsg-checkbox" className="text-[10px] font-bold text-slate-500 cursor-pointer">Custom</label>
                    </div>
                  </div>
                  {isEditCustomDesignation ? (
                    <input 
                      type="text"
                      placeholder="e.g. Executive"
                      value={editCustomDesignation}
                      onChange={(e) => setEditCustomDesignation(e.target.value)}
                      className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                    />
                  ) : (
                    <select 
                      value={editDesignation}
                      onChange={(e) => setEditDesignation(e.target.value)}
                      className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                    >
                      {(editingFileType === 'memo' ? memoDesignationOptions : designationOptions).map(dsg => (
                        <option key={dsg} value={dsg}>{dsg}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Part Select Dropdown */}
              {editingFileType === 'file' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                    Part
                  </label>
                  <select 
                    value={editPart}
                    onChange={(e) => setEditPart(e.target.value)}
                    className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                  >
                    <option value="None">None</option>
                    
                    <option value="Part 2">Part 2</option>
                    <option value="Part 3">Part 3</option>
                    <option value="Part 4">Part 4</option>
                    <option value="Part 5">Part 5</option>
                  </select>
                </div>
              )}

              {/* Realtime Live Preview inside Edit */}
              <div className="bg-slate-900 rounded-lg p-3 text-white text-center flex flex-col items-center justify-center border border-slate-700">
                <span className="text-[10px] text-[#cca355] font-bold uppercase tracking-[2px] mb-1">
                  {editingFileType === 'file' ? 'Modified Live Preview' : 'সংশোধিত লাইভ আউটপুট'}
                </span>
                <div className="text-xs font-mono font-bold text-green-400 break-all bg-slate-800 px-3 py-1.5 rounded w-full">
                  {(() => {
                    const finalDept = isEditCustomDept ? editCustomDept.trim().toUpperCase() : editDepartment.trim().toUpperCase();
                    const finalSubject = isEditCustomSubject ? editCustomSubject.trim() : editSubject.trim();
                    
                    if (editingFileType === 'file') {
                      let rawFileName = `${finalDept}.${finalSubject}.${editOpeningYear}.${editSI}`;
                      if (editPart && editPart !== 'None') {
                        rawFileName += `(${editPart})`;
                      }
                      return rawFileName.replace(/\.{2,}/g, '.');
                    } else {
                      const dateParts = editOpeningDate.split('.');
                      const memoYearVal = dateParts[2] || '2026';
                      let rawMemoNumber = `স্মারক নং ${finalDept}.${finalSubject}.${memoYearVal}.${editSI}`;
                      if (editPart && editPart !== 'None') {
                        rawMemoNumber += `(${translatePartToBengali(editPart)})`;
                      }
                      return toBengali(rawMemoNumber);
                    }
                  })()}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)} 
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold text-xs cursor-pointer"
                >
                  {noteType === 'file' ? 'Cancel' : 'বাতিল'}
                </button>
                <button 
                  type="submit" 
                  className="bg-[#0A111E] hover:bg-slate-800 text-[#cca355] border border-[#cca355]/30 px-5 py-2 rounded-lg font-black text-xs shadow-lg cursor-pointer"
                >
                  {editingFileType === 'file' ? 'Save Changes' : 'পরিবর্তন সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW 6: NOTES MODAL (ADD / VIEW NOTES) */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" id="notes-modal">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-slide-up max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-[#0A111E] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-[#cca355] text-lg">📋</span>
                <div>
                  <h3 className="font-black text-sm tracking-wide uppercase">
                    {noteType === 'file' ? 'Entry Notes & Remarks' : 'নোট ও রিমার্কস'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
                    {noteRecordName}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsNoteModalOpen(false)} 
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wide block">
                  {noteType === 'file' ? 'Important Notes / Comments regarding this record' : 'নথি সংক্রান্ত গুরুত্বপূর্ণ নোট / মন্তব্য'}
                </label>
                <textarea 
                  rows={6}
                  value={currentNoteText}
                  onChange={(e) => setCurrentNoteText(e.target.value)}
                  placeholder={noteType === 'file' ? "Type here any important remarks or comments about this record to track in the future..." : "এখানে আপনার নথি সংক্রান্ত যেকোনো মন্তব্য বা নোট লিখতে পারেন যা ভবিষ্যতে ট্র্যাক করতে সুবিধা হবে..."}
                  className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-indigo-500 text-xs font-semibold text-slate-700 resize-none shadow-inner"
                />
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-start gap-2.5">
                <span className="text-amber-500 text-sm mt-0.5">💡</span>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  {noteType === 'file' ? 'Saved notes are permanently bound to this record. Admins and authorized contributors can read and modify them at any time.' : 'নোট সংরক্ষণ করা হলে তা এই ফাইলের সাথে চিরস্থায়ীভাবে যুক্ত থাকবে। শুধুমাত্র এডমিন এবং অনুমোদিত ব্যবহারকারীরা এই নোট এডিট করতে পারবেন।'}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsNoteModalOpen(false)} 
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold text-xs cursor-pointer"
                >
                  {noteType === 'file' ? 'Cancel' : 'বাতিল'}
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveNote}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-black text-xs shadow-lg cursor-pointer"
                >
                  {noteType === 'file' ? 'Save Note' : 'নোট সংরক্ষণ করুন'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PERMISSIONS MODAL */}
      {isEditPermissionsModalOpen && editingPermissionsUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-[#0A111E] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-[#cca355] text-lg">🔑</span>
                <div>
                  <h3 className="font-black text-sm tracking-wide uppercase">
                    {lang === 'BN' ? 'অনুমতি পরিবর্তন (Edit Permissions)' : 'Edit User Permissions'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
                    User: <span className="text-amber-400 font-black">{editingPermissionsUser.displayName} ({editingPermissionsUser.username})</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditPermissionsModalOpen(false)} 
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto text-left">
              
              {/* Menu Visibility Section */}
              <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-[#cca355] uppercase tracking-wider flex items-center gap-1.5 border-b border-amber-500/10 pb-1.5">
                  <span>🔑</span> {lang === 'BN' ? "মেনু দৃশ্যমানতা (Menu Visibility)" : "Menu Visibility"}
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  {Object.keys(editingPermissionMenus).map((menuKey) => {
                    const label = menuKey === 'welcome' ? 'Welcome Portal' :
                                  menuKey === 'files' ? 'File Opening' :
                                  menuKey === 'memos' ? 'Memo Register' :
                                  menuKey === 'budget' ? 'Budget Tracker' :
                                  menuKey === 'expense' ? 'Expense Register' :
                                  menuKey === 'employees' ? 'HR (হিউম্যান রিসোর্স)' :
                                  menuKey === 'dailyExpenseApproval' ? 'দৈনন্দিন খরচের অনুমোদন' :
                                  menuKey === 'analytics' ? 'Dashboard' : 'Security Dashboard';
                    return (
                      <label key={menuKey} className="flex items-center gap-2 text-xs text-slate-700 font-bold cursor-pointer hover:text-amber-600 transition-colors">
                        <input 
                          type="checkbox"
                          checked={(editingPermissionMenus as any)[menuKey]}
                          onChange={(e) => setEditingPermissionMenus(prev => ({ ...prev, [menuKey]: e.target.checked }))}
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 w-3.5 h-3.5"
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Action Permissions Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                  <span>⚙️</span> {lang === 'BN' ? "অনুমোদিত কর্মসমূহ (Allowed Actions)" : "Allowed Actions"}
                </h4>
                <div className="space-y-3.5 divide-y divide-slate-200 text-xs">
                  {Object.keys(editingPermissionActions).map((secKey) => {
                    const label = secKey === 'files' ? 'File Opening' :
                                  secKey === 'memos' ? 'Memo Register' :
                                  secKey === 'budget' ? 'Budget Tracker' :
                                  secKey === 'employees' ? 'HR (হিউম্যান রিসোর্স)' :
                                  secKey === 'dailyExpenseApproval' ? 'দৈনন্দিন খরচের অনুমোদন' :
                                  'Expense Register';
                    const actionsObj = (editingPermissionActions as any)[secKey];
                    return (
                      <div key={secKey} className="pt-3 first:pt-0">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide block mb-1.5">{label}</span>
                        <div className="flex flex-wrap gap-4">
                          {Object.keys(actionsObj).map((actKey) => {
                            const actLabel = actKey === 'create' ? 'Create' :
                                             actKey === 'edit' ? 'Edit' : 'Delete';
                            return (
                              <label key={actKey} className="flex items-center gap-1.5 text-xs text-slate-600 font-bold cursor-pointer hover:text-indigo-600 transition-colors">
                                <input 
                                  type="checkbox"
                                  checked={actionsObj[actKey]}
                                  onChange={(e) => setEditingPermissionActions(prev => ({
                                    ...prev,
                                    [secKey]: {
                                      ...(prev as any)[secKey],
                                      [actKey]: e.target.checked
                                    }
                                  }))}
                                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 w-3 h-3"
                                />
                                {actLabel}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsEditPermissionsModalOpen(false)} 
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold text-xs cursor-pointer transition-colors"
                >
                  {lang === 'BN' ? 'বাতিল' : 'Cancel'}
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveEditPermissions}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-black text-xs shadow-lg cursor-pointer transition-colors"
                >
                  {lang === 'BN' ? 'অনুমতি সংরক্ষণ করুন' : 'Save Permissions'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* VIEW 7: DATABASE BACKUP & EXPORT MODAL */}
      <DatabaseBackupModal 
        isOpen={isDatabaseBackupModalOpen}
        onClose={() => setIsDatabaseBackupModalOpen(false)}
        lang={lang}
      />

    </div>
  );
}
