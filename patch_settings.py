import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

settings_modal = """
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-[#0A111E] px-6 py-4 flex justify-between items-center text-white shrink-0">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Settings size={20} /> Settings
              </h2>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto bg-slate-50">
              <div className="text-center text-slate-500 py-8">
                <Settings size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold">Settings Panel</p>
                <p className="text-sm mt-2">Additional configurations will appear here.</p>
              </div>
            </div>
          </div>
        </div>
      )}
"""

text = text.replace(
    """      )}
    </div>
  );
}""",
    """      )}""" + settings_modal + """
    </div>
  );
}"""
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
