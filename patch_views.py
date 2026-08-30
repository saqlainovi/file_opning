import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

views_html = """
        {/* VIEW 1.3: BUDGET TRACKER */}
        {activeTab === 'budget' && (
          <div className="flex flex-col gap-6" id="budget-tab-container">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="text-left">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-xl">💰</span>
                    {"বাজেট ট্র্যাকার (Budget Tracker)"}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{"Track budget heads, figures, and variances"}</p>
                </div>
              </div>
              <div className="flex items-center justify-center p-12 text-slate-400">
                <p>Budget Tracker view coming soon...</p>
              </div>
            </section>
          </div>
        )}

        {/* VIEW 1.4: EXPENSE REGISTER */}
        {activeTab === 'expense' && (
          <div className="flex flex-col gap-6" id="expense-tab-container">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="text-left">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-xl">💸</span>
                    {"ব্যয় রেজিস্টার (Expense Register)"}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{"Log daily and periodic expenditures"}</p>
                </div>
              </div>
              <div className="flex items-center justify-center p-12 text-slate-400">
                <p>Expense Register view coming soon...</p>
              </div>
            </section>
          </div>
        )}
"""

# Insert before VIEW 2
text = text.replace("{/* VIEW 2: ANALYTICS & DASHBOARD */}", views_html + "\n        {/* VIEW 2: ANALYTICS & DASHBOARD */}")

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
