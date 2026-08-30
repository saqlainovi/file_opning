import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix 1: generatedFileName in useMemo
old_memo = """  const generatedFileName = useMemo(() => {
    if (!currentDeptVal || !currentSubjectVal) return 'BSK...';
    const personSuffix = currentPersonVal ? `.${currentPersonVal}` : '';
    const rawFileName = `${currentDeptVal}.${currentSubjectVal}${personSuffix}.${openingYear}-${currentSIVal}`;
    return rawFileName;
  }, [currentDeptVal, currentSubjectVal, currentPersonVal, openingYear, currentSIVal]);"""

new_memo = """  const generatedFileName = useMemo(() => {
    if (!currentDeptVal || !currentSubjectVal) return 'BSK...';
    let rawFileName = `${currentDeptVal}.${currentSubjectVal}.${openingYear}-${currentSIVal}`;
    if (part && part !== 'None') {
      rawFileName += `(${part})`;
    }
    return rawFileName;
  }, [currentDeptVal, currentSubjectVal, openingYear, currentSIVal, part]);"""

text = text.replace(old_memo, new_memo)

# Fix 2: recomputedFileName in handleSaveEdit
old_edit = """    if (editingFileType === 'file') {
      const personSuffix = finalPerson ? `.${finalPerson}` : '';
      const rawFileName = `${finalDept}.${finalSubject}${personSuffix}.${editOpeningYear}-${editSI}`;
      const recomputedFileName = rawFileName;"""

new_edit = """    if (editingFileType === 'file') {
      let rawFileName = `${finalDept}.${finalSubject}.${editOpeningYear}-${editSI}`;
      if (editPart && editPart !== 'None') {
        rawFileName += `(${editPart})`;
      }
      const recomputedFileName = rawFileName;"""

text = text.replace(old_edit, new_edit)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
