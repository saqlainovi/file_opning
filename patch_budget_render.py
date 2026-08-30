import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace INITIAL_BUDGET_DATA.map with conditional map
text = text.replace(
    "{INITIAL_BUDGET_DATA.map((item, index) => {",
    "{(budgets.length > 0 ? budgets : INITIAL_BUDGET_DATA).map((item, index) => {"
)
text = text.replace(
    "const budgetHead = INITIAL_BUDGET_DATA.find",
    "const budgetHead = (budgets.length > 0 ? budgets : INITIAL_BUDGET_DATA).find"
)

# Add "Add Budget" button in header of budget view
add_budget_btn = """
                <button 
                  onClick={() => setIsAddBudgetModalOpen(true)}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md transition-colors flex items-center gap-2"
                >
                  <span className="text-lg">+</span> 
                  Add Budget
                </button>
"""
text = text.replace(
    """<p className="text-[11px] text-slate-400 font-semibold mt-0.5">{"Track budget heads, figures, and variances"}</p>\n                </div>\n              </div>""",
    """<p className="text-[11px] text-slate-400 font-semibold mt-0.5">{"Track budget heads, figures, and variances"}</p>\n                </div>\n""" + add_budget_btn + "              </div>"
)

# Add Action column to Budget table
text = text.replace(
    '<th className="p-3 border-b border-slate-200 text-right w-32">Balance</th>',
    '<th className="p-3 border-b border-slate-200 text-right w-32">Balance</th>\n                      <th className="p-3 border-b border-slate-200 text-center w-16">Actions</th>'
)

# Add Actions to Budget row
actions_col = """
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
                          <button 
                              onClick={() => handleOpenNotes('budget', item.id, item.budgetHead)}
                              className={`p-1 rounded-md flex items-center justify-center transition-colors ${
                                item.note ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                              }`}
                              title={item.note ? "View/Edit Note" : "Add Note"}
                            >
                              <ClipboardList size={14} />
                          </button>
                        </td>
"""
text = text.replace(
    '<td className="p-3 text-right font-black text-emerald-600">\n                          ৳ {balance.toLocaleString()}\n                        </td>\n                      </tr>',
    '<td className="p-3 text-right font-black text-emerald-600">\n                          ৳ {balance.toLocaleString()}\n                        </td>\n' + actions_col + '\n                      </tr>'
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
