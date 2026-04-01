'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { TrendingUp, PieChart as PieChartIcon, BarChart3 } from 'lucide-react'

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

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    try {
      // TODO: Replace with /api/expenses call (Step 4)
      setExpenses([])
    } catch (error) {
      console.log('Error fetching expenses:', error)
    } finally {
      setLoading(false)
    }
  }

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
    name: category,
    value: amount,
  })).sort((a, b) => b.value - a.value)

  const monthlyData = filteredExpenses.reduce((acc, expense) => {
    const monthKey = new Date(expense.date).toLocaleDateString('en-US', {
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
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl text-gray-900">Analytics</h2>
          <p className="text-gray-600 mt-1">Analyze your spending patterns</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">${totalAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {filteredExpenses.length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Average Transaction</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">${averageExpense.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per expense</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Top Category</CardTitle>
            <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{topCategory?.name || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {topCategory ? `$${topCategory.value.toFixed(2)}` : 'No data'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Breakdown of expenses by category</CardDescription>
          </CardHeader>
          <CardContent>
            {pieChartData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                No expense data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
            <CardDescription>Total expenses by month</CardDescription>
          </CardHeader>
          <CardContent>
            {barChartData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']} />
                    <Bar dataKey="amount" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                No expense data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
