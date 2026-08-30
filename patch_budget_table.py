import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Make sure we add expandedBudgetCode state if it's not there
if 'const [expandedBudgetCode' not in text:
    text = text.replace("const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);", 
                        "const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);\n  const [expandedBudgetCode, setExpandedBudgetCode] = useState<string | null>(null);")

# Find the start of the map function for budgets
start_marker = "{(budgets.length > 0 ? budgets : INITIAL_BUDGET_DATA).map((item, index) => {"
end_marker = "                        </td>\n                      </tr>\n                      );\n                    })}"

if start_marker in text:
    start_idx = text.find(start_marker)
    # find the end of the map function
    end_idx = text.find(end_marker, start_idx)
    
    if end_idx != -1:
        end_idx += len(end_marker)
        
        old_chunk = text[start_idx:end_idx]
        
        new_chunk = """{(budgets.length > 0 ? budgets : INITIAL_BUDGET_DATA).map((item, index) => {
                      const budgetExpenses = expenses.filter(e => e.budgetCode === item.budgetCode);
                      const totalExpense = budgetExpenses.reduce((sum, e) => sum + e.amount, 0);
                      const balance = item.budgetFigure - totalExpense;
                      const isExpanded = expandedBudgetCode === item.budgetCode;
                      return (
                        <React.Fragment key={index}>
                          <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
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
                              <div className="flex items-center justify-end gap-2">
                                <span>৳ {totalExpense.toLocaleString()}</span>
                                {budgetExpenses.length > 0 && (
                                  <button 
                                    onClick={() => setExpandedBudgetCode(isExpanded ? null : item.budgetCode)}
                                    className="text-slate-400 hover:text-amber-600 p-1 bg-slate-100 hover:bg-amber-50 rounded flex items-center justify-center"
                                    title="View Details"
                                  >
                                    {isExpanded ? <ChevronDown size={14} className="rotate-180 transition-transform" /> : <ChevronDown size={14} className="transition-transform" />}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-right font-black text-emerald-600">
                              ৳ {balance.toLocaleString()}
                            </td>
                            <td className="p-3 text-center flex items-center justify-center gap-2">
                              {userProfile?.role === 'Admin' && budgets.length > 0 && (
                                <button 
                                  onClick={() => handleDeleteBudget(item.id)}
                                  className="text-red-400 hover:text-red-600 p-1 transition"
                                  title="Delete Budget"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                          {isExpanded && budgetExpenses.length > 0 && (
                            <tr className="bg-slate-50/50">
                              <td colSpan={8} className="p-4 border-b border-slate-100">
                                <div className="bg-white rounded-lg border border-amber-100 p-4 shadow-sm mx-auto max-w-4xl">
                                  <h4 className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <ClipboardList size={14} /> Expense Details (ব্যয়ের বিবরণ)
                                  </h4>
                                  <div className="space-y-2">
                                    {budgetExpenses.map(exp => (
                                      <div key={exp.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded bg-slate-50 border border-slate-100 hover:border-amber-200 transition-colors">
                                        <div className="flex flex-col gap-0.5">
                                          <span className="font-bold text-slate-700 text-sm">{exp.description}</span>
                                          <div className="text-[10px] text-slate-500 font-medium flex items-center gap-2">
                                            <span className="flex items-center gap-1"><Calendar size={10} /> {exp.createdAt?.toDate ? exp.createdAt.toDate().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : exp.date}</span>
                                            <span className="text-slate-300">|</span>
                                            <span className="flex items-center gap-1"><UserCheck size={10} /> By {exp.createdBy.split('@')[0]}</span>
                                          </div>
                                        </div>
                                        <div className="font-black text-amber-600 shrink-0 text-sm bg-white px-3 py-1 rounded-md border border-slate-100">
                                          - ৳ {exp.amount.toLocaleString()}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}"""
        text = text[:start_idx] + new_chunk + text[end_idx:]
        print("Replaced chunk")

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

