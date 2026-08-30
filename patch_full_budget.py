import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add states
states_to_add = """
  // Budget & Expense state
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [expenseErrorMsg, setExpenseErrorMsg] = useState('');
"""

text = re.sub(r'(const \[memos, setMemos\] = useState<MemoEntry\[\]>\(\[\]\);)', r'\1' + states_to_add, text)

# Add listener
listener_code = """
      const unsubscribeExpenses = onSnapshot(collection(db, 'expenses'), (snapshot) => {
        const expenseData: ExpenseEntry[] = [];
        snapshot.forEach((doc) => {
          expenseData.push({ id: doc.id, ...doc.data() } as ExpenseEntry);
        });
        setExpenses(expenseData.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
      });
"""
text = re.sub(r'(const unsubscribeMemos = onSnapshot.*?setMemos.*?\}\);)', r'\1' + listener_code, text, flags=re.DOTALL)

# Add cleanup
text = re.sub(r'(return \(\) => \{\s*unsubscribeFiles\(\);\s*unsubscribeMemos\(\);)', r'\1\n      unsubscribeExpenses();', text)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
