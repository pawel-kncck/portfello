'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Plus, Calendar, TrendingUp, Pencil, Trash2, Wallet } from 'lucide-react'
import { AddExpenseModal } from './AddExpenseModal'
import { EditExpenseModal } from './EditExpenseModal'
import { useI18n } from '@/lib/i18n/context'

interface Expense {
  id: string
  userId: string
  amount: number
  category: string
  date: string
  description: string
  createdAt: string
  updatedAt?: string
}

export function DashboardView() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const { t, formatCurrency, formatDate } = useI18n()

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch('/api/expenses')
      if (res.ok) {
        const data = await res.json()
        setExpenses(data.expenses || [])
      }
    } catch (error) {
      console.log('Error fetching expenses:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const handleAdd = async (expense: { amount: number; category: string; date: string; description: string }) => {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    })
    if (!res.ok) {
      const data = await res.json()
      return { success: false, error: data.error || t.expenses.addFailed }
    }
    await fetchExpenses()
    return { success: true }
  }

  const handleUpdate = async (id: string, data: Partial<Expense>) => {
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      return { success: false, error: err.error || t.expenses.updateFailed }
    }
    await fetchExpenses()
    return { success: true }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    if (res.ok) {
      await fetchExpenses()
    }
  }

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthlyExpenses = expenses.filter(exp => exp.date.startsWith(currentMonth))
  const monthlyTotal = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl text-gray-900">
            {t.dashboard.welcomeBack}
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {t.dashboard.trackExpenses}
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto" onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t.dashboard.addExpense}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">{t.dashboard.thisMonth}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrency(monthlyTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {monthlyExpenses.length} {t.common.transactions}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">{t.dashboard.totalExpenses}</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {expenses.length} {t.common.totalTransactions}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">{t.dashboard.average}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">
              {formatCurrency(expenses.length > 0 ? totalExpenses / expenses.length : 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t.common.perTransaction}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.dashboard.recentExpenses}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">{t.common.loading}</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-500">{t.dashboard.noExpensesYet}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {expenses.slice(0, 10).map((expense) => (
                <div key={expense.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="font-medium">{formatCurrency(expense.amount)}</span>
                      <span className="px-2 py-1 text-xs bg-gray-100 rounded">
                        {t.categories[expense.category as keyof typeof t.categories] || expense.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      {formatDate(expense.date)} - {expense.description || t.common.noDescription}
                    </p>
                  </div>
                  <div className="flex space-x-2 self-end sm:self-center">
                    <Button variant="ghost" size="sm" onClick={() => setEditingExpense(expense)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(expense.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddExpenseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAdd}
      />

      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          isOpen={!!editingExpense}
          onClose={() => setEditingExpense(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  )
}
