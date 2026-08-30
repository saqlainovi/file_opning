import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update Add File Part Select
old_file_part = """                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  Part
                </label>
                <select 
                  value={part}
                  onChange={(e) => setPart(e.target.value)}
                  className="w-full border-b border-slate-300 py-1 focus:border-[#cca355] outline-none text-slate-700 text-xs font-semibold bg-transparent"
                >
                  <option value="None">None</option>
                  <option value="Part 1">Part 1</option>
                  <option value="Part 2">Part 2</option>
                  <option value="Part 3">Part 3</option>
                  <option value="Part 4">Part 4</option>
                  <option value="Part 5">Part 5</option>
                </select>"""
new_file_part = """                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  Part
                </label>
                <select 
                  value={part}
                  onChange={(e) => setPart(e.target.value)}
                  className="w-full border-b border-slate-300 py-1 focus:border-[#cca355] outline-none text-slate-700 text-xs font-semibold bg-transparent"
                >
                  <option value="None" disabled={fileContext.existingParts.includes('None')}>None</option>
                  <option value="Part 1" disabled={fileContext.existingParts.includes('Part 1')}>Part 1</option>
                  <option value="Part 2" disabled={fileContext.existingParts.includes('Part 2')}>Part 2</option>
                  <option value="Part 3" disabled={fileContext.existingParts.includes('Part 3')}>Part 3</option>
                  <option value="Part 4" disabled={fileContext.existingParts.includes('Part 4')}>Part 4</option>
                  <option value="Part 5" disabled={fileContext.existingParts.includes('Part 5')}>Part 5</option>
                </select>"""

text = text.replace(old_file_part, new_file_part)


# 2. Update Add Memo Part Select
old_memo_part = """                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  খণ্ড (Part)
                </label>
                <select 
                  value={memoPart}
                  onChange={(e) => setMemoPart(e.target.value)}
                  className="w-full border-b border-slate-300 py-1 focus:border-[#cca355] outline-none text-slate-700 text-xs font-semibold bg-transparent"
                >
                  <option value="None">কোনোটিই নয় (None)</option>
                  <option value="Part 1">খণ্ড ১ (Part 1)</option>
                  <option value="Part 2">খণ্ড ২ (Part 2)</option>
                  <option value="Part 3">খণ্ড ৩ (Part 3)</option>
                  <option value="Part 4">খণ্ড ৪ (Part 4)</option>
                  <option value="Part 5">খণ্ড ৫ (Part 5)</option>
                </select>"""
new_memo_part = """                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  খণ্ড (Part)
                </label>
                <select 
                  value={memoPart}
                  onChange={(e) => setMemoPart(e.target.value)}
                  className="w-full border-b border-slate-300 py-1 focus:border-[#cca355] outline-none text-slate-700 text-xs font-semibold bg-transparent"
                >
                  <option value="None" disabled={memoContext.existingParts.includes('None')}>কোনোটিই নয় (None)</option>
                  <option value="Part 1" disabled={memoContext.existingParts.includes('Part 1')}>খণ্ড ১ (Part 1)</option>
                  <option value="Part 2" disabled={memoContext.existingParts.includes('Part 2')}>খণ্ড ২ (Part 2)</option>
                  <option value="Part 3" disabled={memoContext.existingParts.includes('Part 3')}>খণ্ড ৩ (Part 3)</option>
                  <option value="Part 4" disabled={memoContext.existingParts.includes('Part 4')}>খণ্ড ৪ (Part 4)</option>
                  <option value="Part 5" disabled={memoContext.existingParts.includes('Part 5')}>খণ্ড ৫ (Part 5)</option>
                </select>"""

text = text.replace(old_memo_part, new_memo_part)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
