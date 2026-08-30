import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Update import
text = text.replace('import { FileEntry, MemoEntry', 'import { FileEntry, MemoEntry, ExpenseEntry')

# Add handleAddExpense & handleDeleteExpense
functions_code = """
  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userProfile) return;
    
    setExpenseErrorMsg('');
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const date = formData.get('expenseDate') as string;
    const budgetCode = formData.get('budgetCode') as string;
    const amount = Number(formData.get('amount'));
    const description = formData.get('description') as string;

    if (!date || !budgetCode || !amount || !description) {
      setExpenseErrorMsg('Please fill all fields');
      return;
    }

    try {
      const parts = date.split('-');
      const formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`;

      await addDoc(collection(db, 'expenses'), {
        budgetCode,
        amount,
        date: formattedDate,
        description,
        createdBy: userProfile.email,
        createdAt: serverTimestamp(),
      });

      if (userProfile.role !== 'Admin') {
         await logAction('expense', 'CREATE', `Expense of ৳${amount} for ${budgetCode}`, userProfile.email);
      }

      setIsAddExpenseModalOpen(false);
    } catch (err: any) {
      setExpenseErrorMsg(err.message || 'Failed to add expense');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (userProfile?.role !== 'Admin') return;
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteDoc(doc(db, 'expenses', id));
      } catch (err) {
        console.error(err);
      }
    }
  };
"""

text = re.sub(r'(const handleAddMemo = async.*?setIsAddMemoModalOpen\(false\);\n    \} catch \(err: any\) \{\n      setMemoErrorMsg\(err\.message \|\| \'Failed to add memo\'\);\n    \}\n  \};)', r'\1\n' + functions_code, text, flags=re.DOTALL)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
