'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { Plus, Pencil, Trash2, Tag, Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { useWallet } from '@/lib/wallet/context'

interface TagData {
  id: string
  walletId: string
  name: string
  createdAt: string
}

export function TagManager() {
  const { t } = useI18n()
  const { activeWallet } = useWallet()
  const [tags, setTags] = useState<TagData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  // Inline create state
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchTags = useCallback(async () => {
    if (!activeWallet) return
    setLoading(true)
    try {
      const res = await fetch(`/api/wallets/${activeWallet.id}/tags`)
      if (res.ok) {
        const data = await res.json()
        setTags(data.tags)
      }
    } catch {
      setError('Failed to load tags')
    } finally {
      setLoading(false)
    }
  }, [activeWallet])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  const handleCreate = async () => {
    if (!activeWallet || !newName.trim()) return
    setCreating(true)
    setError(null)

    try {
      const res = await fetch(`/api/wallets/${activeWallet.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to create tag')
        setCreating(false)
        return
      }
      setNewName('')
      setShowCreate(false)
      await fetchTags()
    } catch {
      setError('Failed to create tag')
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = async (tagId: string) => {
    if (!activeWallet || !editName.trim()) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/wallets/${activeWallet.id}/tags/${tagId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to update tag')
        setSaving(false)
        return
      }
      setEditingId(null)
      await fetchTags()
    } catch {
      setError('Failed to update tag')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (tagId: string) => {
    if (!activeWallet) return
    if (!confirm(t.tagManagement.deleteConfirm)) return

    try {
      const res = await fetch(`/api/wallets/${activeWallet.id}/tags/${tagId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to delete tag')
        return
      }
      await fetchTags()
    } catch {
      setError('Failed to delete tag')
    }
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
          <h3 className="text-lg font-medium">{t.tagManagement.title}</h3>
          <p className="text-sm text-gray-500">{t.tagManagement.subtitle}</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          {t.tagManagement.addTag}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showCreate && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t.tagManagement.tagNamePlaceholder}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                  if (e.key === 'Escape') { setShowCreate(false); setNewName('') }
                }}
                autoFocus
                className="flex-1"
              />
              <Button size="sm" onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating ? t.tagManagement.creating : t.common.save}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowCreate(false); setNewName('') }}>
                {t.common.cancel}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          {tags.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">{t.tagManagement.noTags}</p>
              <p className="text-xs text-gray-400 mt-1">{t.tagManagement.noTagsDescription}</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <div key={tag.id} className="group">
                  {editingId === tag.id ? (
                    <div className="flex items-center space-x-1">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEdit(tag.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="h-7 w-32 text-xs"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleEdit(tag.id)} disabled={saving}>
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : t.common.save}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingId(null)}>
                        {t.common.cancel}
                      </Button>
                    </div>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="text-sm py-1 px-3 cursor-default flex items-center space-x-1.5"
                    >
                      <span>{tag.name}</span>
                      <button
                        onClick={() => { setEditingId(tag.id); setEditName(tag.name) }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-blue-600"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(tag.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
