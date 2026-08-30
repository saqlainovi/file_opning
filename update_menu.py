import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

menu_html = """          <div>
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
            >
              <MoreVertical size={20} />
            </button>
            
            {/* Drawer Overlay */}
            <div 
              className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
              onClick={() => setIsMenuOpen(false)}
            />

            {/* Drawer Panel */}
            <div 
              className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-[110] transform transition-transform duration-300 ease-in-out flex flex-col ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
              <div className="bg-[#0A111E] px-6 py-5 flex items-center justify-between text-white shrink-0">
                <div className="flex items-center gap-3">
                  <img src={`/logo.png?v=${Date.now()}`} alt="BSK Logo" className="h-8 w-auto" />
                  <span className="font-bold text-lg">BSK ERP</span>
                </div>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4">
                <div className="px-4 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Main Menu
                </div>
                <div className="space-y-1 px-2">
                  <button
                    onClick={() => { setActiveTab('files'); setIsMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'files' ? 'bg-[#0A111E] text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'}`}
                  >
                    <span className="text-lg">📂</span> 
                    <span>File Opening</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('memos'); setIsMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'memos' ? 'bg-[#0A111E] text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'}`}
                  >
                    <span className="text-lg">📝</span> 
                    <span>Memo Register</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('analytics'); setIsMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'analytics' ? 'bg-[#0A111E] text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'}`}
                  >
                    <span className="text-lg">📊</span> 
                    <span>Dashboard</span>
                  </button>
                  {userProfile?.role === 'Admin' && (
                    <button
                      onClick={() => { setActiveTab('security'); setIsMenuOpen(false); }}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors ${activeTab === 'security' ? 'bg-[#0A111E] text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'}`}
                    >
                      <span className="text-lg">🔒</span> 
                      <span>Security Dashboard</span>
                    </button>
                  )}
                </div>

                <div className="mt-8 px-4 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  System
                </div>
                <div className="space-y-1 px-2">
                  <button
                    onClick={() => { setIsSettingsOpen(true); setIsMenuOpen(false); }}
                    className="w-full text-left px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-3 hover:bg-slate-100 text-slate-700 transition-colors"
                  >
                    <Settings size={18} className="text-slate-500" />
                    <span>Settings</span>
                  </button>
                </div>
              </div>
            </div>
          </div>"""

# Replace the block from <div className="relative"> to just before the bsk-logo-container
# Let's extract the precise block:
pattern = r'<div className="relative">.*?</div>\s*</div>\s*<div className="h-12 flex items-center justify-start shrink-0" id="bsk-logo-container">'

text = re.sub(pattern, menu_html + '\n          <div className="h-12 flex items-center justify-start shrink-0" id="bsk-logo-container">', text, flags=re.DOTALL)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
