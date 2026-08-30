import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update generatedMemoNumber
old_gen_memo = """  const generatedMemoNumber = useMemo(() => {
    if (!currentMemoDeptVal || !currentMemoSubjectVal) return 'BSK...';
    const personSuffix = currentMemoPersonVal ? `.${currentMemoPersonVal}` : '';
    let rawMemoNumber = `স্মারক নং ${currentMemoDeptVal}.${currentMemoSubjectVal}${personSuffix}.${memoYear}.${memoContext.targetSI}`;
    if (memoPart && memoPart !== 'None') {
      rawMemoNumber += `(${translatePartToBengali(memoPart)})`;
    }
    return toBengali(rawMemoNumber);
  }, [currentMemoDeptVal, currentMemoSubjectVal, currentMemoPersonVal, memoYear, memoContext.targetSI, memoPart]);"""
new_gen_memo = """  const generatedMemoNumber = useMemo(() => {
    if (!currentMemoDeptVal || !currentMemoSubjectVal) return 'BSK...';
    let rawMemoNumber = `স্মারক নং ${currentMemoDeptVal}.${currentMemoSubjectVal}.${memoYear}.${memoContext.targetSI}`;
    if (memoPart && memoPart !== 'None') {
      rawMemoNumber += `(${translatePartToBengali(memoPart)})`;
    }
    return toBengali(rawMemoNumber);
  }, [currentMemoDeptVal, currentMemoSubjectVal, memoYear, memoContext.targetSI, memoPart]);"""
text = text.replace(old_gen_memo, new_gen_memo)

# 2. Update handleSaveEdit memo name
old_edit_memo_person = """    } else {
      const personSuffix = finalPerson ? `.${finalPerson}` : '';
      const dateParts = editOpeningDate.split('.');
      const memoYearVal = dateParts[2] || '2026';
      const baseMemoMatches = memos.filter(m => m.department === finalDept && m.subject === finalSubject && m.openingDate.split('.')[2] === memoYearVal);
      let targetEditMemoSI = editSI;
      if (baseMemoMatches.length > 0) {
        const sorted = [...baseMemoMatches].sort((a, b) => (parseInt(a.si, 10) || 0) - (parseInt(b.si, 10) || 0));
        targetEditMemoSI = sorted[0].si;
      }

      let rawMemoNumber = `স্মারক নং ${finalDept}.${finalSubject}${personSuffix}.${memoYearVal}.${targetEditMemoSI}`;
      if (editPart && editPart !== 'None') {"""
new_edit_memo_person = """    } else {
      const dateParts = editOpeningDate.split('.');
      const memoYearVal = dateParts[2] || '2026';
      const baseMemoMatches = memos.filter(m => m.department === finalDept && m.subject === finalSubject && m.openingDate.split('.')[2] === memoYearVal);
      let targetEditMemoSI = editSI;
      if (baseMemoMatches.length > 0) {
        const sorted = [...baseMemoMatches].sort((a, b) => (parseInt(a.si, 10) || 0) - (parseInt(b.si, 10) || 0));
        targetEditMemoSI = sorted[0].si;
      }

      let rawMemoNumber = `স্মারক নং ${finalDept}.${finalSubject}.${memoYearVal}.${targetEditMemoSI}`;
      if (editPart && editPart !== 'None') {"""
text = text.replace(old_edit_memo_person, new_edit_memo_person)


# 3. Fix the edit preview
old_edit_preview = """                  {(() => {
                    const finalDept = isEditCustomDept ? editCustomDept.trim().toUpperCase() : editDepartment.trim().toUpperCase();
                    const finalSubject = isEditCustomSubject ? editCustomSubject.trim() : editSubject.trim();
                    const finalPerson = isEditCustomResponsiblePerson ? editCustomResponsiblePerson.trim() : editResponsiblePerson.trim();
                    const personSuffix = finalPerson ? `.${finalPerson}` : '';
                    if (editingFileType === 'file') {
                      return `${finalDept}.${finalSubject}${personSuffix}.${editOpeningYear}-${editSI}`;
                    } else {
                      const dateParts = editOpeningDate.split('.');
                      const memoYearVal = dateParts[2] || '2026';
                      return toBengali(`স্মারক নং ${finalDept}.${finalSubject}${personSuffix}.${memoYearVal}.${editSI}`);
                    }
                  })()}"""
new_edit_preview = """                  {(() => {
                    const finalDept = isEditCustomDept ? editCustomDept.trim().toUpperCase() : editDepartment.trim().toUpperCase();
                    const finalSubject = isEditCustomSubject ? editCustomSubject.trim() : editSubject.trim();
                    
                    if (editingFileType === 'file') {
                      let rawFileName = `${finalDept}.${finalSubject}.${editOpeningYear}-${editSI}`;
                      if (editPart && editPart !== 'None') {
                        rawFileName += `(${editPart})`;
                      }
                      return rawFileName;
                    } else {
                      const dateParts = editOpeningDate.split('.');
                      const memoYearVal = dateParts[2] || '2026';
                      let rawMemoNumber = `স্মারক নং ${finalDept}.${finalSubject}.${memoYearVal}.${editSI}`;
                      if (editPart && editPart !== 'None') {
                        rawMemoNumber += `(${translatePartToBengali(editPart)})`;
                      }
                      return toBengali(rawMemoNumber);
                    }
                  })()}"""
text = text.replace(old_edit_preview, new_edit_preview)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
