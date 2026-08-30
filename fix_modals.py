import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix Edit Modal
edit_modal_replacements = [
    ('{"তথ্য সংশোধন ও এডিট"}', "{editingFileType === 'file' ? 'Edit Record Entry' : 'তথ্য সংশোধন ও এডিট'}"),
    ('{"তারিখ (Date)"}', "{editingFileType === 'file' ? 'Date' : 'তারিখ (Date)'}"),
    ("{'খোলার বছর'}", "{'Opening Year'}"), # File Only
    ("{'পত্রের বিস্তারিত বিষয়'}", "{'Letter Details'}"), # Memo only, already Bangla
    ("{'বিভাগ'}", "{editingFileType === 'file' ? 'Department' : 'বিভাগ'}"),
    ("{'বিষয় / হিসাবের খাত'}", "{editingFileType === 'file' ? 'Subject / Accounts Head' : 'বিষয় / হিসাবের খাত'}"),
    ('{"সংশোধিত লাইভ আউটপুট"}', "{editingFileType === 'file' ? 'Modified Live Preview' : 'সংশোধিত লাইভ আউটপুট'}"),
    ('{"পরিবর্তন সংরক্ষণ করুন"}', "{editingFileType === 'file' ? 'Save Changes' : 'পরিবর্তন সংরক্ষণ করুন'}"),
    ('{"বাতিল"}', "{editingFileType === 'file' ? 'Cancel' : 'বাতিল'}")
]

# Delete Modal
delete_modal_replacements = [
    ('{"রেকর্ড ডিলিট নিশ্চিতকরণ"}', "{deleteConfirm.type === 'file' ? 'Confirm Record Deletion' : 'রেকর্ড ডিলিট নিশ্চিতকরণ'}"),
    ('{"এই অ্যাকশনটি পরিবর্তন করা সম্ভব নয়"}', "{deleteConfirm.type === 'file' ? 'This action is irreversible' : 'এই অ্যাকশনটি পরিবর্তন করা সম্ভব নয়'}"),
    ('{"বাতিল করুন"}', "{deleteConfirm.type === 'file' ? 'Cancel' : 'বাতিল করুন'}"),
    ('{"নিশ্চিত করুন"}', "{deleteConfirm.type === 'file' ? 'Yes, Delete' : 'নিশ্চিত করুন'}")
]

# Notes Modal
notes_modal_replacements = [
    ('{"নোট ও রিমার্কস"}', "{selectedNoteFile?.fileName ? 'Entry Notes & Remarks' : 'নোট ও রিমার্কস'}"),
    ('{"নথি সংক্রান্ত গুরুত্বপূর্ণ নোট / মন্তব্য"}', "{selectedNoteFile?.fileName ? 'Important Notes / Comments regarding this record' : 'নথি সংক্রান্ত গুরুত্বপূর্ণ নোট / মন্তব্য'}"),
    ('{"নোট সংরক্ষণ করা হলে তা এই ফাইলের সাথে চিরস্থায়ীভাবে যুক্ত থাকবে। শুধুমাত্র এডমিন এবং অনুমোদিত ব্যবহারকারীরা এই নোট এডিট করতে পারবেন।"}', "{selectedNoteFile?.fileName ? 'Saved notes are permanently bound to this record. Admins and authorized contributors can read and modify them at any time.' : 'নোট সংরক্ষণ করা হলে তা এই ফাইলের সাথে চিরস্থায়ীভাবে যুক্ত থাকবে। শুধুমাত্র এডমিন এবং অনুমোদিত ব্যবহারকারীরা এই নোট এডিট করতে পারবেন।'}"),
    ('{"নোট সংরক্ষণ করুন"}', "{selectedNoteFile?.fileName ? 'Save Note' : 'নোট সংরক্ষণ করুন'}")
]

for old, new in edit_modal_replacements + delete_modal_replacements + notes_modal_replacements:
    text = text.replace(old, new)
    
# special case for placeholder inside Notes Modal
text = text.replace(
    'placeholder={"এখানে আপনার নথি সংক্রান্ত যেকোনো মন্তব্য বা নোট লিখতে পারেন যা ভবিষ্যতে ট্র্যাক করতে সুবিধা হবে..."}',
    'placeholder={selectedNoteFile?.fileName ? "Type here any important remarks or comments about this record to track in the future..." : "এখানে আপনার নথি সংক্রান্ত যেকোনো মন্তব্য বা নোট লিখতে পারেন যা ভবিষ্যতে ট্র্যাক করতে সুবিধা হবে..."}'
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
