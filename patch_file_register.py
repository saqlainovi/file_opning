import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import_budget_data = "import { INITIAL_BUDGET_DATA } from '../budgetData';"
if "import { INITIAL_BUDGET_DATA }" not in text:
    text = text.replace("import { db,", import_budget_data + "\nimport { db,")

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
              <div className="overflow-x-auto border border-slate-200 rounded-xl mt-4">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                      <th className="p-3 border-b border-slate-200 text-center w-12">SL</th>
                      <th className="p-3 border-b border-slate-200 w-24">Budget Code</th>
                      <th className="p-3 border-b border-slate-200 w-64">Budget Head</th>
                      <th className="p-3 border-b border-slate-200 w-32">Responsible Person</th>
                      <th className="p-3 border-b border-slate-200 text-right w-32">Budget Figure</th>
                      <th className="p-3 border-b border-slate-200 text-right w-32">Variance / Expense</th>
                      <th className="p-3 border-b border-slate-200 text-right w-32">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {INITIAL_BUDGET_DATA.map((item, index) => {
                      // Dummy values for expense and balance based on CSV logic
                      const expense = index === 0 ? 300000 : 0; 
                      const balance = item.budgetFigure - expense;
                      return (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center text-slate-400 font-medium">{item.sl}</td>
                        <td className="p-3 font-bold text-slate-700">{item.budgetCode}</td>
                        <td className="p-3 text-slate-600 truncate max-w-xs" title={item.budgetHead}>{item.budgetHead}</td>
                        <td className="p-3">
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold">{item.responsiblePerson}</span>
                        </td>
                        <td className="p-3 text-right font-black text-slate-800">
                          ৳ {item.budgetFigure.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-medium text-amber-600">
                          ৳ {expense.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-black text-emerald-600">
                          ৳ {balance.toLocaleString()}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                <button className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-2 rounded-lg font-bold text-xs shadow-md transition-colors flex items-center gap-2">
                  <span className="text-lg">+</span> 
                  Add Expense
                </button>
              </div>
              <div className="flex items-center justify-center p-12 text-slate-400 flex-col gap-3">
                <span className="text-4xl">📂</span>
                <p className="font-medium text-sm">Expense records will be displayed here.</p>
              </div>
            </section>
          </div>
        )}
"""

pattern = r'\{\/\* VIEW 1\.3: BUDGET TRACKER \*\/\}.*?\{\/\* VIEW 2: ANALYTICS & DASHBOARD \*\/\}'
if re.search(pattern, text, re.DOTALL):
    text = re.sub(pattern, views_html + "\n        {/* VIEW 2: ANALYTICS & DASHBOARD */}", text, flags=re.DOTALL)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
