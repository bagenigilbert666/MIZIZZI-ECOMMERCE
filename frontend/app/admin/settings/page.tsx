'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Save, Search, AlertCircle, Download, Upload, RotateCcw, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { adminService } from '@/services/admin'
import { SettingCard, SettingSection } from '@/components/admin/settings'

interface AllSettings {
  site?: any
  seo?: any
  email?: any
  payment?: any
  inventory?: any
  reviews?: any
  security?: any
  maintenance?: any
  notifications?: any
  shipping?: any
  tax?: any
  localization?: any
  advanced?: any
}

const SETTING_CATEGORIES = [
  { id: 'site', label: 'Site', icon: '🏪', color: 'bg-blue-50' },
  { id: 'inventory', label: 'Inventory', icon: '📦', color: 'bg-emerald-50' },
  { id: 'reviews', label: 'Reviews', icon: '⭐', color: 'bg-amber-50' },
  { id: 'security', label: 'Security', icon: '🔒', color: 'bg-red-50' },
  { id: 'payment', label: 'Payment', icon: '💳', color: 'bg-purple-50' },
  { id: 'seo', label: 'SEO', icon: '🔍', color: 'bg-indigo-50' },
  { id: 'email', label: 'Email', icon: '📧', color: 'bg-cyan-50' },
  { id: 'notifications', label: 'Notifications', icon: '🔔', color: 'bg-orange-50' },
  { id: 'shipping', label: 'Shipping', icon: '🚚', color: 'bg-teal-50' },
  { id: 'tax', label: 'Tax', icon: '💰', color: 'bg-green-50' },
  { id: 'localization', label: 'Localization', icon: '🌍', color: 'bg-pink-50' },
  { id: 'maintenance', label: 'Maintenance', icon: '🔧', color: 'bg-slate-50' },
  { id: 'advanced', label: 'Advanced', icon: '⚙️', color: 'bg-gray-50' },
]

