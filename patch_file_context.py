import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add context state
context_state = """
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
    let rawFileName = `${currentDeptVal}.${currentSubjectVal}.${openingYear}-${fileContext.targetSI}`;
    if (part && part !== 'None') {
      rawFileName += `(${part})`;
    }
    return rawFileName;
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
    
    let targetSI = currentMemoSIVal;
    if (matches.length > 0) {
      targetSI = matches[0].si;
    }
    const existingParts = matches.map(m => m.part || 'None');
    return { targetSI, existingParts };
  }, [currentMemoDeptVal, currentMemoSubjectVal, memoYear, currentMemoSIVal, memos]);

  const generatedMemoNumber = useMemo(() => {
    if (!currentMemoDeptVal || !currentMemoSubjectVal) return 'BSK...';
    const personSuffix = currentMemoPersonVal ? `.${currentMemoPersonVal}` : '';
    let rawMemoNumber = `স্মারক নং ${currentMemoDeptVal}.${currentMemoSubjectVal}${personSuffix}.${memoYear}.${memoContext.targetSI}`;
    if (memoPart && memoPart !== 'None') {
      rawMemoNumber += `(${memoPart})`;
    }
    return toBengali(rawMemoNumber);
  }, [currentMemoDeptVal, currentMemoSubjectVal, currentMemoPersonVal, memoYear, memoContext.targetSI, memoPart]);
"""

# Find the block to replace
start_str = "  const currentDeptVal = isCustomDept ? customDept.trim().toUpperCase() : department.trim().toUpperCase();"
end_str = "  const generatedMemoNumber = useMemo(() => {"

# use regex to replace between start_str and end of generatedMemoNumber block
import re
pattern = re.compile(re.escape(start_str) + r".*?generatedMemoNumber = useMemo\(\(\) => \{.*?\}, \[.*?\]\);", re.DOTALL)
text = pattern.sub(context_state.strip(), text)

# Now in handleCreateFile, replace currentSIVal with fileContext.targetSI
text = text.replace("const finalSI = useAutoSI ? nextSI : manualSI.padStart(3, '0');", "const finalSI = fileContext.targetSI;")
text = text.replace("const finalSI = useMemoAutoSI ? nextMemoSI : manualMemoSI.padStart(3, '0');", "const finalSI = memoContext.targetSI;")

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
