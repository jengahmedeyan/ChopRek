"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  AlertTriangle, 
  CheckCircle, 
  Download, 
  Trash2, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Filter,
  Search
} from "lucide-react"
import { useErrorMonitoring, type ErrorReport } from "@/lib/error-monitoring"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const SEVERITY_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
}

const CATEGORY_COLORS = {
  network: 'bg-blue-100 text-blue-800',
  permission: 'bg-orange-100 text-orange-800',
  chunk: 'bg-yellow-100 text-yellow-800',
  render: 'bg-purple-100 text-purple-800',
  auth: 'bg-red-100 text-red-800',
  firebase: 'bg-indigo-100 text-indigo-800',
  unknown: 'bg-gray-100 text-gray-800'
}

export function ErrorDashboard() {
  const { getErrors, getStats, clearErrors, markResolved, monitor } = useErrorMonitoring()
  const [errors, setErrors] = useState<ErrorReport[]>([])
  const [filteredErrors, setFilteredErrors] = useState<ErrorReport[]>([])
  const [stats, setStats] = useState<any>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [resolvedFilter, setResolvedFilter] = useState<string>('all')

  useEffect(() => {
    const loadData = () => {
      const allErrors = getErrors()
      const errorStats = getStats()
      setErrors(allErrors)
      setStats(errorStats)
    }

    loadData()
    
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [getErrors, getStats])

  useEffect(() => {
    let filtered = [...errors]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(error => 
        error.error.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        error.context.component?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        error.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(error => error.severity === severityFilter)
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(error => error.category === categoryFilter)
    }

    // Resolved filter
    if (resolvedFilter !== 'all') {
      const isResolved = resolvedFilter === 'resolved'
      filtered = filtered.filter(error => error.resolved === isResolved)
    }

    setFilteredErrors(filtered)
  }, [errors, searchTerm, severityFilter, categoryFilter, resolvedFilter])

  const handleMarkResolved = (id: string) => {
    markResolved(id)
    setErrors(getErrors())
  }

  const handleExportErrors = () => {
    const dataStr = monitor.exportErrors()
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `choprek-errors-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all error reports?')) {
      clearErrors()
      setErrors([])
    }
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Error Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage application errors
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportErrors} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleClearAll} variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unresolved</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.unresolved || 0}</div>
            <p className="text-xs text-muted-foreground">
              Needs attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved || 0}</div>
            <p className="text-xs text-muted-foreground">
              Fixed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.bySeverity?.critical || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              High priority
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search errors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Severity</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="network">Network</SelectItem>
                  <SelectItem value="permission">Permission</SelectItem>
                  <SelectItem value="chunk">Chunk Loading</SelectItem>
                  <SelectItem value="render">Render</SelectItem>
                  <SelectItem value="auth">Authentication</SelectItem>
                  <SelectItem value="firebase">Firebase</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unresolved">Unresolved</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Error Reports ({filteredErrors.length})</CardTitle>
          <CardDescription>
            Recent application errors and issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {filteredErrors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <h3 className="text-lg font-semibold mb-2">No Errors Found</h3>
                  <p>No errors match the current filters.</p>
                </div>
              ) : (
                filteredErrors.map((error) => (
                  <Card key={error.id} className={`border-l-4 ${
                    error.resolved ? 'border-l-green-500 bg-green-50' : 'border-l-red-500'
                  }`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{error.error.message}</CardTitle>
                            {error.resolved && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{formatDate(error.timestamp)}</span>
                            <span>•</span>
                            <span>{error.id}</span>
                            {error.context.component && (
                              <>
                                <span>•</span>
                                <span>{error.context.component}</span>
                              </>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Badge className={SEVERITY_COLORS[error.severity]}>
                              {error.severity}
                            </Badge>
                            <Badge className={CATEGORY_COLORS[error.category]}>
                              {error.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!error.resolved && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkResolved(error.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {error.error.stack && (
                      <CardContent className="pt-0">
                        <details className="text-sm">
                          <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                            Stack Trace
                          </summary>
                          <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-40">
                            {error.error.stack}
                          </pre>
                        </details>
                      </CardContent>
                    )}
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
