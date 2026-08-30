import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
in_file_section = False
in_memo_section = False
in_add_file_modal = False
in_add_memo_modal = False

def replace_with_en(match):
    return match.group(2)

def replace_with_bn(match):
    return match.group(1)

# A simple regex to match {lang === 'BN' ? "bn" : "en"}
# we need to be careful about nested quotes, but looking at the grep output, it's mostly straightforward.
# We also have some template literals like {lang === 'BN' ? `...` : `...`}
# Let's just use a Python script to do simple string replacements for the specific known lines,
# or we can use a more general regex if it's safe.

pattern = re.compile(r"lang === 'BN' \? ([\"'\`].*?[\"'\`]) \: ([\"'\`].*?[\"'\`])")

for i, line in enumerate(lines):
    # detect sections
    if 'id="file-register-section"' in line or 'activeTab === \'files\'' in line:
        in_file_section = True
        in_memo_section = False
    elif 'id="memo-register-section"' in line or 'activeTab === \'memos\'' in line:
        in_file_section = False
        in_memo_section = True
    elif 'activeTab === \'analytics\'' in line or 'activeTab === \'security\'' in line:
        in_file_section = False
        in_memo_section = False
        
    if 'নতুন ফাইল রেজিস্টার করুন' in line or 'BSK File Opening Register' in line:
        in_add_file_modal = True
        in_add_memo_modal = False
    elif 'নতুন মেমো এন্ট্রি করুন' in line or 'BSK Memo Register' in line:
        in_add_file_modal = False
        in_add_memo_modal = True

    # Check if we should replace
    if in_file_section or in_add_file_modal:
        line = pattern.sub(replace_with_en, line)
    elif in_memo_section or in_add_memo_modal:
        line = pattern.sub(replace_with_bn, line)
        
    # Also handle some modal text that might be shared, like edit modal
    
    new_lines.append(line)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
