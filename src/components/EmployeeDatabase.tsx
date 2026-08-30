import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  setDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Edit2, 
  Trash2, 
  User, 
  Grid, 
  List, 
  Camera, 
  Eye, 
  X, 
  AlertCircle, 
  Check, 
  ArrowUpDown,
  Printer,
  Copy,
  BadgeCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { EmployeeEntry, UserProfile } from '../types';
import { INITIAL_EMPLOYEE_DATA } from '../employeeSeed';

// Web Canvas Image Compressor Helper
export function compressImage(file: File, maxWidth = 250, maxHeight = 250, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string); // fallback to original if context not supported
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

// BSK HR Personal UID Generator
export function formatEmployeeUid(emp: { jobId?: string; joiningYear?: string; joiningDate?: string; sl?: string; id?: string }) {
  const cleanJobId = (emp.jobId && emp.jobId !== '?' ? emp.jobId : emp.sl || '0').toString().trim();
  let year = (emp.joiningYear || '').toString().trim();
  if (!year && emp.joiningDate) {
    const match = emp.joiningDate.match(/\b(19\d\d|20\d\d)\b/);
    if (match) {
      year = match[1];
    }
  }
  if (!year) {
    year = '2026';
  }
  return `BSK.HR.PERSONNEL.${cleanJobId}.${year}`;
}

interface EmployeeDatabaseProps {
  lang: 'BN' | 'EN';
  userProfile: UserProfile | null;
  hasActionAccess: (section: any, action: 'create' | 'edit' | 'delete') => boolean;
  logAction?: (actionType: string, description: string) => void;
}

