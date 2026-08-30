import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace state definition
text = text.replace(
    "const [activeTab, setActiveTab] = useState<'files' | 'memos' | 'analytics' | 'security'>('files');",
    "const [activeTab, setActiveTab] = useState<'files' | 'memos' | 'budget' | 'expense' | 'analytics' | 'security'>('files');"
)

# Insert the buttons in the menu
buttons_to_insert = """                  <button
                    onClick={() => { setActiveTab('budget'); setIsMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'budget' ? 'bg-[#0A111E] text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'}`}
                  >
                    <span className="text-lg">💰</span> 
                    <span>Budget Tracker</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('expense'); setIsMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'expense' ? 'bg-[#0A111E] text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'}`}
                  >
                    <span className="text-lg">💸</span> 
                    <span>Expense Register</span>
                  </button>"""

memo_button_pattern = r"""                  <button\s+onClick=\{\(\) => \{ setActiveTab\('memos'\); setIsMenuOpen\(false\); \}\}\s+className=\{`[^`]+`\}\s+>\s+<span className="text-lg">📝</span>\s+<span>Memo Register</span>\s+</button>"""

match = re.search(memo_button_pattern, text)
if match:
    full_match = match.group(0)
    text = text.replace(full_match, full_match + '\n' + buttons_to_insert)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
