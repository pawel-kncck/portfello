'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, FolderOpen, Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { useWallet } from '@/lib/wallet/context'

interface Category {
  id: string
  walletId: string
  parentId: string | null
  name: string
  color: string
  sortOrder: number
  children: Category[]
}

interface FlatCategory {
  id: string
  walletId: string
  parentId: string | null
  name: string
  color: string
  sortOrder: number
}

export function CategoryManager() {
  const { t } = useI18n()
  const { activeWallet } = useWallet()
  const [categories, setCategories] = useState<Category[]>([])
  const [flatCategories, setFlatCategories] = useState<FlatCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<FlatCategory | null>(null)
  const [formName, setFormName] = useState('')
  const [formColor, setFormColor] = useState('#6B7280')
  const [formParentId, setFormParentId] = useState<string>('root')
  const [saving, setSaving] = useState(false)

  const fetchCategories = useCallback(async () => {
    if (!activeWallet) return
    setLoading(true)
    try {
      const res = await fetch(`/api/wallets/${activeWallet.id}/categories`)
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories)
        setFlatCategories(data.flat)
      }
    } catch {
      setError('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [activeWallet])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openCreateDialog = (parentId: string | null = null) => {
    setEditingCategory(null)
    setFormName('')
    setFormColor('#6B7280')
    setFormParentId(parentId || 'root')
    setDialogOpen(true)
  }

  const openEditDialog = (cat: FlatCategory) => {
    setEditingCategory(cat)
    setFormName(cat.name)
    setFormColor(cat.color)
    setFormParentId(cat.parentId || 'root')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!activeWallet || !formName.trim()) return
    setSaving(true)
    setError(null)

    try {
      const parentId = formParentId === 'root' ? null : formParentId

      if (editingCategory) {
        const res = await fetch(`/api/wallets/${activeWallet.id}/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName.trim(), color: formColor, parentId }),
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Failed to update category')
          setSaving(false)
          return
        }
      } else {
        const res = await fetch(`/api/wallets/${activeWallet.id}/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName.trim(), color: formColor, parentId }),
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Failed to create category')
          setSaving(false)
          return
        }
      }

      setDialogOpen(false)
      await fetchCategories()
    } catch {
      setError('Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (catId: string) => {
    if (!activeWallet) return
    if (!confirm(t.categoryManagement.deleteConfirm)) return

    try {
      const res = await fetch(`/api/wallets/${activeWallet.id}/categories/${catId}?reassignTo=root`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to delete category')
        return
      }
      await fetchCategories()
    } catch {
      setError('Failed to delete category')
    }
  }

  const renderCategory = (cat: Category, depth: number = 0) => {
    const isExpanded = expandedIds.has(cat.id)
    const hasChildren = cat.children && cat.children.length > 0

    return (
      <div key={cat.id}>
        <div
          className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-lg group"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            {hasChildren ? (
              <button onClick={() => toggleExpand(cat.id)} className="p-0.5">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: cat.color }}
            />
            <span className="text-sm text-gray-900 truncate">{cat.name}</span>
          </div>
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => openCreateDialog(cat.id)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title={t.categoryManagement.addSubcategory}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => openEditDialog({
                id: cat.id,
                walletId: cat.walletId,
                parentId: cat.parentId,
                name: cat.name,
                color: cat.color,
                sortOrder: cat.sortOrder,
              })}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title={t.categoryManagement.editCategory}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleDelete(cat.id)}
              className="p-1 text-gray-400 hover:text-red-600 rounded"
              title={t.categoryManagement.deleteCategory}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {cat.children.map(child => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t.categoryManagement.title}</h3>
          <p className="text-sm text-gray-500">{t.categoryManagement.subtitle}</p>
        </div>
        <Button size="sm" onClick={() => openCreateDialog()}>
          <Plus className="h-4 w-4 mr-1" />
          {t.categoryManagement.addCategory}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-2">
          {categories.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">{t.categoryManagement.noCategories}</p>
              <p className="text-xs text-gray-400 mt-1">{t.categoryManagement.noCategoriesDescription}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {categories.map(cat => renderCategory(cat))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t.categoryManagement.editCategory : t.categoryManagement.addCategory}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? t.categoryManagement.editCategory : t.categoryManagement.addCategory}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cat-name">{t.categoryManagement.categoryName}</Label>
              <Input
                id="cat-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t.categoryManagement.categoryNamePlaceholder}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>
            <div>
              <Label htmlFor="cat-color">{t.categoryManagement.color}</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  id="cat-color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="h-10 w-10 rounded border cursor-pointer"
                />
                <Input
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="w-28"
                  maxLength={7}
                />
              </div>
            </div>
            <div>
              <Label>{t.categoryManagement.parentCategory}</Label>
              <Select value={formParentId} onValueChange={setFormParentId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">{t.categoryManagement.noParent}</SelectItem>
                  {flatCategories
                    .filter(c => c.id !== editingCategory?.id)
                    .map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center space-x-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                          <span>{c.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.categoryManagement.saving}
                </>
              ) : (
                t.common.save
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