export default function EmployeeDatabase({ lang, userProfile, hasActionAccess, logAction }: EmployeeDatabaseProps) {
  // Database States
  const [employees, setEmployees] = useState<EmployeeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortField, setSortField] = useState<keyof EmployeeEntry>('sl');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  // Detail Modal
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeEntry | null>(null);

  // Delete Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
  }>({
    isOpen: false,
    id: '',
    name: ''
  });

  // Form Modals (Add / Edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formId, setFormId] = useState('');
  
  // Image Preview & Upload
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    sl: '',
    name: '',
    nameBangla: '',
    fatherName: '',
    motherName: '',
    dobDay: '',
    dobMonth: '',
    dobYear: '',
    currentPosition: '',
    currentDepartment: '',
    jobId: '',
    joiningDay: '',
    joiningMonth: '',
    joiningYear: '',
    status: 'Implementation Staff',
    nationality: 'Bangladeshi',
    nid: '',
    nomineeName: '',
    nomineeNid: '',
    relation: '',
    share: '100%',
    minorOnBehalf: '',
    pfAcNo: '',
    remarks: ''
  });

  // Unique list values for filter dropdowns (derived from INITIAL + Firestore data)
  const [departments, setDepartments] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [statusList, setStatusList] = useState<string[]>([]);

  // 1. Subscribe to Firestore /employees collection
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'employees'), (snapshot) => {
      const list: EmployeeEntry[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as EmployeeEntry);
      });

      // Sort by SL numeric or as string as fallback
      const sorted = list.sort((a, b) => {
        const numA = parseInt(a.sl) || 999;
        const numB = parseInt(b.sl) || 999;
        return numA - numB;
      });

      setEmployees(sorted);
      setLoading(false);
    }, (error) => {
      console.error("Firestore onSnapshot error, falling back to initial data.", error);
      // Fallback state if offline or permissions pending
      setEmployees(INITIAL_EMPLOYEE_DATA);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Generate unique lists for dropdowns
  useEffect(() => {
    const activeList = employees.length > 0 ? employees : INITIAL_EMPLOYEE_DATA;
    
    const depts = Array.from(new Set(activeList.map(e => e.currentDepartment).filter(Boolean)));
    const posts = Array.from(new Set(activeList.map(e => e.currentPosition).filter(Boolean)));
    const stats = Array.from(new Set(activeList.map(e => e.status).filter(Boolean)));
    
    setDepartments(depts.sort());
    setPositions(posts.sort());
    setStatusList(stats.sort());
  }, [employees]);

  // Image Upload handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const base64Str = await compressImage(file);
      setImagePreview(base64Str);
    } catch (err) {
      console.error("Error compressing image:", err);
      alert("Image compression failed, please try another image.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const base64Str = await compressImage(file);
      setImagePreview(base64Str);
    } catch (err) {
      console.error("Error compressing image:", err);
    } finally {
      setIsCompressing(false);
    }
  };

  // Open Form modal
  const handleOpenForm = (mode: 'create' | 'edit', employee?: EmployeeEntry) => {
    setFormMode(mode);
    if (mode === 'edit' && employee) {
      setFormId(employee.id);
      setFormData({
        sl: employee.sl || '',
        name: employee.name || '',
        nameBangla: employee.nameBangla || '',
        fatherName: employee.fatherName || '',
        motherName: employee.motherName || '',
        dobDay: employee.dobDay || '',
        dobMonth: employee.dobMonth || '',
        dobYear: employee.dobYear || '',
        currentPosition: employee.currentPosition || '',
        currentDepartment: employee.currentDepartment || '',
        jobId: employee.jobId || '',
        joiningDay: employee.joiningDay || '',
        joiningMonth: employee.joiningMonth || '',
        joiningYear: employee.joiningYear || '',
        status: employee.status || 'Implementation Staff',
        nationality: employee.nationality || 'Bangladeshi',
        nid: employee.nid || '',
        nomineeName: employee.nomineeName || '',
        nomineeNid: employee.nomineeNid || '',
        relation: employee.relation || '',
        share: employee.share || '100%',
        minorOnBehalf: employee.minorOnBehalf || '',
        pfAcNo: employee.pfAcNo || '',
        remarks: employee.remarks || ''
      });
      setImagePreview(employee.photoURL || '');
    } else {
      // Pre-calculate next SL
      const activeList = employees.length > 0 ? employees : INITIAL_EMPLOYEE_DATA;
      const maxSl = activeList.reduce((max, item) => {
        const val = parseInt(item.sl) || 0;
        return val > max ? val : max;
      }, 0);
      
      setFormId('');
      setFormData({
        sl: (maxSl + 1).toString(),
        name: '',
        nameBangla: '',
        fatherName: '',
        motherName: '',
        dobDay: '',
        dobMonth: '',
        dobYear: '',
        currentPosition: '',
        currentDepartment: '',
        jobId: '',
        joiningDay: '',
        joiningMonth: '',
        joiningYear: '',
        status: 'Implementation Staff',
        nationality: 'Bangladeshi',
        nid: '',
        nomineeName: '',
        nomineeNid: '',
        relation: '',
        share: '100%',
        minorOnBehalf: '',
        pfAcNo: '',
        remarks: ''
      });
      setImagePreview('');
    }
    setIsFormModalOpen(true);
  };

  // Delete handler
  const handleDeleteEmployee = (employeeId: string, name: string) => {
    setDeleteConfirm({
      isOpen: true,
      id: employeeId,
      name: name
    });
  };

  const confirmDeleteAction = async () => {
    const { id, name } = deleteConfirm;
    setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
    try {
      await deleteDoc(doc(db, 'employees', id));
      if (logAction) {
        logAction('EMPLOYEE_DELETE', `Deleted Employee Record: ${name} (${id})`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `employees/${id}`);
    }
  };

  // Printable Profile Page Generator
  const handlePrintProfile = (emp: EmployeeEntry) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert(lang === 'BN' ? "প্রিন্ট উইন্ডো খুলতে অনুগ্রহ করে পপ-আপ অনুমোদন করুন।" : "Please allow pop-ups to open print preview.");
      return;
    }

    const photoContent = emp.photoURL 
      ? `<img src="${emp.photoURL}" style="width: 110px; height: 110px; border-radius: 8px; object-fit: cover; border: 1px solid #ddd;" />`
      : `<div style="width: 110px; height: 110px; border-radius: 8px; background: #f3f4f6; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #9ca3af; font-size: 36px; font-family: sans-serif;">${emp.name.charAt(0)}</div>`;

    const rawHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>BSK Employee Profile - ${emp.name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          body {
            font-family: 'Inter', 'Segoe UI', sans-serif;
            margin: 45px;
            color: #1e293b;
            font-size: 13px;
            line-height: 1.5;
            background-color: #ffffff;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px double #0f172a;
            padding-bottom: 12px;
            margin-bottom: 25px;
          }
          .org-title {
            font-size: 21px;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .org-subtitle {
            font-size: 11px;
            font-weight: 600;
            color: #475569;
            margin: 4px 0 0 0;
            letter-spacing: 1px;
          }
          .badge-record {
            font-size: 9px;
            font-weight: 800;
            background-color: #0f172a;
            color: #ffffff;
            padding: 4px 10px;
            border-radius: 4px;
            letter-spacing: 1px;
          }
          .profile-summary {
            display: flex;
            gap: 25px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 16px;
            border-radius: 12px;
            margin-bottom: 25px;
          }
          .summary-info {
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .summary-name {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 3px 0;
          }
          .summary-bn {
            font-size: 14px;
            color: #4f46e5;
            font-weight: 600;
            margin: 0 0 8px 0;
          }
          .summary-meta {
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .sec-title {
            font-size: 11px;
            font-weight: 800;
            color: #4f46e5;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            margin: 20px 0 12px 0;
          }
          .grid-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px 25px;
          }
          .info-item {
            display: flex;
            border-bottom: 1px dashed #e2e8f0;
            padding-bottom: 4px;
          }
          .info-lbl {
            width: 140px;
            font-weight: 600;
            color: #64748b;
          }
          .info-val {
            font-weight: 700;
            color: #0f172a;
            flex: 1;
          }
          .remarks-box {
            font-style: italic;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 12px;
            border-radius: 8px;
            margin-top: 10px;
          }
          .sign-area {
            margin-top: 70px;
            display: flex;
            justify-content: space-between;
          }
          .sign-line {
            width: 220px;
            border-top: 1.5px solid #0f172a;
            text-align: center;
            padding-top: 6px;
            font-size: 11px;
            font-weight: 700;
            color: #334155;
          }
          @media print {
            body {
              margin: 20px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div>
            <h1 class="org-title">Bishwo Sahitto Kendro</h1>
            <p class="org-subtitle">বিশ্ব সাহিত্য কেন্দ্র • Official Personnel Registry</p>
          </div>
          <div>
            <span class="badge-record">OFFICIAL RECORD</span>
          </div>
        </div>

        <div class="profile-summary">
          <div style="flex-shrink: 0;">
            ${photoContent}
          </div>
          <div class="summary-info">
            <h2 class="summary-name">${emp.name}</h2>
            <p class="summary-bn">${emp.nameBangla || ''}</p>
            <p class="summary-meta">${emp.currentPosition} &bull; ${emp.currentDepartment}</p>
            <div style="margin-top: 6px; display: flex; gap: 8px; align-items: center;">
              <span style="font-family: monospace; font-weight: 800; font-size: 11px; background: #0f172a; color: #fbbf24; padding: 3px 8px; border-radius: 4px; letter-spacing: 0.5px;">UID: ${formatEmployeeUid(emp)}</span>
              <span style="font-size: 10px; font-weight: 800; color: #d97706; text-transform: uppercase;">Status: ${emp.status}</span>
            </div>
          </div>
        </div>

        <h3 class="sec-title">📁 Job Placement Details / চাকুরীর বিবরণ</h3>
        <div class="grid-info">
          <div class="info-item">
            <div class="info-lbl">Serial No (SL):</div>
            <div class="info-val">${emp.sl || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-lbl">Job ID No (আইডি):</div>
            <div class="info-val" style="font-family: monospace;">${emp.jobId || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-lbl">UID (ইউনিক পার্সোনাল আইডি):</div>
            <div class="info-val" style="font-family: monospace; font-weight: 800; color: #4f46e5;">${formatEmployeeUid(emp)}</div>
          </div>
          <div class="info-item">
            <div class="info-lbl">Department (বিভাগ):</div>
            <div class="info-val">${emp.currentDepartment || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-lbl">Designation (পদবী):</div>
            <div class="info-val">${emp.currentPosition || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-lbl">Joining Date (যোগদানের তারিখ):</div>
            <div class="info-val" style="font-weight: 700; color: #0f172a;">${emp.joiningDate || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-lbl">Job Status:</div>
            <div class="info-val">${emp.status || '-'}</div>
          </div>
        </div>

        <h3 class="sec-title">👤 Personal Dossier / ব্যক্তিগত বিবরণ</h3>
        <div class="grid-info">
          <div class="info-item">
            <div class="info-lbl">Father's Name:</div>
            <div class="info-val">${emp.fatherName || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-lbl">Mother's Name:</div>
            <div class="info-val">${emp.motherName || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-lbl">Date of Birth:</div>
            <div class="info-val">${emp.dob || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-lbl">Nationality:</div>
            <div class="info-val">${emp.nationality || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-lbl">National ID (NID):</div>
            <div class="info-val" style="font-family: monospace; letter-spacing: 0.5px;">${emp.nid || '-'}</div>
          </div>
        </div>

        <h3 class="sec-title">🪙 Provident Fund & Nominee Assignment / পিএফ ও নমিনি</h3>
        <div class="grid-info">
          <div class="info-item">
            <div class="info-lbl">PF Account No (পিএফ হিসাব নং):</div>
            <div class="info-val" style="font-family: monospace; font-weight: 800; color: #4f46e5; background: #e0e7ff; padding: 2px 6px; border-radius: 4px; display: inline-block;">${emp.pfAcNo || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-lbl">Nominee Name:</div>
            <div class="info-val">${emp.nomineeName || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-lbl">Relation (সম্পর্ক):</div>
            <div class="info-val">${emp.relation || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-lbl">Nominee NID/BRC:</div>
            <div class="info-val" style="font-family: monospace;">${emp.nomineeNid || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-lbl">Share Percentage:</div>
            <div class="info-val" style="color: #ea580c;">${emp.share || '100%'}</div>
          </div>
          <div class="info-item">
            <div class="info-lbl">Minor Guardian:</div>
            <div class="info-val">${emp.minorOnBehalf || '-'}</div>
          </div>
        </div>

        ${emp.remarks ? `
          <h3 class="sec-title">📝 Observations & Remarks / মন্তব্য</h3>
          <div class="remarks-box">
            "${emp.remarks}"
          </div>
        ` : ''}

        <div class="sign-area">
          <div class="sign-line">
            Signature of Employee<br>
            <span style="font-weight: 500; font-size: 9px; color: #64748b;">(কর্মচারীর স্বাক্ষর)</span>
          </div>
          <div class="sign-line">
            Authorized Signatory<br>
            <span style="font-weight: 500; font-size: 9px; color: #64748b;">(অনুমোদনকারী কর্মকর্তার স্বাক্ষর)</span>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(rawHtml);
    printWindow.document.close();
  };

  // Submit Handler
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.jobId) {
      alert(lang === 'BN' ? "নাম এবং জব আইডি প্রদান করা আবশ্যক।" : "Name and Job ID are required.");
      return;
    }

    const docId = formMode === 'create' 
      ? `emp_${formData.jobId.replace(/\s+/g, '_')}` 
      : formId;

    // Combine DOB & Joining Dates
    const combinedDob = [formData.dobDay, formData.dobMonth, formData.dobYear].filter(Boolean).join('.');
    const combinedJoining = [formData.joiningDay, formData.joiningMonth, formData.joiningYear].filter(Boolean).join('.');
    const docJoiningYear = formData.joiningYear || (combinedJoining ? combinedJoining.split('.').pop() : '') || '2026';
    const generatedUid = `BSK.HR.PERSONNEL.${formData.jobId.trim()}.${docJoiningYear.trim()}`;

    const savedData: EmployeeEntry = {
      id: docId,
      uid: generatedUid,
      sl: formData.sl,
      name: formData.name,
      nameBangla: formData.nameBangla,
      fatherName: formData.fatherName,
      motherName: formData.motherName,
      dobDay: formData.dobDay,
      dobMonth: formData.dobMonth,
      dobYear: formData.dobYear,
      dob: combinedDob,
      currentPosition: formData.currentPosition,
      currentDepartment: formData.currentDepartment,
      jobId: formData.jobId,
      joiningDay: formData.joiningDay,
      joiningMonth: formData.joiningMonth,
      joiningYear: formData.joiningYear,
      joiningDate: combinedJoining,
      status: formData.status,
      nationality: formData.nationality,
      nid: formData.nid,
      nomineeName: formData.nomineeName,
      nomineeNid: formData.nomineeNid,
      relation: formData.relation,
      share: formData.share,
      minorOnBehalf: formData.minorOnBehalf,
      pfAcNo: formData.pfAcNo,
      remarks: formData.remarks,
      photoURL: imagePreview,
      createdBy: userProfile?.email || 'admin',
      createdByName: userProfile?.displayName || 'Admin',
      createdByEmail: userProfile?.email || 'admin@bskbd.org'
    };

    try {
      if (formMode === 'create') {
        await setDoc(doc(db, 'employees', docId), {
          ...savedData,
          createdAt: serverTimestamp()
        });
        if (logAction) {
          logAction('EMPLOYEE_CREATE', `Added Employee Profile: ${formData.name}`);
        }
      } else {
        // Use setDoc with merge: true to prevent errors if editing mock/seeded data not in DB yet
        await setDoc(doc(db, 'employees', docId), {
          ...savedData,
          updatedAt: serverTimestamp()
        }, { merge: true });
        if (logAction) {
          logAction('EMPLOYEE_EDIT', `Updated Employee Profile: ${formData.name}`);
        }
      }
      setIsFormModalOpen(false);
      alert(lang === 'BN' ? "কর্মকর্তা বা কর্মচারীর তথ্য সফলভাবে সংরক্ষণ করা হয়েছে!" : "Employee profile saved successfully!");
    } catch (error: any) {
      console.error("Error saving employee profile:", error);
      alert(lang === 'BN' 
        ? `সংরক্ষণ করতে ব্যর্থ হয়েছে। কারণ: ${error.message || 'অনুমতি নেই বা সংযোগ বিচ্ছিন্ন'}` 
        : `Failed to save employee profile. Error: ${error.message || 'Permission denied or offline'}`
      );
    }
  };

  // Filter Logic
  const activeEmployeeList = employees.length > 0 ? employees : INITIAL_EMPLOYEE_DATA;

  const handleSort = (field: keyof EmployeeEntry) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredEmployees = activeEmployeeList.filter(emp => {
    const empUid = formatEmployeeUid(emp).toLowerCase();
    const sTerm = searchTerm.toLowerCase();
    const matchesSearch = 
      emp.name.toLowerCase().includes(sTerm) ||
      emp.nameBangla.includes(searchTerm) ||
      emp.fatherName.toLowerCase().includes(sTerm) ||
      emp.motherName.toLowerCase().includes(sTerm) ||
      emp.jobId.toLowerCase().includes(sTerm) ||
      emp.nid.toLowerCase().includes(sTerm) ||
      emp.pfAcNo.toLowerCase().includes(sTerm) ||
      empUid.includes(sTerm);

    const matchesDept = selectedDept === 'all' || emp.currentDepartment === selectedDept;
    const matchesPosition = selectedPosition === 'all' || emp.currentPosition === selectedPosition;
    const matchesStatus = selectedStatus === 'all' || emp.status === selectedStatus;

    return matchesSearch && matchesDept && matchesPosition && matchesStatus;
  }).sort((a, b) => {
    let valA = a[sortField] || '';
    let valB = b[sortField] || '';

    // If it's the serial number (SL), do a numeric sort
    if (sortField === 'sl') {
      const numA = parseInt(a.sl) || 999;
      const numB = parseInt(b.sl) || 999;
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortOrder === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    }
    return 0;
  });

  // Export CSV helper
  const handleExportCSV = () => {
    const headers = [
      'UID', 'SL', 'Name of Employee', 'Name in Bangla', "Father's Name", "Mother's Name", 
      'DoB Day', 'DoB Month', 'DoB Year', 'Position', 'Department', 'Job ID', 
      'Joining Day', 'Joining Month', 'Joining Year', 'Status', 'Nationality', 
      'NID No', 'Nominee Name', 'Nominee NID', 'Relation', 'Share', 'PF Ac No', 'Remarks'
    ];

    const rows = filteredEmployees.map(emp => [
      formatEmployeeUid(emp), emp.sl, emp.name, emp.nameBangla, emp.fatherName, emp.motherName,
      emp.dobDay, emp.dobMonth, emp.dobYear, emp.currentPosition, emp.currentDepartment, emp.jobId,
      emp.joiningDay, emp.joiningMonth, emp.joiningYear, emp.status, emp.nationality,
      emp.nid, emp.nomineeName, emp.nomineeNid, emp.relation, emp.share, emp.pfAcNo, emp.remarks
    ]);

    const csvRows = [headers.join(',')];
    for (const row of rows) {
      const rowEscaped = row.map(val => `"${(val || '').toString().replace(/"/g, '""')}"`);
      csvRows.push(rowEscaped.join(','));
    }

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BSK_HR_Employee_Database_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" id="employees-container">
      {/* Banner / Header */}
      <div className="bg-[#0A111E] text-white p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
            <span className="text-3xl">👥</span>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wide uppercase text-white">
              {lang === 'BN' ? 'HR (হিউম্যান রিসোর্স)' : 'HR Database'}
            </h1>
            <p className="text-xs font-bold text-amber-500/80 uppercase tracking-widest mt-0.5">
              {lang === 'BN' ? 'কর্মকর্তা ও কর্মচারী ডাটাবেজ • ইউনিক পার্সোনাল আইডি (UID) ও প্রোফাইল' : 'Human Resources Registry • Personnel Profiles & Official UID'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {hasActionAccess('employees', 'create') && (
            <button
              onClick={() => handleOpenForm('create')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2.5 rounded-lg shadow-lg cursor-pointer transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-95"
            >
              <Plus size={14} />
              <span>{lang === 'BN' ? 'নতুন কর্মচারী যুক্ত করুন' : 'Add New Employee'}</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="bg-slate-800 hover:bg-slate-700 text-white font-black text-xs px-4 py-2.5 rounded-lg shadow-lg cursor-pointer transition-all flex items-center gap-2"
          >
            <Download size={14} />
            <span>{lang === 'BN' ? 'CSV এক্সপোর্ট' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Control Area: Search, Filters & View Toggles */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder={lang === 'BN' ? "নাম, বাবা/মা এর নাম, এনআইডি, পিএফ আইডি দিয়ে খুঁজুন..." : "Search by Name, Parents, NID, PF Ac, ID..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:bg-white focus:border-indigo-600 outline-none transition-all"
            />
          </div>

          {/* View Toggles */}
          <div className="flex items-center gap-2 border-l border-slate-200 pl-2">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${viewMode === 'table' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}
              title="Table View"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}
              title="Card View"
            >
              <Grid size={16} />
            </button>
          </div>
        </div>

        {/* Dropdowns Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              {lang === 'BN' ? 'বিভাগ (Department)' : 'Department'}
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer focus:border-indigo-600"
            >
              <option value="all">{lang === 'BN' ? 'সকল বিভাগ' : 'All Departments'}</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              {lang === 'BN' ? 'পদবী (Position)' : 'Position'}
            </label>
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer focus:border-indigo-600"
            >
              <option value="all">{lang === 'BN' ? 'সকল পদবী' : 'All Positions'}</option>
              {positions.map(post => (
                <option key={post} value={post}>{post}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              {lang === 'BN' ? 'স্ট্যাটাস (Status)' : 'Status'}
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer focus:border-indigo-600"
            >
              <option value="all">{lang === 'BN' ? 'সকল স্ট্যাটাস' : 'All Statuses'}</option>
              {statusList.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Lists Container */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-500 font-bold text-xs">{lang === 'BN' ? "লোড হচ্ছে..." : "Loading records..."}</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-xs">
          <span className="text-4xl block mb-3">⚠️</span>
          <h3 className="font-bold text-slate-800 text-sm mb-1">{lang === 'BN' ? "কোনো কর্মকর্তা বা কর্মচারী পাওয়া যায়নি" : "No employee records found"}</h3>
          <p className="text-xs text-slate-400">{lang === 'BN' ? "অনুগ্রহ করে আপনার ফিল্টার বা সার্চ কিওয়ার্ড চেক করুন।" : "Try refining your search keyword or clearing filters."}</p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black border-b border-slate-200">
                  <th className="py-3.5 px-4 text-center cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort('sl')}>
                    <div className="flex items-center justify-center gap-1">
                      <span>SL</span> <ArrowUpDown size={10} />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">{lang === 'BN' ? "ছবি" : "Photo"}</th>
                  <th className="py-3.5 px-4 cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">
                      <span>{lang === 'BN' ? "নাম (ইংলিশ)" : "Name"}</span> <ArrowUpDown size={10} />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">{lang === 'BN' ? "নাম (বাংলা)" : "Bangla Name"}</th>
                  <th className="py-3.5 px-4 cursor-pointer select-none hover:bg-slate-100" onClick={() => handleSort('jobId')}>
                    <div className="flex items-center gap-1">
                      <span>JOB ID</span> <ArrowUpDown size={10} />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">{lang === 'BN' ? "বিভাগ" : "Department"}</th>
                  <th className="py-3.5 px-4">{lang === 'BN' ? "পদবী" : "Position"}</th>
                  <th className="py-3.5 px-4">{lang === 'BN' ? "ইউনিক আইডি (UID)" : "Official UID"}</th>
                  <th className="py-3.5 px-4 text-center">{lang === 'BN' ? "অ্যাকশন" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-400 font-bold">{emp.sl}</td>
                    <td className="py-3 px-4">
                      {emp.photoURL ? (
                        <img 
                          src={emp.photoURL} 
                          alt={emp.name} 
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-xs border border-slate-200">
                          {emp.name.charAt(0)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button 
                        onClick={() => setSelectedEmployee(emp)}
                        className="text-indigo-600 hover:text-indigo-900 font-bold text-left cursor-pointer hover:underline"
                      >
                        {emp.name}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{emp.nameBangla || '-'}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{emp.jobId}</td>
                    <td className="py-3 px-4 text-slate-600">{emp.currentDepartment}</td>
                    <td className="py-3 px-4 text-slate-600">{emp.currentPosition}</td>
                    <td className="py-3 px-4 font-mono text-xs">
                      <div className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-800 font-bold px-2.5 py-1 rounded-md transition-all">
                        <span className="text-[#cca355] text-[10px]">🆔</span>
                        <span className="tracking-tight select-all">{formatEmployeeUid(emp)}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(formatEmployeeUid(emp));
                            setCopiedUid(emp.id);
                            setTimeout(() => setCopiedUid(null), 2000);
                          }}
                          className="text-slate-400 hover:text-amber-600 ml-1 p-0.5 rounded cursor-pointer"
                          title="Copy UID"
                        >
                          {copiedUid === emp.id ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedEmployee(emp)}
                          className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                          title="View Details"
                        >
                          <Eye size={13} />
                        </button>
                        {hasActionAccess('employees', 'edit') && (
                          <button
                            onClick={() => handleOpenForm('edit', emp)}
                            className="p-1 rounded text-amber-600 hover:text-amber-800 hover:bg-amber-50 cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                        {hasActionAccess('employees', 'delete') && (
                          <button
                            onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                            className="p-1 rounded text-red-600 hover:text-red-800 hover:bg-red-50 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => (
            <div 
              key={emp.id} 
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col gap-4 relative group"
            >
              <div className="flex gap-3.5">
                {emp.photoURL ? (
                  <img 
                    src={emp.photoURL} 
                    alt={emp.name} 
                    className="w-16 h-16 rounded-xl object-cover border border-slate-100 shrink-0 shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-xl border border-slate-200 shrink-0">
                    {emp.name.charAt(0)}
                  </div>
                )}
                <div className="space-y-1 overflow-hidden">
                  <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                    SL {emp.sl}
                  </span>
                  <h3 className="font-bold text-slate-900 leading-tight truncate">
                    <button 
                      onClick={() => setSelectedEmployee(emp)}
                      className="hover:text-indigo-600 cursor-pointer text-left"
                    >
                      {emp.name}
                    </button>
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 truncate">{emp.nameBangla}</p>
                  <p className="text-xs font-bold text-indigo-600">{emp.currentPosition}</p>
                </div>
              </div>

              {/* UID Pill */}
              <div className="bg-amber-50/80 border border-amber-200/70 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1 font-mono text-[10px] font-black text-slate-800 truncate">
                  <span className="text-amber-600">🆔</span>
                  <span className="truncate">{formatEmployeeUid(emp)}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(formatEmployeeUid(emp));
                    setCopiedUid(emp.id);
                    setTimeout(() => setCopiedUid(null), 2000);
                  }}
                  className="text-slate-400 hover:text-amber-600 p-0.5 rounded cursor-pointer shrink-0"
                  title="Copy UID"
                >
                  {copiedUid === emp.id ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] font-medium text-slate-500 border-t border-slate-100 pt-3">
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Department</span>
                  <span className="text-slate-800 font-bold">{emp.currentDepartment}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Job ID</span>
                  <span className="text-slate-800 font-bold font-mono">{emp.jobId}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Joining Date</span>
                  <span className="font-semibold text-slate-700">{emp.joiningDate || '-'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">PF A/C</span>
                  <span className="font-mono font-bold text-indigo-600">{emp.pfAcNo || '-'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-auto">
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{emp.status}</span>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setSelectedEmployee(emp)}
                    className="p-1 rounded bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                    title="View"
                  >
                    <Eye size={12} />
                  </button>
                  {hasActionAccess('employees', 'edit') && (
                    <button
                      onClick={() => handleOpenForm('edit', emp)}
                      className="p-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 size={12} />
                    </button>
                  )}
                  {hasActionAccess('employees', 'delete') && (
                    <button
                      onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                      className="p-1 rounded bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAILED INFORMATION SLIDE-OVER DRAWER */}
      <AnimatePresence>
        {selectedEmployee && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEmployee(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="relative w-full max-w-2xl h-full bg-slate-100 shadow-2xl border-l border-slate-200 overflow-hidden flex flex-col"
            >
              {/* Drawer Header */}
              <div className="bg-[#0A111E] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📋</span>
                  <div>
                    <h3 className="font-black text-sm tracking-wide uppercase">
                      {lang === 'BN' ? 'কর্মকর্তার সম্পূর্ণ পরিচিতি' : 'Employee Detailed Profile'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      Job ID: <span className="text-amber-400 font-black">{selectedEmployee.jobId}</span> | SL: {selectedEmployee.sl}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Print Button */}
                  <button
                    onClick={() => handlePrintProfile(selectedEmployee)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-950/20 transition-all"
                    title="Print Profile Sheet"
                  >
                    <Printer size={13} />
                    <span>{lang === 'BN' ? 'প্রিন্ট করুন' : 'Print Profile'}</span>
                  </button>

                  {/* Edit Button */}
                  {hasActionAccess('employees', 'edit') && (
                    <button
                      onClick={() => {
                        handleOpenForm('edit', selectedEmployee);
                        setSelectedEmployee(null);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-950/20 transition-all"
                    >
                      <Edit2 size={12} />
                      <span>{lang === 'BN' ? 'সম্পাদনা' : 'Edit'}</span>
                    </button>
                  )}

                  {/* Close Button */}
                  <button 
                    onClick={() => setSelectedEmployee(null)} 
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-bold bg-slate-800/50 p-2 rounded-lg"
                    title="Close"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Drawer Body - Simulated Paper Preview Sheet */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
                {/* Visual A4 Simulated Page */}
                <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xl relative mx-auto max-w-[100%] min-h-[950px] flex flex-col justify-between text-left">
                  
                  {/* Paper Header Decoration */}
                  <div>
                    <div className="border-b-4 border-double border-slate-800 pb-4 mb-6 flex justify-between items-center">
                      <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                          Bishwo Sahitto Kendro
                        </h1>
                        <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mt-0.5">
                          Official Personnel Registry
                        </p>
                      </div>
                      <span className="text-[9px] font-black bg-slate-900 text-white px-2 py-0.5 rounded tracking-wider uppercase">
                        Official Record
                      </span>
                    </div>

                    {/* Employee Profile Card Section */}
                    <div className="flex flex-col sm:flex-row gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200/60 mb-4">
                      <div className="shrink-0 mx-auto sm:mx-0">
                        {selectedEmployee.photoURL ? (
                          <img 
                            src={selectedEmployee.photoURL} 
                            alt={selectedEmployee.name} 
                            className="w-24 h-24 rounded-xl object-cover border border-slate-200 shadow-md bg-white"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-xl bg-indigo-50 text-indigo-400 flex items-center justify-center font-bold text-3xl border border-slate-200 shadow-inner bg-white">
                            {selectedEmployee.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 text-center sm:text-left self-center">
                        <h2 className="text-lg font-black text-slate-900 leading-tight">
                          {selectedEmployee.name}
                        </h2>
                        {selectedEmployee.nameBangla && (
                          <p className="text-sm font-bold text-indigo-600">{selectedEmployee.nameBangla}</p>
                        )}
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {selectedEmployee.currentPosition} &bull; {selectedEmployee.currentDepartment}
                        </p>
                        <div className="pt-1">
                          <span className="inline-block text-[9px] font-black bg-amber-500/10 text-amber-800 border border-amber-200/50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Status: {selectedEmployee.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Prominent Official Personnel UID Section */}
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                      <div>
                        <span className="text-[9px] font-black text-amber-800 uppercase tracking-widest block">
                          {lang === 'BN' ? 'ইউনিক পার্সোনাল আইডি (OFFICIAL UID)' : 'Official Personnel Unique ID (UID)'}
                        </span>
                        <div className="text-sm font-mono font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
                          <span className="text-amber-600 text-base">🆔</span>
                          <span className="bg-slate-900 text-amber-300 px-2.5 py-1 rounded-md text-xs font-mono select-all tracking-wide">
                            {formatEmployeeUid(selectedEmployee)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(formatEmployeeUid(selectedEmployee));
                          setCopiedUid(selectedEmployee.id);
                          setTimeout(() => setCopiedUid(null), 2000);
                        }}
                        className="bg-[#0A111E] hover:bg-slate-800 text-amber-400 font-black text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-all shrink-0"
                      >
                        {copiedUid === selectedEmployee.id ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                        <span>{copiedUid === selectedEmployee.id ? (lang === 'BN' ? 'কপি হয়েছে' : 'Copied') : (lang === 'BN' ? 'UID কপি করুন' : 'Copy UID')}</span>
                      </button>
                    </div>

                    {/* Job Placement Details */}
                    <div className="mb-6">
                      <h3 className="text-[10px] font-black text-indigo-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 mb-3 flex items-center gap-1.5">
                        <span>📁</span>
                        <span>{lang === 'BN' ? 'চাকুরী সংক্রান্ত বিবরণ' : 'Job Placement Details'}</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
                        <div className="flex border-b border-slate-100 pb-1">
                          <span className="w-32 text-slate-400 font-semibold">{lang === 'BN' ? 'ক্রমিক নং (SL):' : 'Serial No (SL):'}</span>
                          <span className="font-bold text-slate-800">{selectedEmployee.sl || '-'}</span>
                        </div>
                        <div className="flex border-b border-slate-100 pb-1">
                          <span className="w-32 text-slate-400 font-semibold">{lang === 'BN' ? 'জব আইডি নং:' : 'Job ID No:'}</span>
                          <span className="font-bold text-indigo-600 font-mono">{selectedEmployee.jobId || '-'}</span>
                        </div>
                        <div className="flex border-b border-slate-100 pb-1 md:col-span-2">
                          <span className="w-32 text-slate-400 font-semibold">{lang === 'BN' ? 'ইউনিক আইডি (UID):' : 'Official UID:'}</span>
                          <span className="font-bold text-amber-800 font-mono bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">{formatEmployeeUid(selectedEmployee)}</span>
                        </div>
                        <div className="flex border-b border-slate-100 pb-1">
                          <span className="w-32 text-slate-400 font-semibold">{lang === 'BN' ? 'পদবী:' : 'Designation:'}</span>
                          <span className="font-bold text-slate-800">{selectedEmployee.currentPosition || '-'}</span>
                        </div>
                        <div className="flex border-b border-slate-100 pb-1">
                          <span className="w-32 text-slate-400 font-semibold">{lang === 'BN' ? 'বিভাগ:' : 'Department:'}</span>
                          <span className="font-bold text-slate-800">{selectedEmployee.currentDepartment || '-'}</span>
                        </div>
                        <div className="flex border-b border-slate-100 pb-1 md:col-span-2">
                          <span className="w-32 text-slate-500 font-bold">{lang === 'BN' ? 'যোগদানের তারিখ:' : 'Joining Date:'}</span>
                          <span className="font-black text-slate-900 bg-amber-100/70 border border-amber-300 text-amber-950 px-2.5 py-0.5 rounded text-xs">
                            📅 {selectedEmployee.joiningDate || '-'}
                          </span>
                        </div>
                        <div className="flex border-b border-slate-100 pb-1">
                          <span className="w-32 text-slate-400 font-semibold">{lang === 'BN' ? 'চাকরির স্থিতি:' : 'Job Status:'}</span>
                          <span className="font-bold text-slate-800">{selectedEmployee.status || '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Personal Information */}
                    <div className="mb-6">
                      <h3 className="text-[10px] font-black text-indigo-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 mb-3 flex items-center gap-1.5">
                        <span>👤</span>
                        <span>{lang === 'BN' ? 'ব্যক্তিগত তথ্যসমূহ' : 'Personal Dossier'}</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
                        <div className="flex border-b border-slate-100 pb-1">
                          <span className="w-32 text-slate-400 font-semibold">{lang === 'BN' ? 'পিতার নাম:' : "Father's Name:"}</span>
                          <span className="font-bold text-slate-800">{selectedEmployee.fatherName || '-'}</span>
                        </div>
                        <div className="flex border-b border-slate-100 pb-1">
                          <span className="w-32 text-slate-400 font-semibold">{lang === 'BN' ? 'মাতার নাম:' : "Mother's Name:"}</span>
                          <span className="font-bold text-slate-800">{selectedEmployee.motherName || '-'}</span>
                        </div>
                        <div className="flex border-b border-slate-100 pb-1">
                          <span className="w-32 text-slate-400 font-semibold">{lang === 'BN' ? 'জন্ম তারিখ:' : 'Date of Birth:'}</span>
                          <span className="font-bold text-slate-800">{selectedEmployee.dob || '-'}</span>
                        </div>
                        <div className="flex border-b border-slate-100 pb-1">
                          <span className="w-32 text-slate-400 font-semibold">{lang === 'BN' ? 'জাতীয়তা:' : 'Nationality:'}</span>
                          <span className="font-bold text-slate-800">{selectedEmployee.nationality || '-'}</span>
                        </div>
                        <div className="flex border-b border-slate-100 pb-1 md:col-span-2">
                          <span className="w-32 text-slate-400 font-semibold">{lang === 'BN' ? 'এনআইডি নং:' : 'National ID (NID):'}</span>
                          <span className="font-bold text-slate-800 font-mono">{selectedEmployee.nid || '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* PF & Nominee Assignment */}
                    <div className="mb-6">
                      <div className="border-b border-slate-200 pb-1.5 mb-3 flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                          <span>🪙</span>
                          <span>{lang === 'BN' ? 'প্রোভিডেন্ট ফান্ড ও নমিনি বিবরণী' : 'Provident Fund & Nominee Details'}</span>
                        </h3>
                        <span className="text-[11px] font-bold font-mono bg-indigo-100 border border-indigo-300 text-indigo-900 px-2.5 py-1 rounded-md shadow-xs">
                          {lang === 'BN' ? 'পিএফ অ্যাকাউন্ট নং:' : 'PF A/C:'} <strong className="font-black">{selectedEmployee.pfAcNo || '-'}</strong>
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
                        <div className="flex border-b border-slate-100 pb-1">
                          <span className="w-32 text-slate-400 font-semibold">{lang === 'BN' ? 'নমিনির নাম:' : 'Nominee Name:'}</span>
                          <span className="font-bold text-slate-800">{selectedEmployee.nomineeName || '-'}</span>
                        </div>
                        <div className="flex border-b border-slate-100 pb-1">
                          <span className="w-32 text-slate-400 font-semibold">{lang === 'BN' ? 'সম্পর্ক:' : 'Relation:'}</span>
                          <span className="font-bold text-slate-800">{selectedEmployee.relation || '-'}</span>
                        </div>
                        <div className="flex border-b border-slate-100 pb-1">
                          <span className="w-32 text-slate-400 font-semibold">{lang === 'BN' ? 'নমিনি এনআইডি/বিআরসি:' : 'Nominee NID/BRC:'}</span>
                          <span className="font-bold text-slate-800 font-mono">{selectedEmployee.nomineeNid || '-'}</span>
                        </div>
                        <div className="flex border-b border-slate-100 pb-1">
                          <span className="w-32 text-slate-400 font-semibold">{lang === 'BN' ? 'শেয়ার শতাংশ:' : 'Share Percentage:'}</span>
                          <span className="font-bold text-amber-600">{selectedEmployee.share || '100%'}</span>
                        </div>
                        {selectedEmployee.minorOnBehalf && (
                          <div className="flex border-b border-slate-100 pb-1 md:col-span-2">
                            <span className="w-32 text-slate-400 font-semibold">{lang === 'BN' ? 'নাবালকের পক্ষে অভিভাবক:' : 'Minor Guardian:'}</span>
                            <span className="font-bold text-slate-800">{selectedEmployee.minorOnBehalf}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Remarks/Observations */}
                    {selectedEmployee.remarks && (
                      <div className="mb-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Remarks / মন্তব্য:</h4>
                        <p className="text-xs text-slate-700 leading-relaxed font-semibold italic bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                          "{selectedEmployee.remarks}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Paper Footer with Signature Lines */}
                  <div className="pt-10">
                    <div className="flex justify-between px-4">
                      <div className="w-48 border-t border-slate-800 text-center pt-1.5">
                        <span className="text-[10px] font-black text-slate-800 block">Signature of Employee</span>
                        <span className="text-[8px] font-semibold text-slate-400 block mt-0.5">(কর্মচারীর স্বাক্ষর)</span>
                      </div>
                      <div className="w-48 border-t border-slate-800 text-center pt-1.5">
                        <span className="text-[10px] font-black text-slate-800 block">Authorized Signatory</span>
                        <span className="text-[8px] font-semibold text-slate-400 block mt-0.5">(অনুমোদনকারী কর্মকর্তার স্বাক্ষর)</span>
                      </div>
                    </div>

                    {/* Metadata trace bar */}
                    <div className="text-[8px] text-slate-300 border-t border-slate-100 mt-8 pt-2 flex justify-between">
                      <span>Created by: {selectedEmployee.createdByName || 'System'}</span>
                      <span>Verified & Sealed Document Registry</span>
                    </div>
                  </div>

                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE / EDIT EMPLOYEE FORM MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#0A111E] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">👤</span>
                <div>
                  <h3 className="font-black text-sm tracking-wide uppercase">
                    {formMode === 'create' 
                      ? (lang === 'BN' ? 'নতুন কর্মচারী সংযোজন ফর্ম' : 'Add Employee Form') 
                      : (lang === 'BN' ? 'কর্মচারী তথ্য সংশোধন ফর্ম' : 'Edit Employee Profile')}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    BSK Integrated Personnel Registry
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsFormModalOpen(false)} 
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-bold bg-slate-800/50 p-1.5 rounded-md"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveForm} className="flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5 text-left text-xs">
                
                {/* Row 1: SL, Job ID, Photo Upload */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                      SL No.
                    </label>
                    <input
                      type="text"
                      value={formData.sl}
                      onChange={(e) => setFormData({ ...formData, sl: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                      Job ID No * (জব আইডি)
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.jobId}
                      onChange={(e) => setFormData({ ...formData, jobId: e.target.value })}
                      placeholder="e.g. 1002"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black outline-none focus:border-indigo-600"
                    />
                  </div>

                  {/* Photo Uploader */}
                  <div className="md:row-span-2 flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-2xl p-4 hover:bg-slate-50 transition-colors" onDragOver={handleDragOver} onDrop={handleDrop}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    
                    {imagePreview ? (
                      <div className="relative group">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-24 h-24 rounded-xl object-cover border border-slate-200 shadow-md"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setImagePreview('')}
                          className="absolute -top-1.5 -right-1.5 bg-red-600 text-white p-1 rounded-full text-[9px] font-bold shadow hover:bg-red-700 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-slate-600"
                      >
                        <div className="bg-slate-100 p-3 rounded-full mb-2">
                          <Camera size={18} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-center">
                          {isCompressing ? 'Compressing...' : 'Upload Image'}
                        </span>
                        <p className="text-[8px] text-slate-400 text-center mt-1">Drag & Drop or Click to browse</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Row 1.5: Name and Name Bangla */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                      Employee Name (English) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Md. Monir Hossain"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                      কর্মকর্তা/কর্মচারীর নাম (বাংলা)
                    </label>
                    <input
                      type="text"
                      value={formData.nameBangla}
                      onChange={(e) => setFormData({ ...formData, nameBangla: e.target.value })}
                      placeholder="মোঃ মনির হোসেন"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                {/* Section: Job Placement Details */}
                <div className="bg-indigo-50/20 rounded-xl p-4 border border-indigo-50/50 space-y-3">
                  <h4 className="text-[9px] font-black text-indigo-700 uppercase tracking-wider">Placement Details (চাকুরীর বিবরণ)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Department (বিভাগ)</label>
                      <input
                        type="text"
                        value={formData.currentDepartment}
                        onChange={(e) => setFormData({ ...formData, currentDepartment: e.target.value })}
                        placeholder="e.g. Admin / Accounts / Library"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Position / Designation (পদবী)</label>
                      <input
                        type="text"
                        value={formData.currentPosition}
                        onChange={(e) => setFormData({ ...formData, currentPosition: e.target.value })}
                        placeholder="e.g. Asst. Director / JD"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Status (স্ট্যাটাস)</label>
                      <input
                        type="text"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        placeholder="e.g. Implementation Staff"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  {/* Date of 1st Joining */}
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">1st Joining Date (যোগদানের তারিখ)</label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        placeholder="Day (DD)"
                        value={formData.joiningDay}
                        onChange={(e) => setFormData({ ...formData, joiningDay: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-center font-bold outline-none focus:border-indigo-600"
                        min="1" max="31"
                      />
                      <input
                        type="number"
                        placeholder="Month (MM)"
                        value={formData.joiningMonth}
                        onChange={(e) => setFormData({ ...formData, joiningMonth: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-center font-bold outline-none focus:border-indigo-600"
                        min="1" max="12"
                      />
                      <input
                        type="number"
                        placeholder="Year (YYYY)"
                        value={formData.joiningYear}
                        onChange={(e) => setFormData({ ...formData, joiningYear: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-center font-bold outline-none focus:border-indigo-600"
                        min="1950" max="2100"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Personal Background */}
                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-3">
                  <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-wider">Personal Background (ব্যক্তিগত তথ্যসমূহ)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Father's Name (পিতার নাম)</label>
                      <input
                        type="text"
                        value={formData.fatherName}
                        onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Mother's Name (মাতার নাম)</label>
                      <input
                        type="text"
                        value={formData.motherName}
                        onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Date of Birth (জন্ম তারিখ)</label>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          placeholder="Day"
                          value={formData.dobDay}
                          onChange={(e) => setFormData({ ...formData, dobDay: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-center font-bold outline-none focus:border-indigo-600"
                          min="1" max="31"
                        />
                        <input
                          type="number"
                          placeholder="Month"
                          value={formData.dobMonth}
                          onChange={(e) => setFormData({ ...formData, dobMonth: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-center font-bold outline-none focus:border-indigo-600"
                          min="1" max="12"
                        />
                        <input
                          type="number"
                          placeholder="Year"
                          value={formData.dobYear}
                          onChange={(e) => setFormData({ ...formData, dobYear: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-center font-bold outline-none focus:border-indigo-600"
                          min="1930" max="2100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Nationality</label>
                        <input
                          type="text"
                          value={formData.nationality}
                          onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold outline-none focus:border-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">NID No</label>
                        <input
                          type="text"
                          value={formData.nid}
                          onChange={(e) => setFormData({ ...formData, nid: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Provident Fund Nominees */}
                <div className="bg-amber-500/5 rounded-xl p-4 border border-amber-500/10 space-y-3">
                  <h4 className="text-[9px] font-black text-amber-800 uppercase tracking-wider">Provident Fund Details & Nominee (পিএফ এবং নমিনি)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">PF Account No. (পিএফ হিসাব নং)</label>
                      <input
                        type="text"
                        value={formData.pfAcNo}
                        onChange={(e) => setFormData({ ...formData, pfAcNo: e.target.value })}
                        placeholder="e.g. PF202412001"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Nominee Name (নমিনি)</label>
                      <input
                        type="text"
                        value={formData.nomineeName}
                        onChange={(e) => setFormData({ ...formData, nomineeName: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold outline-none focus:border-indigo-600"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                      <div className="col-span-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Nominee NID / BRC No.</label>
                        <input
                          type="text"
                          value={formData.nomineeNid}
                          onChange={(e) => setFormData({ ...formData, nomineeNid: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold outline-none focus:border-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Relation (সম্পর্ক)</label>
                        <input
                          type="text"
                          value={formData.relation}
                          onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                          placeholder="e.g. Wife / Son"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Share % (শেয়ার)</label>
                        <input
                          type="text"
                          value={formData.share}
                          onChange={(e) => setFormData({ ...formData, share: e.target.value })}
                          placeholder="100%"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold outline-none focus:border-indigo-600 text-center text-amber-700"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Minor Guardian (Name on behalf of minor)</label>
                        <input
                          type="text"
                          value={formData.minorOnBehalf}
                          onChange={(e) => setFormData({ ...formData, minorOnBehalf: e.target.value })}
                          placeholder="On behalf of minor / disabled nominee"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Remarks */}
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Remarks / Note (মন্তব্য)</label>
                  <textarea
                    rows={2}
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold outline-none focus:border-indigo-600 focus:bg-white resize-none"
                    placeholder="Enter special observations or notes..."
                  />
                </div>

                {/* Auto-Generated UID Preview Badge */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-black text-amber-800 uppercase tracking-widest block">
                      {lang === 'BN' ? 'অটো-জেনারেটেড ইউনিক পার্সোনাল আইডি (UID Preview)' : 'Auto-Generated Unique Personnel UID'}
                    </span>
                    <span className="text-xs font-mono font-black text-slate-900 mt-0.5 block">
                      BSK.HR.PERSONNEL.{formData.jobId.trim() || 'XXXX'}.{formData.joiningYear.trim() || 'YYYY'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded uppercase">
                    Auto Format
                  </span>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-5 py-2.5 rounded-lg cursor-pointer transition-all"
                >
                  {lang === 'BN' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-6 py-2.5 rounded-lg shadow-lg shadow-indigo-100 cursor-pointer transition-all"
                >
                  {formMode === 'create' 
                    ? (lang === 'BN' ? 'কর্মচারী সংরক্ষণ করুন' : 'Save Employee') 
                    : (lang === 'BN' ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-red-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-red-50 text-red-800 px-5 py-4 flex items-center gap-3 border-b border-red-100">
              <AlertCircle size={24} className="text-red-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold">
                  {lang === 'BN' ? 'রেকর্ড ডিলিট নিশ্চিতকরণ' : 'Confirm Record Deletion'}
                </h3>
                <p className="text-[10px] text-red-600 font-medium uppercase tracking-wider">
                  {lang === 'BN' ? 'এই অ্যাকশনটি পরিবর্তন করা সম্ভব নয়' : 'This action is irreversible'}
                </p>
              </div>
            </div>

            <div className="p-5 text-sm">
              <p className="text-slate-600 leading-relaxed mb-4">
                {lang === 'BN' ? (
                  <>
                    আপনি কি নিশ্চিতভাবে এই কর্মচারীর রেকর্ডটি ডিলিট করতে চান?
                    <br />
                    <strong className="text-red-600 font-semibold block mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-md font-mono text-xs text-left">
                      {deleteConfirm.name}
                    </strong>
                  </>
                ) : (
                  <>
                    Are you sure you want to permanently delete this employee record?
                    <br />
                    <strong className="text-red-600 font-semibold block mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-md font-mono text-xs text-left">
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
                  {lang === 'BN' ? 'বাতিল করুন' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteAction}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-sm shadow-red-200 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Trash2 size={13} />
                  <span>{lang === 'BN' ? 'নিশ্চিত করুন' : 'Yes, Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
