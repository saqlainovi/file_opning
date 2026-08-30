import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

modal_html = """
      {/* CREATE BUDGET MODAL */}
      {isAddBudgetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden fade-in">
            
            <div className="bg-indigo-600 text-white px-6 py-4 flex items-center justify-between border-b border-indigo-700">
              <div className="flex items-center gap-2">
                <span className="text-xl">💰</span>
                <div>
                  <h3 className="text-sm font-bold text-white">নতুন বাজেট খাত এন্ট্রি করুন</h3>
                  <p className="text-[10px] text-indigo-200 font-medium uppercase tracking-wider">Budget Tracker</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddBudgetModalOpen(false)}
                className="text-indigo-200 hover:text-white hover:bg-indigo-700 p-1 rounded transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddBudget} className="p-6">
              {budgetErrorMsg && (
                <div className="mb-4 bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg border border-red-200 flex items-center gap-2">
                  <AlertCircle size={14} /> {budgetErrorMsg}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">SL No.</label>
                    <input 
                      type="text"
                      required
                      name="sl"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Budget Code</label>
                    <input 
                      type="text"
                      required
                      name="budgetCode"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Budget Head (খাতের নাম)</label>
                  <input 
                    type="text"
                    required
                    name="budgetHead"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Responsible Person</label>
                  <select 
                    required
                    name="responsiblePerson"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white outline-none transition cursor-pointer"
                  >
                    <option value="">Select Person...</option>
                    {RESPONSIBLE_PERSONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Budget Figure (পরিমাণ)</label>
                  <input 
                    type="number"
                    required
                    name="budgetFigure"
                    min="1"
                    placeholder="Enter amount in BDT"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddBudgetModalOpen(false)}
                  className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 shadow-md transition flex items-center gap-2"
                >
                  <Save size={16} /> Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
"""
text = text.replace('{/* CREATE EXPENSE MODAL */}', modal_html + '\n      {/* CREATE EXPENSE MODAL */}')

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
