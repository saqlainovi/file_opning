import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add states
state_code = """  const [files, setFiles] = useState<FileEntry[]>([]);
  const [fileSortOrder, setFileSortOrder] = useState<'asc' | 'desc'>('desc');
  const [memos, setMemos] = useState<MemoEntry[]>([]);
  const [memoSortOrder, setMemoSortOrder] = useState<'asc' | 'desc'>('desc');"""

text = text.replace(
    "  const [files, setFiles] = useState<FileEntry[]>([]);\n  const [memos, setMemos] = useState<MemoEntry[]>([]);",
    state_code
)

# 2. Update filteredFiles
old_filteredFiles = """  const filteredFiles = useMemo(() => {
    return files.filter(f => {
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
  }, [files, searchQuery, selectedDepts, selectedSubjects, selectedYears, selectedPeople, selectedDesignations]);"""

new_filteredFiles = """  const filteredFiles = useMemo(() => {
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
  }, [files, searchQuery, selectedDepts, selectedSubjects, selectedYears, selectedPeople, selectedDesignations, fileSortOrder]);"""

text = text.replace(old_filteredFiles, new_filteredFiles)

# 3. Update filteredMemos
old_filteredMemos = """  const filteredMemos = useMemo(() => {
    return memos.filter(m => {
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
  }, [memos, memoSearchQuery, selectedMemoDepts, selectedMemoSubjects, selectedMemoPeople, selectedMemoDesignations, selectedMemoReceivers]);"""

new_filteredMemos = """  const filteredMemos = useMemo(() => {
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
  }, [memos, memoSearchQuery, selectedMemoDepts, selectedMemoSubjects, selectedMemoPeople, selectedMemoDesignations, selectedMemoReceivers, memoSortOrder]);"""

text = text.replace(old_filteredMemos, new_filteredMemos)


with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
