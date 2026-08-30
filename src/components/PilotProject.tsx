import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  where
} from 'firebase/firestore';
import { 
  Plus, 
  Search, 
  Printer, 
  Edit, 
  Trash2, 
  X, 
  Download, 
  Building2, 
  GraduationCap, 
  BookOpen,
  FileText,
  Users, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MapPin,
  Phone,
  User,
  Filter,
  RefreshCw,
  Hash
} from 'lucide-react';
import { db } from '../firebase';
import { PilotProjectEntry, UserProfile } from '../types';
import { toBengaliNumerals } from '../utils/bengaliToWords';
import { PRIMARY_PILOT_BOOKS, SECONDARY_PILOT_BOOKS, PilotBookItem } from '../data/pilotBooksData';
import PilotChallanModal from './PilotChallanModal';
import { ComboboxInput } from './ComboboxInput';
import { 
  BD_DISTRICTS, 
  BD_UPAZILAS_BY_DISTRICT, 
  SAMPLE_INSTITUTIONS, 
  SAMPLE_EIINS, 
  SAMPLE_CODES, 
  SAMPLE_STUDENT_COUNTS 
} from '../data/bangladeshGeoData';
import { BD_ALL_SCHOOLS_DATABASE, SchoolEntry, getSchoolsForLocation } from '../data/bdSchoolsData';

interface PilotProjectProps {
  level: 'primary' | 'secondary' | 'madhyomik' | 'uchcho_madhyomik';
  userProfile: UserProfile | null;
  hasActionAccess?: (section: any, action: 'create' | 'edit' | 'delete') => boolean;
  logAction?: (action: string, details: string) => void;
  lang?: 'BN' | 'EN';
}

