import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Edit2, Trash2, Calendar, DollarSign } from 'lucide-react';
import { EditExpenseModal } from './EditExpenseModal';

interface Expense {
  id: string;
  userId: string;
  amount: number;
  category: string;
  date: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
}

interface ExpenseListProps {
  expenses: Expense[];
  loading: boolean;
  onUpdate: (id: string, data: Partial<Expense>) => Promise<{ success: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export function ExpenseList({ expenses, loading, onUpdate, onDelete }: ExpenseListProps) {
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-gray-900">No expenses yet</h3>
        <p className="mt-1 text-gray-500">
          Get started by adding your first expense.
        </p>
      </div>
    );
  }

  // Group expenses by month
  const groupedExpenses = expenses.reduce((groups, expense) => {
    const monthKey = new Date(expense.date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
    
    if (!groups[monthKey]) {
      groups[monthKey] = [];
    }
    groups[monthKey].push(expense);
    return groups;
  }, {} as Record<string, Expense[]>);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Food': 'bg-orange-100 text-orange-800',
      'Transport': 'bg-blue-100 text-blue-800',
      'Utilities': 'bg-green-100 text-green-800',
      'Entertainment': 'bg-purple-100 text-purple-800',
      'Healthcare': 'bg-red-100 text-red-800',
      'Shopping': 'bg-pink-100 text-pink-800',
      'Other': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors['Other'];
  };

  const handleDelete = async (expense: Expense) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      await onDelete(expense.id);
    }
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedExpenses).map(([month, monthExpenses]) => {
        const monthTotal = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        
        return (
          <div key={month} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <h3 className="text-lg text-gray-900">{month}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Total:</span>
                <span className="text-lg text-gray-900">${monthTotal.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              {monthExpenses.map((expense) => (
                <div key={expense.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <Badge className={getCategoryColor(expense.category)}>
                        {expense.category}
                      </Badge>
                      <span className="text-lg text-gray-900">
                        ${expense.amount.toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(expense.date).toLocaleDateString()}
                      </span>
                    </div>
                    {expense.description && (
                      <p className="mt-1 text-sm text-gray-600">{expense.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingExpense(expense)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(expense)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <Separator />
          </div>
        );
      })}
      
      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          isOpen={!!editingExpense}
          onClose={() => setEditingExpense(null)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}