import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Update File table SI header
old_file_si = '<th className="py-2.5 px-3 font-bold text-[#cca355] text-center w-12">SI</th>'
new_file_si = """<th className="py-2.5 px-3 font-bold text-[#cca355] text-center w-12">
                          <button onClick={() => setFileSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="flex items-center justify-center w-full gap-1 hover:text-amber-300">
                            SI {fileSortOrder === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                          </button>
                        </th>"""
text = text.replace(old_file_si, new_file_si, 1)

# Update Memo table SI header
old_memo_si = '<th className="py-2.5 px-3 font-bold text-[#cca355] text-center w-12">SI</th>'
new_memo_si = """<th className="py-2.5 px-3 font-bold text-[#cca355] text-center w-12">
                          <button onClick={() => setMemoSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="flex items-center justify-center w-full gap-1 hover:text-amber-300">
                            SI {memoSortOrder === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                          </button>
                        </th>"""
text = text.replace(old_memo_si, new_memo_si, 1)

# Need to import ArrowUp, ArrowDown from lucide-react if they are not there.
with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
