'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { Plus, Pencil, Trash2, Loader2, Zap, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { useWallet } from '@/lib/wallet/context'

interface RuleData {
  id: string
  walletId: string
  name: string
  priority: number
  conditions: Record<string, unknown>
  actions: Record<string, unknown>
  enabled: boolean
  createdAt: string
}

type ConditionType = 'description' | 'amount' | 'direction'
type DescriptionOp = 'contains' | 'startsWith' | 'endsWith' | 'regex'
type AmountOp = 'equals' | 'gt' | 'gte' | 'lt' | 'lte'

export function RuleManager() {
  const { t } = useI18n()
  const { activeWallet } = useWallet()
  const [rules, setRules] = useState<RuleData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<RuleData | null>(null)
  const [saving, setSaving] = useState(false)

  // Simplified form
  const [formName, setFormName] = useState('')
  const [conditionType, setConditionType] = useState<ConditionType>('description')
  const [descOp, setDescOp] = useState<DescriptionOp>('contains')
  const [descValue, setDescValue] = useState('')
  const [amountOp, setAmountOp] = useState<AmountOp>('equals')
  const [amountValue, setAmountValue] = useState('')
  const [directionValue, setDirectionValue] = useState<'inflow' | 'outflow'>('outflow')
  const [actionCategory, setActionCategory] = useState('')
  const [actionTags, setActionTags] = useState('')
  const [actionType, setActionType] = useState<string>('')

  // JSON editor mode
  const [jsonMode, setJsonMode] = useState(false)
  const [jsonConditions, setJsonConditions] = useState('')
  const [jsonActions, setJsonActions] = useState('')

  const fetchRules = useCallback(async () => {
    if (!activeWallet) return
    setLoading(true)
    try {
      const res = await fetch(`/api/wallets/${activeWallet.id}/rules`)
      if (res.ok) {
        const data = await res.json()
        setRules(data.rules)
      }
    } catch {
      setError('Failed to load rules')
    } finally {
      setLoading(false)
    }
  }, [activeWallet])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const resetForm = () => {
    setFormName('')
    setConditionType('description')
    setDescOp('contains')
    setDescValue('')
    setAmountOp('equals')
    setAmountValue('')
    setDirectionValue('outflow')
    setActionCategory('')
    setActionTags('')
    setActionType('')
    setJsonMode(false)
    setJsonConditions('')
    setJsonActions('')
  }

  const openCreateDialog = () => {
    setEditingRule(null)
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (rule: RuleData) => {
    setEditingRule(rule)
    setFormName(rule.name)
    setJsonConditions(JSON.stringify(rule.conditions, null, 2))
    setJsonActions(JSON.stringify(rule.actions, null, 2))

    // Try to populate simplified form from existing rule
    const conds = rule.conditions as Record<string, Record<string, string>>
    const acts = rule.actions as Record<string, unknown>

    if (conds.description) {
      setConditionType('description')
      const ops = Object.keys(conds.description) as DescriptionOp[]
      if (ops.length > 0) {
        setDescOp(ops[0])
        setDescValue(String(conds.description[ops[0]]))
      }
    } else if (conds.amount) {
      setConditionType('amount')
      const ops = Object.keys(conds.amount) as AmountOp[]
      if (ops.length > 0) {
        setAmountOp(ops[0])
        setAmountValue(String(conds.amount[ops[0]]))
      }
    } else if (conds.direction) {
      setConditionType('direction')
      setDirectionValue((conds.direction.equals as 'inflow' | 'outflow') || 'outflow')
    }

    setActionCategory((acts.category as string) || '')
    setActionTags(Array.isArray(acts.tags) ? (acts.tags as string[]).join(', ') : '')
    setActionType((acts.type as string) || '')

    // Default to JSON mode for complex rules
    const condKeys = Object.keys(conds)
    if (condKeys.length > 1) {
      setJsonMode(true)
    } else {
      setJsonMode(false)
    }

    setDialogOpen(true)
  }

  const buildConditions = (): Record<string, unknown> => {
    if (jsonMode) {
      return JSON.parse(jsonConditions)
    }

    switch (conditionType) {
      case 'description':
        return { description: { [descOp]: descValue } }
      case 'amount':
        return { amount: { [amountOp]: Number(amountValue) } }
      case 'direction':
        return { direction: { equals: directionValue } }
      default:
        return {}
    }
  }

  const buildActions = (): Record<string, unknown> => {
    if (jsonMode) {
      return JSON.parse(jsonActions)
    }

    const actions: Record<string, unknown> = {}
    if (actionCategory.trim()) actions.category = actionCategory.trim()
    if (actionTags.trim()) actions.tags = actionTags.split(',').map(t => t.trim()).filter(Boolean)
    if (actionType) actions.type = actionType
    return actions
  }

  const handleSave = async () => {
    if (!activeWallet || !formName.trim()) return
    setSaving(true)
    setError(null)

    try {
      const conditions = buildConditions()
      const actions = buildActions()

      if (Object.keys(conditions).length === 0) {
        setError(t.ruleManagement.conditionRequired)
        setSaving(false)
        return
      }
      if (Object.keys(actions).length === 0) {
        setError(t.ruleManagement.actionRequired)
        setSaving(false)
        return
      }

      const payload = { name: formName.trim(), conditions, actions }

      if (editingRule) {
        const res = await fetch(`/api/wallets/${activeWallet.id}/rules/${editingRule.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Failed to update rule')
          setSaving(false)
          return
        }
      } else {
        const res = await fetch(`/api/wallets/${activeWallet.id}/rules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Failed to create rule')
          setSaving(false)
          return
        }
      }

      setDialogOpen(false)
      await fetchRules()
    } catch (e) {
      setError(e instanceof SyntaxError ? 'Invalid JSON' : 'Failed to save rule')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (ruleId: string) => {
    if (!activeWallet) return
    if (!confirm(t.ruleManagement.deleteConfirm)) return

    try {
      const res = await fetch(`/api/wallets/${activeWallet.id}/rules/${ruleId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to delete rule')
        return
      }
      await fetchRules()
    } catch {
      setError('Failed to delete rule')
    }
  }

  const handleToggle = async (rule: RuleData) => {
    if (!activeWallet) return

    try {
      await fetch(`/api/wallets/${activeWallet.id}/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled }),
      })
      await fetchRules()
    } catch {
      setError('Failed to toggle rule')
    }
  }

  const describeConditions = (conditions: Record<string, unknown>): string => {
    const parts: string[] = []
    const conds = conditions as Record<string, Record<string, unknown>>

    if (conds.description) {
      const ops = Object.entries(conds.description)
      for (const [op, val] of ops) {
        parts.push(`${t.ruleManagement.description} ${t.ruleManagement[op as keyof typeof t.ruleManagement] || op} "${val}"`)
      }
    }
    if (conds.amount) {
      const ops = Object.entries(conds.amount)
      for (const [op, val] of ops) {
        parts.push(`${t.ruleManagement.amount} ${t.ruleManagement[op as keyof typeof t.ruleManagement] || op} ${val}`)
      }
    }
    if (conds.direction) {
      parts.push(`${t.ruleManagement.direction} = ${conds.direction.equals === 'inflow' ? t.ruleManagement.inflow : t.ruleManagement.outflow}`)
    }

    return parts.join(' & ') || 'No conditions'
  }

  const describeActions = (actions: Record<string, unknown>): string => {
    const parts: string[] = []
    if (actions.category) parts.push(`${t.ruleManagement.setCategory}: ${actions.category}`)
    if (Array.isArray(actions.tags) && actions.tags.length > 0) {
      parts.push(`${t.ruleManagement.addTags}: ${(actions.tags as string[]).join(', ')}`)
    }
    if (actions.type) parts.push(`${t.ruleManagement.setType}: ${actions.type}`)
    return parts.join(' | ') || 'No actions'
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
          <h3 className="text-lg font-medium">{t.ruleManagement.title}</h3>
          <p className="text-sm text-gray-500">{t.ruleManagement.subtitle}</p>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-1" />
          {t.ruleManagement.addRule}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {rules.length === 0 ? (
        <Card>
          <CardContent className="p-4">
            <div className="text-center py-8">
              <Zap className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">{t.ruleManagement.noRules}</p>
              <p className="text-xs text-gray-400 mt-1">{t.ruleManagement.noRulesDescription}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <Card key={rule.id} className={!rule.enabled ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 min-w-0 flex-1">
                    <GripVertical className="h-5 w-5 text-gray-300 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">{rule.name}</span>
                        <Badge variant={rule.enabled ? 'default' : 'secondary'} className="text-xs">
                          {rule.enabled ? t.ruleManagement.enabled : t.ruleManagement.disabled}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">
                        <span className="font-medium">{t.ruleManagement.conditions}:</span>{' '}
                        {describeConditions(rule.conditions)}
                      </p>
                      <p className="text-xs text-gray-500">
                        <span className="font-medium">{t.ruleManagement.actions}:</span>{' '}
                        {describeActions(rule.actions)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0 ml-2">
                    <button
                      onClick={() => handleToggle(rule)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                      title={rule.enabled ? t.ruleManagement.disabled : t.ruleManagement.enabled}
                    >
                      {rule.enabled ? (
                        <ToggleRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => openEditDialog(rule)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? t.ruleManagement.editRule : t.ruleManagement.addRule}
            </DialogTitle>
            <DialogDescription>
              {editingRule ? t.ruleManagement.editRule : t.ruleManagement.addRule}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.ruleManagement.ruleName}</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t.ruleManagement.ruleNamePlaceholder}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant={jsonMode ? 'outline' : 'default'}
                onClick={() => setJsonMode(false)}
              >
                Simple
              </Button>
              <Button
                size="sm"
                variant={jsonMode ? 'default' : 'outline'}
                onClick={() => {
                  setJsonMode(true)
                  if (!jsonConditions) {
                    try { setJsonConditions(JSON.stringify(buildConditions(), null, 2)) } catch { /* ignore */ }
                  }
                  if (!jsonActions) {
                    try { setJsonActions(JSON.stringify(buildActions(), null, 2)) } catch { /* ignore */ }
                  }
                }}
              >
                JSON
              </Button>
            </div>

            {jsonMode ? (
              <>
                <div>
                  <Label>{t.ruleManagement.conditions} (JSON)</Label>
                  <Textarea
                    value={jsonConditions}
                    onChange={(e) => setJsonConditions(e.target.value)}
                    rows={5}
                    className="font-mono text-sm"
                    placeholder='{ "description": { "contains": "allegro" } }'
                  />
                </div>
                <div>
                  <Label>{t.ruleManagement.actions} (JSON)</Label>
                  <Textarea
                    value={jsonActions}
                    onChange={(e) => setJsonActions(e.target.value)}
                    rows={4}
                    className="font-mono text-sm"
                    placeholder='{ "category": "Shopping", "tags": ["online"] }'
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>{t.ruleManagement.conditions}</Label>
                  <Select value={conditionType} onValueChange={(v) => setConditionType(v as ConditionType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="description">{t.ruleManagement.description}</SelectItem>
                      <SelectItem value="amount">{t.ruleManagement.amount}</SelectItem>
                      <SelectItem value="direction">{t.ruleManagement.direction}</SelectItem>
                    </SelectContent>
                  </Select>

                  {conditionType === 'description' && (
                    <div className="flex items-center space-x-2 mt-2">
                      <Select value={descOp} onValueChange={(v) => setDescOp(v as DescriptionOp)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contains">{t.ruleManagement.contains}</SelectItem>
                          <SelectItem value="startsWith">{t.ruleManagement.startsWith}</SelectItem>
                          <SelectItem value="endsWith">{t.ruleManagement.endsWith}</SelectItem>
                          <SelectItem value="regex">{t.ruleManagement.regex}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={descValue}
                        onChange={(e) => setDescValue(e.target.value)}
                        placeholder="..."
                        className="flex-1"
                      />
                    </div>
                  )}

                  {conditionType === 'amount' && (
                    <div className="flex items-center space-x-2 mt-2">
                      <Select value={amountOp} onValueChange={(v) => setAmountOp(v as AmountOp)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">{t.ruleManagement.equals}</SelectItem>
                          <SelectItem value="gt">{t.ruleManagement.greaterThan}</SelectItem>
                          <SelectItem value="lt">{t.ruleManagement.lessThan}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={amountValue}
                        onChange={(e) => setAmountValue(e.target.value)}
                        placeholder="0.00"
                        className="flex-1"
                      />
                    </div>
                  )}

                  {conditionType === 'direction' && (
                    <div className="mt-2">
                      <Select value={directionValue} onValueChange={(v) => setDirectionValue(v as 'inflow' | 'outflow')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inflow">{t.ruleManagement.inflow}</SelectItem>
                          <SelectItem value="outflow">{t.ruleManagement.outflow}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>{t.ruleManagement.actions}</Label>
                  <div>
                    <Label className="text-xs text-gray-500">{t.ruleManagement.setCategory}</Label>
                    <Input
                      value={actionCategory}
                      onChange={(e) => setActionCategory(e.target.value)}
                      placeholder="e.g. Shopping > E-commerce"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">{t.ruleManagement.addTags}</Label>
                    <Input
                      value={actionTags}
                      onChange={(e) => setActionTags(e.target.value)}
                      placeholder="e.g. online, children"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">{t.ruleManagement.setType}</Label>
                    <Select value={actionType} onValueChange={setActionType}>
                      <SelectTrigger>
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-</SelectItem>
                        <SelectItem value="expense">{t.ruleManagement.expense}</SelectItem>
                        <SelectItem value="income">{t.ruleManagement.income}</SelectItem>
                        <SelectItem value="cost_reduction">{t.ruleManagement.costReduction}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.ruleManagement.saving}
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
