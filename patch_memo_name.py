import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix 1: generatedMemoNumber in useMemo
old_memo = """  const generatedMemoNumber = useMemo(() => {
    if (!currentMemoDeptVal || !currentMemoSubjectVal) return 'BSK...';
    const personSuffix = currentMemoPersonVal ? `.${currentMemoPersonVal}` : '';
    const rawMemoNumber = `স্মারক নং ${currentMemoDeptVal}.${currentMemoSubjectVal}${personSuffix}.${memoYear}.${currentMemoSIVal}`;
    return toBengali(rawMemoNumber);
  }, [currentMemoDeptVal, currentMemoSubjectVal, currentMemoPersonVal, memoYear, currentMemoSIVal]);"""

new_memo = """  const generatedMemoNumber = useMemo(() => {
    if (!currentMemoDeptVal || !currentMemoSubjectVal) return 'BSK...';
    const personSuffix = currentMemoPersonVal ? `.${currentMemoPersonVal}` : '';
    let rawMemoNumber = `স্মারক নং ${currentMemoDeptVal}.${currentMemoSubjectVal}${personSuffix}.${memoYear}.${currentMemoSIVal}`;
    if (memoPart && memoPart !== 'None') {
      rawMemoNumber += `(${memoPart})`;
    }
    return toBengali(rawMemoNumber);
  }, [currentMemoDeptVal, currentMemoSubjectVal, currentMemoPersonVal, memoYear, currentMemoSIVal, memoPart]);"""

text = text.replace(old_memo, new_memo)

# Fix 2: recomputedMemoNumber in handleSaveEdit
old_edit = """      const rawMemoNumber = `স্মারক নং ${finalDept}.${finalSubject}${personSuffix}.${memoYearVal}.${editSI}`;
      const recomputedMemoNumber = toBengali(rawMemoNumber);"""

new_edit = """      let rawMemoNumber = `স্মারক নং ${finalDept}.${finalSubject}${personSuffix}.${memoYearVal}.${editSI}`;
      if (editPart && editPart !== 'None') {
        rawMemoNumber += `(${editPart})`;
      }
      const recomputedMemoNumber = toBengali(rawMemoNumber);"""

text = text.replace(old_edit, new_edit)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
