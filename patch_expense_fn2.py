import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

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

text = text.replace('const handleCreateMemo = async', functions_code + '\\n  const handleCreateMemo = async')

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
