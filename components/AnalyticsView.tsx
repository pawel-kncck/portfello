'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { TrendingUp, PieChart as PieChartIcon, BarChart3 } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'

interface Expense {
  id: string
  userId: string
  amount: number
  category: string
  date: string
  description: string
  createdAt: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export function AnalyticsView() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('all')
  const { t, formatCurrency, formatMonthYear, language } = useI18n()

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

  const getFilteredExpenses = () => {
    const now = new Date()
    let startDate: Date

    switch (timeRange) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        return expenses
    }

    return expenses.filter(expense => new Date(expense.date) >= startDate)
  }

  const filteredExpenses = getFilteredExpenses()

  const categoryData = filteredExpenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount
    return acc
  }, {} as Record<string, number>)

  const pieChartData = Object.entries(categoryData).map(([category, amount]) => ({
    name: t.categories[category as keyof typeof t.categories] || category,
    value: amount,
  })).sort((a, b) => b.value - a.value)

  const localeMap: Record<string, string> = { pl: 'pl-PL', en: 'en-US' }
  const locale = localeMap[language] || 'pl-PL'

  const monthlyData = filteredExpenses.reduce((acc, expense) => {
    const monthKey = new Date(expense.date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
    })
    acc[monthKey] = (acc[monthKey] || 0) + expense.amount
    return acc
  }, {} as Record<string, number>)

  const barChartData = Object.entries(monthlyData).map(([month, amount]) => ({
    month,
    amount,
  }))

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const averageExpense = filteredExpenses.length > 0 ? totalAmount / filteredExpenses.length : 0
  const topCategory = pieChartData[0]

  if (loading) {
    return <div className="flex items-center justify-center h-64">{t.common.loading}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl text-gray-900">{t.analytics.title}</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">{t.analytics.subtitle}</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.analytics.allTime}</SelectItem>
            <SelectItem value="year">{t.analytics.thisYear}</SelectItem>
            <SelectItem value="month">{t.analytics.thisMonth}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">{t.analytics.totalSpent}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {filteredExpenses.length} {t.common.transactions}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">{t.analytics.averageTransaction}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrency(averageExpense)}</div>
            <p className="text-xs text-muted-foreground">{t.common.perExpense}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">{t.analytics.topCategory}</CardTitle>
            <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{topCategory?.name || t.common.noData}</div>
            <p className="text-xs text-muted-foreground">
              {topCategory ? formatCurrency(topCategory.value) : t.analytics.noExpenseData}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.analytics.spendingByCategory}</CardTitle>
            <CardDescription>{t.analytics.categoryBreakdown}</CardDescription>
          </CardHeader>
          <CardContent>
            {pieChartData.length > 0 ? (
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrency(value), t.common.amount]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 sm:h-80 flex items-center justify-center text-gray-500">
                {t.analytics.noExpenseData}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.analytics.monthlyTrends}</CardTitle>
            <CardDescription>{t.analytics.totalByMonth}</CardDescription>
          </CardHeader>
          <CardContent>
            {barChartData.length > 0 ? (
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), t.common.amount]} />
                    <Bar dataKey="amount" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 sm:h-80 flex items-center justify-center text-gray-500">
                {t.analytics.noExpenseData}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