export default function PilotProject({
  level,
  userProfile,
  hasActionAccess,
  logAction,
  lang = 'BN'
}: PilotProjectProps) {
  // Normalize level
  const activeLevel: 'primary' | 'secondary' = (level === 'primary') ? 'primary' : 'secondary';
  
  const [projects, setProjects] = useState<PilotProjectEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<PilotProjectEntry | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<PilotProjectEntry | null>(null);
  const [selectedChallanProject, setSelectedChallanProject] = useState<PilotProjectEntry | null>(null);

  // Form Fields - Auto only Challan No, keep district/upazila/school blank by default
  const [challanNo, setChallanNo] = useState('০০০১');
  const [institutionName, setInstitutionName] = useState('');
  const [district, setDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const [eiin, setEiin] = useState('');
  const [codeNo, setCodeNo] = useState('');
  const [coordinatorName, setCoordinatorName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [studentCount, setStudentCount] = useState<number | string>('');
  const [allocatedBudget, setAllocatedBudget] = useState<number | string>('');
  const [spentAmount, setSpentAmount] = useState<number | string>('');
  const [status, setStatus] = useState<'active' | 'in_progress' | 'completed' | 'paused'>('active');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');

  // Books in modal
  const defaultBooks = activeLevel === 'primary' ? PRIMARY_PILOT_BOOKS : SECONDARY_PILOT_BOOKS;
  const [customBooks, setCustomBooks] = useState<PilotBookItem[]>(defaultBooks);

  const levelTitle = activeLevel === 'primary' 
    ? 'দেশব্যাপী বইপড়া কর্মসূচির পাইলট কার্যক্রম ২০২৬ (প্রাথমিক)' 
    : 'দেশব্যাপী বইপড়া কর্মসূচির পাইলট কার্যক্রম ২০২৬ (মাধ্যমিক)';

  const levelBadge = activeLevel === 'primary' ? '🏫 প্রাথমিক (Primary)' : '🎓 মাধ্যমিক (Secondary)';

  // Calculate default challan number based on existing count
  const getNextChallanNo = (currProjects: PilotProjectEntry[]) => {
    const nextNum = currProjects.length + 1;
    return toBengaliNumerals(nextNum.toString().padStart(4, '0'));
  };

  // Firestore Sync
  useEffect(() => {
    setLoading(true);
    // Support matching both 'primary' / 'secondary' and legacy 'madhyomik'
    const queryLevel = activeLevel === 'primary' ? 'primary' : 'secondary';
    
    const q = query(
      collection(db, 'pilot_projects'),
      where('level', 'in', activeLevel === 'primary' ? ['primary'] : ['secondary', 'madhyomik', 'uchcho_madhyomik']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: PilotProjectEntry[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as PilotProjectEntry);
      });
      setProjects(list);
      setLoading(false);
    }, (error) => {
      console.warn("Firestore query error on pilot_projects:", error);
      const local = localStorage.getItem(`local_pilot_projects_${activeLevel}`);
      if (local) {
        try {
          setProjects(JSON.parse(local));
        } catch (e) {
          setProjects([]);
        }
      } else {
        // Seed default sample if empty
        const sample: PilotProjectEntry = {
          id: 'sample-01',
          sl: '001',
          level: activeLevel,
          challanNo: '০০০১',
          institutionName: 'আগৈলঝাড়া বি. এইচ. পি. একাডেমী',
          district: 'বরিশাল',
          upazila: 'আগৈলঝাড়া',
          eiin: '100350',
          codeNo: '00002',
          coordinatorName: 'মো: রফিকুল ইসলাম',
          contactNumber: '01711000000',
          studentCount: activeLevel === 'primary' ? 50 : 120,
          allocatedBudget: 50000,
          spentAmount: 15000,
          status: 'active',
          startDate: new Date().toISOString().split('T')[0],
          remarks: 'পাইলট প্রজেক্ট চালান প্রস্তুত',
          customBooks: defaultBooks,
          totalBooks: defaultBooks.reduce((a, b) => a + (b.quantity || 0), 0),
          createdBy: 'admin'
        };
        setProjects([sample]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeLevel]);

  // Unique Districts for filtering
  const uniqueDistricts = useMemo(() => {
    const set = new Set<string>();
    projects.forEach(p => {
      if (p.district) set.add(p.district);
    });
    return Array.from(set).sort();
  }, [projects]);

  // Pre-aggregated suggestions for form comboboxes (type freely or select from dropdown)
  const districtOptions = useMemo(() => {
    const set = new Set<string>();
    BD_DISTRICTS.forEach(d => set.add(d));
    Object.keys(BD_UPAZILAS_BY_DISTRICT).forEach(d => set.add(d));
    projects.forEach(p => {
      if (p.district?.trim()) set.add(p.district.trim());
    });
    return Array.from(set);
  }, [projects]);

  const upazilaOptions = useMemo(() => {
    const set = new Set<string>();
    const normDist = district.trim();
    
    if (normDist) {
      // Find district key in BD_UPAZILAS_BY_DISTRICT (case-insensitive)
      const matchingKey = Object.keys(BD_UPAZILAS_BY_DISTRICT).find(
        k => k.trim().toLowerCase() === normDist.toLowerCase()
      );

      if (matchingKey && BD_UPAZILAS_BY_DISTRICT[matchingKey]) {
        BD_UPAZILAS_BY_DISTRICT[matchingKey].forEach(u => set.add(u));
      }
      
      // Also include upazilas from project entries matching this district
      projects.forEach(p => {
        if (p.district?.trim().toLowerCase() === normDist.toLowerCase() && p.upazila?.trim()) {
          set.add(p.upazila.trim());
        }
      });
    } else {
      // If NO district is chosen, list all upazilas
      Object.values(BD_UPAZILAS_BY_DISTRICT).flat().forEach(u => set.add(u));
    }
    return Array.from(set);
  }, [district, projects]);

  const institutionOptions = useMemo(() => {
    const options: { value: string; label: string; sub?: string }[] = [];
    const seenNames = new Set<string>();

    const addOption = (name: string, dist: string, upz: string, eiinNum?: string) => {
      if (!name || seenNames.has(name.trim().toLowerCase())) return;
      seenNames.add(name.trim().toLowerCase());
      const subInfo = [upz, dist, eiinNum ? `EIIN: ${eiinNum}` : ''].filter(Boolean).join(' • ');
      options.push({
        value: name,
        label: name,
        sub: subInfo || undefined
      });
    };

    const normDist = district.trim().toLowerCase();
    const normUpz = upazila.trim().toLowerCase();

    // 1. If district is specified, ONLY show schools belonging to that district!
    if (normDist) {
      const locSchools = getSchoolsForLocation(district, upazila);
      locSchools.forEach(s => addOption(s.name, s.district, s.upazila, s.eiin));

      // Also include user projects for this district
      projects.forEach(p => {
        if (p.institutionName && p.district?.trim().toLowerCase() === normDist) {
          if (!normUpz || p.upazila?.trim().toLowerCase() === normUpz) {
            addOption(p.institutionName, p.district || '', p.upazila || '', p.eiin || '');
          }
        }
      });
    } else {
      // If NO district selected, show nationwide database
      BD_ALL_SCHOOLS_DATABASE.forEach(s => addOption(s.name, s.district, s.upazila, s.eiin));
      projects.forEach(p => {
        if (p.institutionName) {
          addOption(p.institutionName, p.district || '', p.upazila || '', p.eiin || '');
        }
      });
    }

    return options;
  }, [district, upazila, projects]);

  const challanNoOptions = useMemo(() => {
    const set = new Set<string>();
    // Auto sequence suggestions ০০০১ - ০০৫০
    for (let i = 1; i <= Math.max(10, projects.length + 5); i++) {
      set.add(toBengaliNumerals(i.toString().padStart(4, '0')));
    }
    projects.forEach(p => {
      if (p.challanNo?.trim()) set.add(p.challanNo.trim());
    });
    return Array.from(set);
  }, [projects]);

  const eiinOptions = useMemo(() => {
    const set = new Set<string>();
    const normDist = district.trim().toLowerCase();
    
    if (normDist) {
      const locSchools = getSchoolsForLocation(district, upazila);
      locSchools.forEach(s => { if (s.eiin) set.add(s.eiin); });
      projects.forEach(p => {
        if (p.district?.trim().toLowerCase() === normDist && p.eiin?.trim()) {
          set.add(p.eiin.trim());
        }
      });
    } else {
      SAMPLE_EIINS.forEach(e => set.add(e));
      projects.forEach(p => {
        if (p.eiin?.trim()) set.add(p.eiin.trim());
      });
    }
    return Array.from(set);
  }, [district, upazila, projects]);

  const codeNoOptions = useMemo(() => {
    const set = new Set<string>();
    const normDist = district.trim().toLowerCase();
    
    if (normDist) {
      const locSchools = getSchoolsForLocation(district, upazila);
      locSchools.forEach(s => { if (s.codeNo) set.add(s.codeNo); });
      projects.forEach(p => {
        if (p.district?.trim().toLowerCase() === normDist && p.codeNo?.trim()) {
          set.add(p.codeNo.trim());
        }
      });
    } else {
      SAMPLE_CODES.forEach(c => set.add(c));
      projects.forEach(p => {
        if (p.codeNo?.trim()) set.add(p.codeNo.trim());
      });
    }
    return Array.from(set);
  }, [district, upazila, projects]);

  const coordinatorOptions = useMemo(() => {
    const set = new Set<string>([
      'মো: মনির হোসেন টিটো',
      'মো: আলাউদ্দিন সরকার',
      'মো: রফিকুল ইসলাম',
      'মাহমুদুল হাসান',
      'মো: কামরুল হাসান',
      'আব্দুর রহিম',
      'সাইফুল ইসলাম'
    ]);
    projects.forEach(p => {
      if (p.coordinatorName?.trim()) set.add(p.coordinatorName.trim());
    });
    return Array.from(set);
  }, [projects]);

  const contactOptions = useMemo(() => {
    const set = new Set<string>([
      '01711000000',
      '01819000000',
      '01912000000',
      '01611000000',
      '01552000000'
    ]);
    projects.forEach(p => {
      if (p.contactNumber?.trim()) set.add(p.contactNumber.trim());
    });
    return Array.from(set);
  }, [projects]);

  const studentCountOptions = useMemo(() => {
    return SAMPLE_STUDENT_COUNTS;
  }, []);

  // Smart Cascading Handlers
  const handleInstitutionChange = (val: string) => {
    setInstitutionName(val);
    if (!val.trim()) return;

    // 1. Search in location-specific or full BD schools database
    const locSchools = getSchoolsForLocation(district, upazila);
    let matched = locSchools.find(
      s => s.name.trim().toLowerCase() === val.trim().toLowerCase()
    );
    if (!matched) {
      matched = BD_ALL_SCHOOLS_DATABASE.find(
        s => s.name.trim().toLowerCase() === val.trim().toLowerCase()
      );
    }
    if (matched) {
      if (matched.district) setDistrict(matched.district);
      if (matched.upazila) setUpazila(matched.upazila);
      if (matched.eiin) setEiin(matched.eiin);
      if (matched.codeNo) setCodeNo(matched.codeNo);
      return;
    }

    // 2. Search in previous projects
    const matchedProject = projects.find(
      p => p.institutionName?.trim().toLowerCase() === val.trim().toLowerCase()
    );
    if (matchedProject) {
      if (matchedProject.district) setDistrict(matchedProject.district);
      if (matchedProject.upazila) setUpazila(matchedProject.upazila);
      if (matchedProject.eiin) setEiin(matchedProject.eiin);
      if (matchedProject.codeNo) setCodeNo(matchedProject.codeNo);
      if (matchedProject.coordinatorName && !coordinatorName) setCoordinatorName(matchedProject.coordinatorName);
      if (matchedProject.contactNumber && !contactNumber) setContactNumber(matchedProject.contactNumber);
      if (matchedProject.studentCount && !studentCount) setStudentCount(matchedProject.studentCount);
    }
  };

  const handleDistrictChange = (newDist: string) => {
    setDistrict(newDist);
    const matchingKey = Object.keys(BD_UPAZILAS_BY_DISTRICT).find(
      k => k.trim().toLowerCase() === newDist.trim().toLowerCase()
    );
    const validUpazilas = matchingKey ? BD_UPAZILAS_BY_DISTRICT[matchingKey] : [];
    
    // When district changes, if the current upazila is not in this new district, clear it so user can pick from the new district's upazilas!
    if (!validUpazilas.includes(upazila)) {
      setUpazila('');
    }
  };

  const handleUpazilaChange = (newUpz: string) => {
    setUpazila(newUpz);

    // If upazila was selected, auto set district if district is empty or mismatched
    if (newUpz.trim()) {
      for (const [dist, upzList] of Object.entries(BD_UPAZILAS_BY_DISTRICT)) {
        if (upzList.some(u => u.trim().toLowerCase() === newUpz.trim().toLowerCase())) {
          if (!district || !BD_UPAZILAS_BY_DISTRICT[district]?.includes(newUpz.trim())) {
            setDistrict(dist);
          }
          break;
        }
      }
    }
  };

  const handleEiinChange = (val: string) => {
    setEiin(val);
    if (!val.trim()) return;

    // Check if EIIN matches any school
    const locSchools = getSchoolsForLocation(district, upazila);
    let matched = locSchools.find(s => s.eiin === val.trim());
    if (!matched) {
      matched = BD_ALL_SCHOOLS_DATABASE.find(s => s.eiin === val.trim());
    }
    if (matched) {
      if (!institutionName) setInstitutionName(matched.name);
      if (matched.district) setDistrict(matched.district);
      if (matched.upazila) setUpazila(matched.upazila);
      if (matched.codeNo) setCodeNo(matched.codeNo);
    }
  };

  // Filtered list
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchSearch = 
        (p.institutionName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.district || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.upazila || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.coordinatorName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.eiin || '').includes(searchQuery) ||
        (p.codeNo || '').includes(searchQuery) ||
        (p.challanNo || '').includes(searchQuery) ||
        (p.contactNumber || '').includes(searchQuery);

      const matchDistrict = districtFilter === 'all' || p.district === districtFilter;
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;

      return matchSearch && matchDistrict && matchStatus;
    });
  }, [projects, searchQuery, districtFilter, statusFilter]);

  // KPI calculations
  const stats = useMemo(() => {
    const totalInst = filteredProjects.length;
    const totalStudents = filteredProjects.reduce((acc, curr) => acc + (Number(curr.studentCount) || 0), 0);
    const totalBooksAllocated = filteredProjects.reduce((acc, curr) => {
      const count = curr.totalBooks || (curr.customBooks ? curr.customBooks.reduce((a, b) => a + (b.quantity || 0), 0) : (activeLevel === 'primary' ? 50 : 120));
      return acc + count;
    }, 0);
    const totalSpent = filteredProjects.reduce((acc, curr) => acc + (Number(curr.spentAmount) || 0), 0);
    return { totalInst, totalStudents, totalBooksAllocated, totalSpent };
  }, [filteredProjects, activeLevel]);

  // Reset form
  const resetForm = () => {
    setChallanNo(getNextChallanNo(projects));
    setInstitutionName('');
    setDistrict('');
    setUpazila('');
    setEiin('');
    setCodeNo('');
    setCoordinatorName('');
    setContactNumber('');
    setStudentCount(activeLevel === 'primary' ? 50 : 120);
    setAllocatedBudget('');
    setSpentAmount('');
    setStatus('active');
    setStartDate(new Date().toISOString().split('T')[0]);
    setRemarks('');
    setFormError('');
    setCustomBooks(defaultBooks);
    setEditingProject(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (proj: PilotProjectEntry) => {
    setEditingProject(proj);
    setChallanNo(proj.challanNo || getNextChallanNo(projects));
    setInstitutionName(proj.institutionName || '');
    setDistrict(proj.district || '');
    setUpazila(proj.upazila || '');
    setEiin(proj.eiin || '');
    setCodeNo(proj.codeNo || '');
    setCoordinatorName(proj.coordinatorName || '');
    setContactNumber(proj.contactNumber || '');
    setStudentCount(proj.studentCount ?? (activeLevel === 'primary' ? 50 : 120));
    setAllocatedBudget(proj.allocatedBudget ?? '');
    setSpentAmount(proj.spentAmount ?? '');
    setStatus(proj.status || 'active');
    setStartDate(proj.startDate || new Date().toISOString().split('T')[0]);
    setRemarks(proj.remarks || '');
    setCustomBooks(proj.customBooks && proj.customBooks.length > 0 ? proj.customBooks : defaultBooks);
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleBookQuantityChange = (index: number, val: number) => {
    const updated = [...customBooks];
    updated[index] = { ...updated[index], quantity: Math.max(0, val) };
    setCustomBooks(updated);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!institutionName.trim()) {
      setFormError('শিক্ষা প্রতিষ্ঠানের নাম পূরণ করা আবশ্যক');
      return;
    }

    const calculatedTotalBooks = customBooks.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

    const payload = {
      level: activeLevel,
      sl: editingProject ? editingProject.sl : (projects.length + 1).toString().padStart(3, '0'),
      challanNo: challanNo.trim() || '০০০১',
      institutionName: institutionName.trim(),
      district: district.trim(),
      upazila: upazila.trim(),
      eiin: eiin.trim(),
      codeNo: codeNo.trim(),
      coordinatorName: coordinatorName.trim(),
      contactNumber: contactNumber.trim(),
      studentCount: Number(studentCount) || 0,
      allocatedBudget: Number(allocatedBudget) || 0,
      spentAmount: Number(spentAmount) || 0,
      status,
      startDate,
      remarks: remarks.trim(),
      customBooks,
      totalBooks: calculatedTotalBooks,
      createdBy: userProfile?.uid || 'system',
      createdByName: userProfile?.displayName || userProfile?.email || 'Admin',
      createdByEmail: userProfile?.email || ''
    };

    try {
      if (editingProject) {
        await updateDoc(doc(db, 'pilot_projects', editingProject.id), payload);
        if (logAction) logAction('PILOT_PROJECT_EDIT', `Updated pilot project: ${institutionName} (${activeLevel})`);
      } else {
        await addDoc(collection(db, 'pilot_projects'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        if (logAction) logAction('PILOT_PROJECT_CREATE', `Created pilot project: ${institutionName} (${activeLevel})`);
      }

      // Also sync to localStorage as instant offline fallback
      const updatedList = editingProject 
        ? projects.map(p => p.id === editingProject.id ? { ...p, ...payload } : p)
        : [{ id: `local-${Date.now()}`, ...payload }, ...projects];
      localStorage.setItem(`local_pilot_projects_${activeLevel}`, JSON.stringify(updatedList));

      setIsAddModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error("Save error:", err);
      // Fallback local update
      const updatedList = editingProject 
        ? projects.map(p => p.id === editingProject.id ? { ...p, ...payload } : p)
        : [{ id: `local-${Date.now()}`, ...payload }, ...projects];
      setProjects(updatedList as any);
      localStorage.setItem(`local_pilot_projects_${activeLevel}`, JSON.stringify(updatedList));
      setIsAddModalOpen(false);
      resetForm();
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'pilot_projects', id));
      if (logAction) logAction('PILOT_PROJECT_DELETE', `Deleted pilot project id: ${id}`);
      
      const updated = projects.filter(p => p.id !== id);
      setProjects(updated);
      localStorage.setItem(`local_pilot_projects_${activeLevel}`, JSON.stringify(updated));
      setDeleteConfirmTarget(null);
    } catch (err) {
      console.error("Delete error:", err);
      const updated = projects.filter(p => p.id !== id);
      setProjects(updated);
      localStorage.setItem(`local_pilot_projects_${activeLevel}`, JSON.stringify(updated));
      setDeleteConfirmTarget(null);
    }
  };

  const handleExportCSV = () => {
    if (filteredProjects.length === 0) return;
    const headers = ['SL', 'Challan No', 'Institution Name', 'District', 'Upazila', 'EIIN', 'Code No', 'Total Books', 'Student Count', 'Status', 'Date'];
    const csvRows = [headers.join(',')];

    for (const p of filteredProjects) {
      const values = [
        `"${p.sl}"`,
        `"${p.challanNo || ''}"`,
        `"${p.institutionName.replace(/"/g, '""')}"`,
        `"${p.district}"`,
        `"${p.upazila}"`,
        `"${p.eiin || ''}"`,
        `"${p.codeNo || ''}"`,
        `"${p.totalBooks || (activeLevel === 'primary' ? 50 : 120)}"`,
        `"${p.studentCount}"`,
        `"${p.status}"`,
        `"${p.startDate}"`
      ];
      csvRows.push(values.join(','));
    }

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Pilot_Project_${activeLevel}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'active':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1"><CheckCircle2 size={11} /> চালান সরবরাহকৃত</span>;
      case 'in_progress':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1"><Clock size={11} /> প্রক্রিয়াকরণ</span>;
      case 'completed':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1"><CheckCircle2 size={11} /> বিতরণ সম্পন্ন</span>;
      case 'paused':
        return <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1"><AlertCircle size={11} /> স্থগিত</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{st}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6" id="pilot-project-container">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 bg-amber-500/10 text-amber-800 rounded-2xl border border-amber-200 shrink-0 shadow-xs">
            {activeLevel === 'primary' ? <Building2 size={30} /> : <GraduationCap size={30} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full">
                বিশ্বসাহিত্য কেন্দ্র • পাইলট প্রজেক্ট
              </span>
              <span className="text-xs font-black text-slate-700">
                {levelBadge}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              {levelTitle}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              শিক্ষা প্রতিষ্ঠানে বই সরবরাহের চালান ও শ্রেণিভিত্তিক বই বিতরণ রেজিস্টার (পাইলট ২০২৬)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="CSV এক্সপোর্ট"
          >
            <Download size={15} />
            <span>এক্সপোর্ট CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="তালিকা প্রিন্ট করুন"
          >
            <Printer size={15} />
            <span>তালিকা প্রিন্ট</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="bg-[#0A111E] hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer hover:shadow-lg active:scale-95"
          >
            <Plus size={16} className="text-amber-400 font-black" />
            <span>নতুন চালান / প্রতিষ্ঠান যোগ</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase block tracking-wider">মোট প্রতিষ্ঠান</span>
            <span className="text-2xl font-black text-slate-800 mt-1 block">
              {toBengaliNumerals(stats.totalInst.toString())} টি
            </span>
            <span className="text-[10px] text-indigo-600 font-bold mt-1 inline-block">
              আওতাধীন শিক্ষা প্রতিষ্ঠান
            </span>
          </div>
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl border border-indigo-100">
            <Building2 size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase block tracking-wider">মোট সরবরাহকৃত বই</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">
              {toBengaliNumerals(stats.totalBooksAllocated.toLocaleString('bn-BD'))} কপি
            </span>
            <span className="text-[10px] text-amber-700 font-bold mt-1 inline-block">
              চালানের শ্রেণিভিত্তিক বই
            </span>
          </div>
          <div className="bg-amber-50 text-amber-600 p-3 rounded-2xl border border-amber-100">
            <BookOpen size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase block tracking-wider">মোট শিক্ষার্থী</span>
            <span className="text-2xl font-black text-slate-800 mt-1 block">
              {toBengaliNumerals(stats.totalStudents.toLocaleString('bn-BD'))} জন
            </span>
            <span className="text-[10px] text-emerald-600 font-bold mt-1 inline-block">
              অংশগ্রহণকারী পাঠক শিক্ষার্থী
            </span>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl border border-emerald-100">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase block tracking-wider">বইয়ের মাস্টার তালিকা</span>
            <span className="text-2xl font-black text-blue-600 mt-1 block">
              {toBengaliNumerals(defaultBooks.length.toString())} টি বই
            </span>
            <span className="text-[10px] text-blue-700 font-bold mt-1 inline-block">
              {activeLevel === 'primary' ? '১ম থেকে ৫ম শ্রেণি' : '৬ষ্ঠ থেকে ১০ম শ্রেণি'}
            </span>
          </div>
          <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl border border-blue-100">
            <FileText size={24} />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 flex flex-col gap-4">
        {/* Filter Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="প্রতিষ্ঠান, চালান নং, EIIN, কোড, জেলা বা উপজেলা..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold focus:border-amber-500 focus:bg-white outline-none transition text-slate-800"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            {/* District Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500">জেলা:</span>
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all">সকল জেলা</option>
                {uniqueDistricts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500">অবস্থা:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all">সকল অবস্থা</option>
                <option value="active">চালান সরবরাহকৃত</option>
                <option value="in_progress">প্রক্রিয়াকরণ</option>
                <option value="completed">বিতরণ সম্পন্ন</option>
                <option value="paused">স্থগিত</option>
              </select>
            </div>

            {/* Reset Filters button */}
            {(searchQuery || districtFilter !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDistrictFilter('all');
                  setStatusFilter('all');
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="সকল ফিল্টার রিসেট করুন"
              >
                <X size={13} />
                <span>রিসেট</span>
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
                <th className="p-3 text-center w-12">ক্র.নং</th>
                <th className="p-3 w-28">চালান নম্বর</th>
                <th className="p-3 w-64">শিক্ষা প্রতিষ্ঠানের নাম</th>
                <th className="p-3 w-40">উপজেলা ও জেলা</th>
                <th className="p-3 w-32">EIIN / Code</th>
                <th className="p-3 text-center w-28">বই সংখ্যা</th>
                <th className="p-3 text-right w-24">শিক্ষার্থী</th>
                <th className="p-3 text-center w-28">অবস্থা</th>
                <th className="p-3 text-center w-48">চালান ও অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="animate-spin text-amber-500" size={18} />
                      <span className="font-semibold text-xs">ডাটা লোড হচ্ছে...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building2 size={32} className="text-slate-300" />
                      <p className="font-bold text-slate-600 text-sm">কোনো শিক্ষা প্রতিষ্ঠানের চালান পাওয়া যায়নি</p>
                      <p className="text-[11px] text-slate-400">নতুন চালান প্রস্তুত করতে "নতুন চালান / প্রতিষ্ঠান যোগ" বাটনে ক্লিক করুন</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((item, idx) => {
                  const bookCount = item.totalBooks || (item.customBooks ? item.customBooks.reduce((a, b) => a + (b.quantity || 0), 0) : (activeLevel === 'primary' ? 50 : 120));
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center font-mono text-slate-400 font-bold">
                        {toBengaliNumerals((idx + 1).toString().padStart(2, '0'))}
                      </td>
                      <td className="p-3 font-bold text-slate-700">
                        <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-mono text-slate-800 font-bold">
                          {toBengaliNumerals(item.challanNo || '০০০১')}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-800">
                        <div className="text-sm font-black text-slate-800">{item.institutionName}</div>
                        {item.remarks && (
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5 truncate max-w-xs" title={item.remarks}>
                            {item.remarks}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-slate-600">
                        <div className="font-semibold text-slate-800">{item.upazila || '—'}</div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                          <MapPin size={11} className="text-amber-500 shrink-0" />
                          <span>{item.district || '—'}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-700 font-mono text-xs">
                        {item.eiin && <div>EIIN: <span className="font-bold text-slate-900">{item.eiin}</span></div>}
                        {item.codeNo && <div className="text-[10px] text-slate-500">Code: {item.codeNo}</div>}
                        {!item.eiin && !item.codeNo && <span className="text-slate-400">—</span>}
                      </td>
                      <td className="p-3 text-center font-black text-amber-700 font-mono">
                        <span className="bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg text-xs font-bold">
                          {toBengaliNumerals(bookCount.toString())} কপি
                        </span>
                      </td>
                      <td className="p-3 text-right font-black text-slate-800 font-mono">
                        {toBengaliNumerals(item.studentCount ? item.studentCount.toString() : '০')} জন
                      </td>
                      <td className="p-3 text-center">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View & Print Challan Button */}
                          <button
                            onClick={() => setSelectedChallanProject(item)}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer shadow-xs"
                            title="বই সরবরাহের চালান ভিউ ও প্রিন্ট"
                          >
                            <Printer size={13} />
                            <span>চালান</span>
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                            title="তথ্য সম্পাদনা করুন"
                          >
                            <Edit size={13} />
                            <span>এডিট</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeleteConfirmTarget(item)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 p-1.5 rounded-lg font-bold text-[11px] transition flex items-center justify-center cursor-pointer"
                            title="রেকর্ড মুছে ফেলুন"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[92vh] flex flex-col my-auto animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-500/10 text-amber-700 rounded-xl">
                  {editingProject ? <Edit size={18} /> : <Plus size={18} />}
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {editingProject ? 'শিক্ষা প্রতিষ্ঠান ও চালান সম্পাদনা' : `নতুন চালান ও প্রতিষ্ঠান এন্ট্রি (${activeLevel === 'primary' ? 'প্রাথমিক' : 'মাধ্যমিক'})`}
                  </h3>
                  <p className="text-[11px] text-slate-400">এক্সেল ফরম্যাট অনুযায়ী চালান এবং বইয়ের বিস্তারিত তালিকা সংরক্ষণ করুন</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveProject} className="space-y-4 text-xs flex-1 overflow-y-auto pr-1">
              {/* Row 1: Challan No, District & Upazila */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <ComboboxInput
                    label="বই সরবরাহের চালান নম্বর"
                    required
                    placeholder="যেমন: ০০০১"
                    value={challanNo}
                    onChange={setChallanNo}
                    options={challanNoOptions}
                    mono
                    helperText="স্বয়ংক্রিয় ক্রমিক চালান নম্বর"
                  />
                </div>

                <div>
                  <ComboboxInput
                    label="জেলা"
                    placeholder="যেমন: ভোলা / টাঙ্গাইল / রংপুর"
                    value={district}
                    onChange={handleDistrictChange}
                    options={districtOptions}
                  />
                </div>

                <div>
                  <ComboboxInput
                    label="উপজেলা"
                    placeholder="উপজেলা নির্বাচন করুন বা লিখুন"
                    value={upazila}
                    onChange={handleUpazilaChange}
                    options={upazilaOptions}
                    helperText={district ? `${district} জেলার উপজেলাসমূহ` : undefined}
                  />
                </div>
              </div>

              {/* Row 2: Institution Name, EIIN & Code No */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <ComboboxInput
                    label="প্রতিষ্ঠানের নাম"
                    required
                    placeholder="স্কুলের নাম নির্বাচন করুন বা লিখুন"
                    value={institutionName}
                    onChange={handleInstitutionChange}
                    options={institutionOptions}
                    helperText={upazila ? `${upazila} উপজেলার স্কুলসমূহ` : (district ? `${district} জেলার স্কুলসমূহ` : undefined)}
                  />
                </div>

                <div>
                  <ComboboxInput
                    label="EIIN"
                    placeholder="যেমন: 114480"
                    value={eiin}
                    onChange={handleEiinChange}
                    options={eiinOptions}
                    mono
                  />
                </div>

                <div>
                  <ComboboxInput
                    label="Code No"
                    placeholder="যেমন: 01904"
                    value={codeNo}
                    onChange={setCodeNo}
                    options={codeNoOptions}
                    mono
                  />
                </div>
              </div>

              {/* Row 3: Coordinator & Contact & Student Count */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <ComboboxInput
                    label="সমন্বয়ক / দায়িত্বপ্রাপ্ত কর্মকর্তা"
                    placeholder="কর্মকর্তার নাম"
                    value={coordinatorName}
                    onChange={setCoordinatorName}
                    options={coordinatorOptions}
                  />
                </div>

                <div>
                  <ComboboxInput
                    label="যোগাযোগ নম্বর"
                    placeholder="০১৭xxxxxxxx"
                    value={contactNumber}
                    onChange={setContactNumber}
                    options={contactOptions}
                    mono
                  />
                </div>

                <div>
                  <ComboboxInput
                    label="শিক্ষার্থী সংখ্যা"
                    placeholder={activeLevel === 'primary' ? '৫০' : '১২০'}
                    value={studentCount.toString()}
                    onChange={(val) => setStudentCount(val)}
                    options={studentCountOptions}
                    mono
                  />
                </div>
              </div>

              {/* Book List Breakdown in Form */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <BookOpen size={14} className="text-amber-600" />
                    <span>
                      {activeLevel === 'primary' 
                        ? 'চালানের বইয়ের তালিকা (২৫টি শিরোনাম / ৫০ কপি বই):' 
                        : 'চালানের বইয়ের তালিকা (৪৮টি শিরোনাম / ১২০ কপি বই):'}
                    </span>
                  </label>
                  <span className="text-xs font-black text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                    মোট বই: {customBooks.reduce((a, b) => a + (Number(b.quantity) || 0), 0)} কপি
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 divide-y divide-slate-200/60">
                  {customBooks.map((b, idx) => (
                    <div key={idx} className="py-1 px-2 flex items-center justify-between gap-2 hover:bg-white rounded transition">
                      <div className="flex items-center gap-2 text-slate-700 min-w-0">
                        <span className="font-mono text-slate-400 text-[10px] w-5">{b.sl}.</span>
                        <span className="bg-slate-200 text-slate-800 font-bold px-1.5 py-0.2 rounded text-[10px] shrink-0">{b.class}</span>
                        <span className="font-semibold truncate text-xs">{b.title}</span>
                        {b.author && <span className="text-[10px] text-slate-400 truncate hidden sm:inline">({b.author})</span>}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-slate-400">সংখ্যা:</span>
                        <input
                          type="number"
                          min="0"
                          value={b.quantity}
                          onChange={(e) => handleBookQuantityChange(idx, parseInt(e.target.value) || 0)}
                          className="w-14 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-center font-mono font-bold text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wide">চালানের অবস্থা</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold focus:border-amber-500 focus:bg-white outline-none transition cursor-pointer"
                  >
                    <option value="active">চালান সরবরাহকৃত</option>
                    <option value="in_progress">প্রক্রিয়াকরণ</option>
                    <option value="completed">বিতরণ সম্পন্ন</option>
                    <option value="paused">স্থগিত</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wide">তারিখ</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold focus:border-amber-500 focus:bg-white outline-none transition cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wide">মন্তব্য / নোট</label>
                <textarea
                  rows={2}
                  placeholder="চালান সংক্রান্ত বিশেষ নোট..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold focus:border-amber-500 focus:bg-white outline-none transition resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0A111E] hover:bg-slate-800 text-white font-bold rounded-xl transition shadow-md cursor-pointer"
                >
                  {editingProject ? 'আপডেট করুন' : 'সংরক্ষণ ও চালান প্রস্তুত'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[220] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">আপনি কি নিশ্চিত?</h3>
              <p className="text-xs text-slate-500 mt-1">
                <strong>{deleteConfirmTarget.institutionName}</strong> প্রতিষ্ঠানটির চালান রেকর্ড ডিলিট করা হবে।
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                onClick={() => handleDeleteProject(deleteConfirmTarget.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
              >
                হ্যাঁ, ডিলিট করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1:1 Excel Style Printable Challan Modal */}
      {selectedChallanProject && (
        <PilotChallanModal
          project={selectedChallanProject}
          onClose={() => setSelectedChallanProject(null)}
        />
      )}
    </div>
  );
}
