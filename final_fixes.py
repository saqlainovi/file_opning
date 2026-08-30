import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Restore finalSI assignment in handleCreateFile and handleCreateMemo
text = text.replace("const finalSI = fileContext.targetSI;", "const finalSI = useAutoSI ? nextSI : manualSI.padStart(3, '0');")
text = text.replace("const finalSI = memoContext.targetSI;", "const finalSI = useMemoAutoSI ? nextMemoSI : manualMemoSI.padStart(3, '0');")

# 2. Add translatePartToBengali helper at the top (after toBengali)
helper_func = """const translatePartToBengali = (p: string) => {
  if (!p || p === 'None') return '';
  const translations: Record<string, string> = {
    'Part 1': 'খণ্ড ১',
    'Part 2': 'খণ্ড ২',
    'Part 3': 'খণ্ড ৩',
    'Part 4': 'খণ্ড ৪',
    'Part 5': 'খণ্ড ৫'
  };
  return translations[p] || p;
};"""

text = text.replace("export default function FileRegister() {", helper_func + "\n\nexport default function FileRegister() {")

# 3. Use translated part in generatedMemoNumber
old_gen_memo = """    let rawMemoNumber = `স্মারক নং ${currentMemoDeptVal}.${currentMemoSubjectVal}${personSuffix}.${memoYear}.${memoContext.targetSI}`;
    if (memoPart && memoPart !== 'None') {
      rawMemoNumber += `(${memoPart})`;
    }
    return toBengali(rawMemoNumber);"""
new_gen_memo = """    let rawMemoNumber = `স্মারক নং ${currentMemoDeptVal}.${currentMemoSubjectVal}${personSuffix}.${memoYear}.${memoContext.targetSI}`;
    if (memoPart && memoPart !== 'None') {
      rawMemoNumber += `(${translatePartToBengali(memoPart)})`;
    }
    return toBengali(rawMemoNumber);"""
text = text.replace(old_gen_memo, new_gen_memo)

# 4. Use translated part and correct target SI in handleSaveEdit
old_edit_file = """    if (editingFileType === 'file') {
      let rawFileName = `${finalDept}.${finalSubject}.${editOpeningYear}-${editSI}`;
      if (editPart && editPart !== 'None') {
        rawFileName += `(${editPart})`;
      }
      const recomputedFileName = rawFileName;"""
new_edit_file = """    if (editingFileType === 'file') {
      const baseMatches = files.filter(f => f.department === finalDept && f.subject === finalSubject && f.openingYear === editOpeningYear);
      let targetEditSI = editSI;
      if (baseMatches.length > 0) {
        // If we found matches, sort them by SI to find the very first one, or just take the first match.
        // Actually, since they might be added in order, [0] is usually the first.
        // But let's be safe and sort by SI ascending to get the real base SI.
        const sorted = [...baseMatches].sort((a, b) => (parseInt(a.si, 10) || 0) - (parseInt(b.si, 10) || 0));
        targetEditSI = sorted[0].si;
      }

      let rawFileName = `${finalDept}.${finalSubject}.${editOpeningYear}-${targetEditSI}`;
      if (editPart && editPart !== 'None') {
        rawFileName += `(${editPart})`;
      }
      const recomputedFileName = rawFileName;"""
text = text.replace(old_edit_file, new_edit_file)

old_edit_memo = """      let rawMemoNumber = `স্মারক নং ${finalDept}.${finalSubject}${personSuffix}.${memoYearVal}.${editSI}`;
      if (editPart && editPart !== 'None') {
        rawMemoNumber += `(${editPart})`;
      }
      const recomputedMemoNumber = toBengali(rawMemoNumber);"""
new_edit_memo = """      const baseMemoMatches = memos.filter(m => m.department === finalDept && m.subject === finalSubject && m.openingDate.split('.')[2] === memoYearVal);
      let targetEditMemoSI = editSI;
      if (baseMemoMatches.length > 0) {
        const sorted = [...baseMemoMatches].sort((a, b) => (parseInt(a.si, 10) || 0) - (parseInt(b.si, 10) || 0));
        targetEditMemoSI = sorted[0].si;
      }

      let rawMemoNumber = `স্মারক নং ${finalDept}.${finalSubject}${personSuffix}.${memoYearVal}.${targetEditMemoSI}`;
      if (editPart && editPart !== 'None') {
        rawMemoNumber += `(${translatePartToBengali(editPart)})`;
      }
      const recomputedMemoNumber = toBengali(rawMemoNumber);"""
text = text.replace(old_edit_memo, new_edit_memo)

# 5. Remove "Part 1" options
text = text.replace("""<option value="Part 1" disabled={fileContext.existingParts.includes('Part 1')}>Part 1</option>""", "")
text = text.replace("""<option value="Part 1" disabled={memoContext.existingParts.includes('Part 1')}>খণ্ড ১ (Part 1)</option>""", "")
text = text.replace("""<option value="Part 1">{editingFileType === 'file' ? 'Part 1' : 'খণ্ড ১ (Part 1)'}</option>""", "")

# 6. We also need to fix `existingParts` in `fileContext` and `memoContext` if they might try to check 'Part 1'.
# That's fine, it won't crash if it checks, we just removed the option.

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
