'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { Loader2, Settings } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import type { Language, Currency } from '@/lib/i18n/types'

export function SettingsView() {
  const { t, language, currency, setLanguage, setCurrency, saveSettings } = useI18n()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    const result = await saveSettings()
    if (result.success) {
      setMessage({ type: 'success', text: t.settings.saved })
    } else {
      setMessage({ type: 'error', text: t.settings.saveFailed })
    }

    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl text-gray-900">{t.settings.title}</h2>
        <p className="text-sm sm:text-base text-gray-600 mt-1">{t.settings.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-gray-500" />
            <CardTitle>{t.settings.language}</CardTitle>
          </div>
          <CardDescription>{t.settings.languageDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pl">{t.settings.polish}</SelectItem>
              <SelectItem value="en">{t.settings.english}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-gray-500" />
            <CardTitle>{t.settings.currency}</CardTitle>
          </div>
          <CardDescription>{t.settings.currencyDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={currency} onValueChange={(val) => setCurrency(val as Currency)}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PLN">{t.settings.pln}</SelectItem>
              <SelectItem value="USD">{t.settings.usd}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.settings.saving}
            </>
          ) : (
            t.common.save
          )}
        </Button>
      </div>
    </div>
  )
}
