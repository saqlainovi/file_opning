import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

menu_icon_html = """        {/* Brand & Motto & Address Info */}
        <div className="flex items-center gap-3" id="brand-panel">
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
            >
              <MoreVertical size={20} />
            </button>
            {isMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden text-slate-800">
                <button
                  onClick={() => { setActiveTab('files'); setIsMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'files' ? 'bg-slate-50 text-[#0A111E]' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  <span className="text-lg">📂</span> 
                  <span>File Opening</span>
                </button>
                <button
                  onClick={() => { setActiveTab('memos'); setIsMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'memos' ? 'bg-slate-50 text-[#0A111E]' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  <span className="text-lg">📝</span> 
                  <span>Memo Register</span>
                </button>
                <button
                  onClick={() => { setActiveTab('analytics'); setIsMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'analytics' ? 'bg-slate-50 text-[#0A111E]' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  <span className="text-lg">📊</span> 
                  <span>Dashboard</span>
                </button>
                {userProfile?.role === 'Admin' && (
                  <button
                    onClick={() => { setActiveTab('security'); setIsMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'security' ? 'bg-slate-50 text-[#0A111E]' : 'hover:bg-slate-50 text-slate-700'}`}
                  >
                    <span className="text-lg">🔒</span> 
                    <span>Security Dashboard</span>
                  </button>
                )}
                <button
                  onClick={() => { setIsSettingsOpen(true); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-slate-50 text-slate-700 border-t border-slate-100 transition-colors"
                >
                  <Settings size={18} className="text-slate-500" />
                  <span>Settings</span>
                </button>
              </div>
            )}
          </div>"""

text = text.replace(
    '''        {/* Brand & Motto & Address Info */}
        <div className="flex items-center gap-3" id="brand-panel">''',
    menu_icon_html
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
