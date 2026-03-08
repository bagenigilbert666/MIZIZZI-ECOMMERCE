"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import type { InvalidationHistoryEntry } from "@/types/cache-management"
import { CheckCircle, AlertCircle, Clock } from "lucide-react"

interface InvalidationHistoryProps {
  history: InvalidationHistoryEntry[]
  isLoading?: boolean
  total?: number
}

export function InvalidationHistory({ history, isLoading, total }: InvalidationHistoryProps) {
  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-600" />
            Invalidation History
          </CardTitle>
          <CardDescription>Recent cache invalidation operations</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isLoading ? "Loading history..." : "No invalidation history available"}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-slate-600" />
          Invalidation History
        </CardTitle>
        <CardDescription>
          Recent cache invalidation operations {total ? `(${total} total)` : ""}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-full">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Time</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Admin</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Action</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Cache Groups</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Keys Deleted</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{entry.adminName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize">
                        {entry.action.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {entry.cacheGroups.length > 0
                          ? entry.cacheGroups.map((group) => (
                              <Badge key={group} variant="secondary" className="text-xs">
                                {group}
                              </Badge>
                            ))
                          : <span className="text-xs text-slate-500 dark:text-slate-400">—</span>
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {entry.keysDeleted.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {entry.status === "success" && (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                              Success
                            </Badge>
                          </>
                        )}
                        {entry.status === "partial" && (
                          <>
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                              Partial
                            </Badge>
                          </>
                        )}
                        {entry.status === "failed" && (
                          <>
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                              Failed
                            </Badge>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {history.length > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
            Showing {history.length} of {total || history.length} entries
          </p>
        )}
      </CardContent>
    </Card>
  )
}
