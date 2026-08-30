import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the specific occurrences in Add Memo Modal (lines 3500-3520 roughly)
# Add Memo Modal starts around 3270 and ends around 3530.
# Let's just find `isAddMemoModalOpen && (` and replace everything inside it up to `isEditModalOpen && (`

start_tag = 'isAddMemoModalOpen && ('
end_tag = 'isEditModalOpen && ('

start_idx = text.find(start_tag)
end_idx = text.find(end_tag)

modal_content = text[start_idx:end_idx]

# Replace the dynamic strings with the static Bengali strings since it's the Memo modal
modal_content = modal_content.replace("{editingFileType === 'file' ? 'Department' : 'বিভাগ'}", 'বিভাগ')
modal_content = modal_content.replace("{editingFileType === 'file' ? 'Part' : 'খণ্ড (Part)'}", 'খণ্ড (Part)')
modal_content = modal_content.replace("{editingFileType === 'file' ? 'Part 1' : 'খণ্ড ১ (Part 1)'}", 'খণ্ড ১ (Part 1)')
modal_content = modal_content.replace("{editingFileType === 'file' ? 'Part 2' : 'খণ্ড ২ (Part 2)'}", 'খণ্ড ২ (Part 2)')
modal_content = modal_content.replace("{editingFileType === 'file' ? 'Part 3' : 'খণ্ড ৩ (Part 3)'}", 'খণ্ড ৩ (Part 3)')
modal_content = modal_content.replace("{editingFileType === 'file' ? 'Part 4' : 'খণ্ড ৪ (Part 4)'}", 'খণ্ড ৪ (Part 4)')
modal_content = modal_content.replace("{editingFileType === 'file' ? 'Part 5' : 'খণ্ড ৫ (Part 5)'}", 'খণ্ড ৫ (Part 5)')
modal_content = modal_content.replace("{editingFileType === 'file' ? 'None' : 'কোনোটিই নয় (None)'}", 'কোনোটিই নয় (None)')

text = text[:start_idx] + modal_content + text[end_idx:]

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
