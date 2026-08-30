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
                      const totalExpense = expenses
                        .filter(e => e.budgetCode === item.budgetCode)
                        .reduce((sum, e) => sum + e.amount, 0);
                      const balance = item.budgetFigure - totalExpense;
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
                          ৳ {totalExpense.toLocaleString()}
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
                <button 
                  onClick={() => setIsAddExpenseModalOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-2 rounded-lg font-bold text-xs shadow-md transition-colors flex items-center gap-2"
                >
                  <span className="text-lg">+</span> 
                  Add Expense
                </button>
              </div>
              
              <div className="overflow-x-auto border border-slate-200 rounded-xl mt-4">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                      <th className="p-3 border-b border-slate-200 w-24">Date</th>
                      <th className="p-3 border-b border-slate-200 w-24">Code</th>
                      <th className="p-3 border-b border-slate-200 w-64">Budget Head</th>
                      <th className="p-3 border-b border-slate-200 w-64">Description</th>
                      <th className="p-3 border-b border-slate-200 text-right w-32">Amount</th>
                      <th className="p-3 border-b border-slate-200 text-right w-32">Created By</th>
                      <th className="p-3 border-b border-slate-200 text-center w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          No expenses recorded yet.
                        </td>
                      </tr>
                    ) : (
                      expenses.map((expense) => {
                        const budgetHead = INITIAL_BUDGET_DATA.find(b => b.budgetCode === expense.budgetCode)?.budgetHead || expense.budgetCode;
                        return (
                          <tr key={expense.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-slate-600 font-medium">{expense.date}</td>
                            <td className="p-3 font-bold text-slate-700">{expense.budgetCode}</td>
                            <td className="p-3 text-slate-600 truncate max-w-[200px]" title={budgetHead}>{budgetHead}</td>
                            <td className="p-3 text-slate-500 truncate max-w-[200px]" title={expense.description}>{expense.description}</td>
                            <td className="p-3 text-right font-black text-amber-600">
                              ৳ {expense.amount.toLocaleString()}
                            </td>
                            <td className="p-3 text-right text-slate-400 text-[10px]">{expense.createdBy}</td>
                            <td className="p-3 text-center">
                              {userProfile?.role === 'Admin' && (
                                <button 
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  className="text-red-400 hover:text-red-600 p-1"
                                  title="Delete Expense"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
"""

pattern = r'\{\/\* VIEW 1\.3: BUDGET TRACKER \*\/\}.*?\{\/\* VIEW 2: ANALYTICS & DASHBOARD \*\/\}'
if re.search(pattern, text, re.DOTALL):
    text = re.sub(pattern, views_html + "\n        {/* VIEW 2: ANALYTICS & DASHBOARD */}", text, flags=re.DOTALL)

# Add Modal
modal_html = """
      {/* CREATE EXPENSE MODAL */}
      {isAddExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden fade-in">
            
            <div className="bg-amber-600 text-white px-6 py-4 flex items-center justify-between border-b border-amber-700">
              <div className="flex items-center gap-2">
                <span className="text-xl">💸</span>
                <div>
                  <h3 className="text-sm font-bold text-white">নতুন ব্যয় এন্ট্রি করুন</h3>
                  <p className="text-[10px] text-amber-100 font-medium uppercase tracking-wider">Expense Register</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddExpenseModalOpen(false)}
                className="text-amber-100 hover:text-white hover:bg-amber-700 p-1 rounded transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-6">
              {expenseErrorMsg && (
                <div className="mb-4 bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg border border-red-200 flex items-center gap-2">
                  <AlertCircle size={14} /> {expenseErrorMsg}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date (তারিখ)</label>
                  <input 
                    type="date"
                    required
                    name="expenseDate"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:bg-white outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Budget Head (বাজেট খাত)</label>
                  <select 
                    required
                    name="budgetCode"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:bg-white outline-none transition"
                  >
                    <option value="">Select a budget head...</option>
                    {INITIAL_BUDGET_DATA.map(item => (
                      <option key={item.budgetCode} value={item.budgetCode}>
                        {item.budgetCode} - {item.budgetHead}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount (পরিমাণ)</label>
                  <input 
                    type="number"
                    required
                    name="amount"
                    min="1"
                    placeholder="Enter amount in BDT"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:border-amber-500 focus:bg-white outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description (বিবরণ)</label>
                  <input 
                    type="text"
                    required
                    name="description"
                    placeholder="e.g. Purchased cleaning supplies"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:bg-white outline-none transition"
                  />
                </div>

              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddExpenseModalOpen(false)}
                  className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 text-sm font-bold bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-600 shadow-md transition flex items-center gap-2"
                >
                  <Save size={16} /> Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
"""
text = text.replace('{/* CREATE MEMO MODAL */}', modal_html + '\n      {/* CREATE MEMO MODAL */}')

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
