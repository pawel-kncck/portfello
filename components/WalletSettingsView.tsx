'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { useI18n } from '@/lib/i18n/context'
import { useWallet } from '@/lib/wallet/context'
import { CategoryManager } from './CategoryManager'
import { TagManager } from './TagManager'
import { RuleManager } from './RuleManager'

type Tab = 'categories' | 'tags' | 'rules'

export function WalletSettingsView() {
  const { t } = useI18n()
  const { activeWallet } = useWallet()
  const [activeTab, setActiveTab] = useState<Tab>('categories')

  if (!activeWallet) {
    return (
      <div className="text-center py-12 text-gray-500">
        {t.common.loading}
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'categories', label: t.walletSettings.categoriesTab },
    { key: 'tags', label: t.walletSettings.tagsTab },
    { key: 'rules', label: t.walletSettings.rulesTab },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl text-gray-900">
          {t.walletSettings.title}
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          {t.walletSettings.subtitle} — <span className="font-medium">{activeWallet.name}</span>
        </p>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map(tab => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <Separator />

      {activeTab === 'categories' && <CategoryManager />}
      {activeTab === 'tags' && <TagManager />}
      {activeTab === 'rules' && <RuleManager />}
    </div>
  )
}
