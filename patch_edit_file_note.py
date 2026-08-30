import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

note_html_edit = """
              {/* Note / Remarks */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  Note / মন্তব্য
                </label>
                <input
                  type="text"
                  placeholder="Optional notes or remarks..."
                  value={editingFileType === 'memo' ? editMemoNote : editFileNote}
                  onChange={(e) => editingFileType === 'memo' ? setEditMemoNote(e.target.value) : setEditFileNote(e.target.value)}
                  className="w-full border-b border-slate-300 py-1 focus:border-blue-500 outline-none text-slate-700 text-xs font-semibold bg-transparent"
                />
              </div>
"""

text = text.replace(
    """                  </select>
                )}
              </div>

              {/* Responsible Person & Designation */}""",
    """                  </select>
                )}
              </div>""" + note_html_edit + """
              {/* Responsible Person & Designation */}"""
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
