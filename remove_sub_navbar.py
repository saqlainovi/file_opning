import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(
    r'\{/\* Secondary Navigation Tab Bar \*/\}.*?\{/\* Main Content Area \*/\}',
    '{/* Main Content Area */}',
    text,
    flags=re.DOTALL
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