export default function CompleteSettingsPage() {
  const [allSettings, setAllSettings] = useState<AllSettings>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [history, setHistory] = useState([])
  const { toast } = useToast()

  // Fetch all settings on mount
  useEffect(() => {
    fetchAllSettings()
  }, [])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (hasChanges) saveAllSettings()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault()
        fetchAllSettings()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasChanges])

  const fetchAllSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      const [
        mainSettings,
        notifications,
        shipping,
        tax,
        localization,
        advanced,
        historyData
      ] = await Promise.all([
        adminService.getSettings().catch(() => ({ success: true, settings: {} })),
        adminService.getNotificationSettings().catch(() => ({ success: true, settings: {} })),
        adminService.getShippingSettings().catch(() => ({ success: true, settings: {} })),
        adminService.getTaxSettings().catch(() => ({ success: true, settings: {} })),
        adminService.getLocalizationSettings().catch(() => ({ success: true, settings: {} })),
        adminService.getAdvancedSettings().catch(() => ({ success: true, settings: {} })),
        adminService.getSettingsHistory(1, 10).catch(() => ({ success: true, history: [] }))
      ])

      setAllSettings({
        ...mainSettings.settings,
        notifications: notifications.settings,
        shipping: shipping.settings,
        tax: tax.settings,
        localization: localization.settings,
        advanced: advanced.settings,
      })
      
      if (historyData.history) {
        setHistory(historyData.history)
      }
    } catch (error) {
      console.error('[v0] Error fetching settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch settings',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const saveAllSettings = useCallback(async () => {
    try {
      setIsSaving(true)
      const response = await adminService.updateSettings(allSettings)
      if (response.success) {
        setHasChanges(false)
        toast({
          title: 'Success',
          description: 'All settings saved successfully',
        })
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to save settings',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('[v0] Error saving settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }, [allSettings, toast])

  const handleSettingUpdate = (category: string, value: any) => {
    setAllSettings((prev) => ({
      ...prev,
      [category]: typeof value === 'object' ? { ...prev[category as keyof AllSettings], ...value } : value,
    }))
    setHasChanges(true)
  }

  const handleExport = useCallback(async () => {
    try {
      const data = await adminService.exportSettings()
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `settings-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast({
        title: 'Success',
        description: 'Settings exported successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export settings',
        variant: 'destructive',
      })
    }
  }, [toast])

  const handleReset = useCallback(async () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      try {
        const response = await adminService.resetSettings(true)
        if (response.success) {
          toast({
            title: 'Success',
            description: 'All settings reset to defaults',
          })
          fetchAllSettings()
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to reset settings',
          variant: 'destructive',
        })
      }
    }
  }, [toast, fetchAllSettings])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-2 border-muted-foreground border-t-foreground animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  const filteredCategories = SETTING_CATEGORIES.filter((cat) =>
    cat.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col gap-4">
            {/* Title */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
              <p className="mt-2 text-muted-foreground">Manage all store configuration and preferences</p>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Search */}
              <div className="relative flex-1 sm:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search settings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
                  className="pl-10 py-2 h-10 text-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAllSettings}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="hidden sm:inline">Reset</span>
                </Button>
                <Button
                  size="sm"
                  onClick={saveAllSettings}
                  disabled={!hasChanges || isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">Save</span>
                </Button>
              </div>
            </div>

            {/* Status Message */}
            {hasChanges && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                You have unsaved changes. Press Cmd+S or click Save to save.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 sm:py-12">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'bg-foreground text-background'
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              activeTab === 'history'
                ? 'bg-foreground text-background'
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            <History className="h-4 w-4 inline mr-2" />
            History
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Settings Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCategories.map((category) => (
                <SettingCard
                  key={category.id}
                  title={category.label}
                  icon={category.icon}
                  description={`Manage ${category.label.toLowerCase()} settings`}
                  onClick={() => {
                    // Scroll to section
                    const element = document.getElementById(`section-${category.id}`)
                    element?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  hasChanges={hasChanges}
                  className={category.color}
                />
              ))}
            </div>

            {/* Detailed Settings Sections */}
            <div className="space-y-16">
              {filteredCategories.map((category) => (
                <div
                  key={category.id}
                  id={`section-${category.id}`}
                  className="scroll-mt-24 space-y-4 rounded-xl border border-border bg-card p-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{category.icon}</span>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">{category.label}</h2>
                      <p className="text-sm text-muted-foreground">
                        Configure {category.label.toLowerCase()} settings for your store
                      </p>
                    </div>
                  </div>

                  {/* Settings Content */}
                  <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {category.id === 'site' && allSettings.site && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Store Name</label>
                          <Input
                            value={allSettings.site?.name || ''}
                            onChange={(e) => handleSettingUpdate('site', { name: e.target.value })}
                            placeholder="Your Store Name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                          <Input
                            value={allSettings.site?.email || ''}
                            onChange={(e) => handleSettingUpdate('site', { email: e.target.value })}
                            placeholder="store@example.com"
                          />
                        </div>
                      </>
                    )}

                    {category.id === 'security' && allSettings.security && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Min Password Length</label>
                          <Input
                            type="number"
                            value={allSettings.security?.password_min_length || 8}
                            onChange={(e) => handleSettingUpdate('security', { password_min_length: parseInt(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Max Login Attempts</label>
                          <Input
                            type="number"
                            value={allSettings.security?.max_login_attempts || 5}
                            onChange={(e) => handleSettingUpdate('security', { max_login_attempts: parseInt(e.target.value) })}
                          />
                        </div>
                      </>
                    )}

                    {category.id === 'inventory' && allSettings.inventory && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Low Stock Threshold</label>
                          <Input
                            type="number"
                            value={allSettings.inventory?.low_stock_threshold || 10}
                            onChange={(e) => handleSettingUpdate('inventory', { low_stock_threshold: parseInt(e.target.value) })}
                          />
                        </div>
                      </>
                    )}

                    {category.id === 'shipping' && allSettings.shipping && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Default Shipping Cost</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={allSettings.shipping?.default_shipping_cost || 0}
                            onChange={(e) => handleSettingUpdate('shipping', { default_shipping_cost: parseFloat(e.target.value) })}
                          />
                        </div>
                      </>
                    )}

                    {category.id === 'tax' && allSettings.tax && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Tax Rate (%)</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={allSettings.tax?.tax_rate || 0}
                            onChange={(e) => handleSettingUpdate('tax', { tax_rate: parseFloat(e.target.value) })}
                          />
                        </div>
                      </>
                    )}

                    {category.id === 'localization' && allSettings.localization && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Default Language</label>
                          <select
                            value={allSettings.localization?.default_language || 'en'}
                            onChange={(e) => handleSettingUpdate('localization', { default_language: e.target.value })}
                            className="w-full px-3 py-2 border border-input rounded-md bg-background"
                          >
                            <option value="en">English</option>
                            <option value="sw">Swahili</option>
                            <option value="fr">French</option>
                          </select>
                        </div>
                      </>
                    )}

                    <div className="text-sm text-muted-foreground col-span-full">
                      {category.id === 'maintenance' && <p>Maintenance settings available for store control</p>}
                      {category.id === 'advanced' && <p>Advanced configuration for system optimization</p>}
                      {category.id === 'reviews' && <p>Review moderation and customer feedback settings</p>}
                      {category.id === 'email' && <p>Email service and transactional email configuration</p>}
                      {category.id === 'notifications' && <p>Notification channels and preferences</p>}
                      {category.id === 'payment' && <p>Payment method configuration and integration</p>}
                      {category.id === 'seo' && <p>Search engine optimization settings</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {history.length > 0 ? (
              history.map((entry: any) => (
                <div key={entry.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">{entry.setting_key}</p>
                      <p className="text-sm text-muted-foreground">
                        Changed by {entry.changed_by} on {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 text-sm">
                    <p className="text-muted-foreground">
                      <span className="line-through">{entry.old_value}</span> → <span className="font-medium">{entry.new_value}</span>
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/50 p-8 text-center">
                <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No settings history available</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
