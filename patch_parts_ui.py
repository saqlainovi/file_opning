import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace File Part
old_file_part = """                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  Part
                </label>
                <select 
                  value={part}
                  onChange={(e) => setPart(e.target.value)}
                  className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                >
                  <option value="None">None</option>
                  <option value="Part 2">Part 2</option>
                  <option value="Part 3">Part 3</option>
                  <option value="Part 4">Part 4</option>
                  <option value="Part 5">Part 5</option>
                </select>"""

new_file_part = """                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block flex items-center justify-between">
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
                </select>"""
text = text.replace(old_file_part, new_file_part)

# Replace Memo Part
old_memo_part = """                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  খণ্ড (Part)
                </label>
                <select 
                  value={memoPart}
                  onChange={(e) => setMemoPart(e.target.value)}
                  className="w-full border-b border-slate-300 py-1 focus:border-[#cca355] outline-none text-slate-700 text-xs font-semibold bg-transparent"
                >
                  <option value="None" disabled={memoContext.existingParts.includes('None')}>কোনোটিই নয় (None)</option>
                  
                  <option value="Part 2" disabled={memoContext.existingParts.includes('Part 2')}>খণ্ড ২ (Part 2)</option>
                  <option value="Part 3" disabled={memoContext.existingParts.includes('Part 3')}>খণ্ড ৩ (Part 3)</option>
                  <option value="Part 4" disabled={memoContext.existingParts.includes('Part 4')}>খণ্ড ৪ (Part 4)</option>
                  <option value="Part 5" disabled={memoContext.existingParts.includes('Part 5')}>খণ্ড ৫ (Part 5)</option>
                </select>"""

new_memo_part = """                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block flex items-center justify-between">
                  <span>খণ্ড (Part)</span>
                  {memoContext.existingParts.length > 0 && (
                    <span className="text-[9px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded normal-case">
                      বিদ্যমান: {memoContext.existingParts.map(p => p === 'None' ? 'Base' : translatePartToBengali(p)).join(', ')}
                    </span>
                  )}
                </label>
                <select 
                  value={memoPart}
                  onChange={(e) => setMemoPart(e.target.value)}
                  className="w-full border-b border-slate-300 py-1 focus:border-[#cca355] outline-none text-slate-700 text-xs font-semibold bg-transparent"
                >
                  <option value="None" disabled={memoContext.existingParts.includes('None')}>কোনোটিই নয় (None)</option>
                  <option value="Part 2" disabled={memoContext.existingParts.includes('Part 2')}>খণ্ড ২ (Part 2)</option>
                  <option value="Part 3" disabled={memoContext.existingParts.includes('Part 3')}>খণ্ড ৩ (Part 3)</option>
                  <option value="Part 4" disabled={memoContext.existingParts.includes('Part 4')}>খণ্ড ৪ (Part 4)</option>
                  <option value="Part 5" disabled={memoContext.existingParts.includes('Part 5')}>খণ্ড ৫ (Part 5)</option>
                </select>"""

text = text.replace(old_memo_part, new_memo_part)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
