import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add File Modal
# Replace all Bangla text within the add file modal with English.
# The add file modal is roughly from isAddModalOpen rendering to the end of that modal.
# Let's find the start of the add file modal and end of it.

start_tag = 'isAddModalOpen && ('
end_tag = 'isAddMemoModalOpen && ('

if start_tag in text and end_tag in text:
    start_idx = text.find(start_tag)
    end_idx = text.find(end_tag)
    
    modal_content = text[start_idx:end_idx]
    
    # manual string replacements
    replacements = {
        'Type Custom Subject / নিজে লিখুন': 'Type Custom Subject',
        'Custom / নিজে লিখুন': 'Custom / Type Manually',
        'খণ্ড (Part)': 'Part',
        'কোনোটিই নয় (None)': 'None',
        'খণ্ড ১ (Part 1)': 'Part 1',
        'খণ্ড ২ (Part 2)': 'Part 2',
        'খণ্ড ৩ (Part 3)': 'Part 3',
        'খণ্ড ৪ (Part 4)': 'Part 4',
        'খণ্ড ৫ (Part 5)': 'Part 5',
        'বাতিল': 'Cancel',
        'ফাইল রেজিস্টার করুন': 'Register File',
        '>নতুন ফাইল<': '>New File<',
        'দায়িত্বপ্রাপ্ত কর্মকর্তা': 'Responsible Officer',
        'পদবী (Designation)': 'Designation',
        'অপেক্ষমান': 'Waiting',
        'লোড হচ্ছে...': 'Loading...',
        'লাইভ ফাইল আইডি আউটপুট': 'Live File ID Output'
    }
    
    for k, v in replacements.items():
        modal_content = modal_content.replace(k, v)
        
    text = text[:start_idx] + modal_content + text[end_idx:]

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
