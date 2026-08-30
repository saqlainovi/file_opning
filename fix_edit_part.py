import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    "খণ্ড (Part)",
    "{editingFileType === 'file' ? 'Part' : 'খণ্ড (Part)'}"
)

text = text.replace(
    """<option value="None">কোনোটিই নয় (None)</option>""",
    """<option value="None">{editingFileType === 'file' ? 'None' : 'কোনোটিই নয় (None)'}</option>"""
)
text = text.replace(
    """<option value="Part 1">খণ্ড ১ (Part 1)</option>""",
    """<option value="Part 1">{editingFileType === 'file' ? 'Part 1' : 'খণ্ড ১ (Part 1)'}</option>"""
)
text = text.replace(
    """<option value="Part 2">খণ্ড ২ (Part 2)</option>""",
    """<option value="Part 2">{editingFileType === 'file' ? 'Part 2' : 'খণ্ড ২ (Part 2)'}</option>"""
)
text = text.replace(
    """<option value="Part 3">খণ্ড ৩ (Part 3)</option>""",
    """<option value="Part 3">{editingFileType === 'file' ? 'Part 3' : 'খণ্ড ৩ (Part 3)'}</option>"""
)
text = text.replace(
    """<option value="Part 4">খণ্ড ৪ (Part 4)</option>""",
    """<option value="Part 4">{editingFileType === 'file' ? 'Part 4' : 'খণ্ড ৪ (Part 4)'}</option>"""
)
text = text.replace(
    """<option value="Part 5">খণ্ড ৫ (Part 5)</option>""",
    """<option value="Part 5">{editingFileType === 'file' ? 'Part 5' : 'খণ্ড ৫ (Part 5)'}</option>"""
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
