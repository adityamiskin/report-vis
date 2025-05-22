"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  ChevronRight,
  ChevronLeft,
  Upload,
  Download,
  Search,
  CheckCircle,
  XCircle,
  HelpCircle,
  FileJson,
  Keyboard,
  Info,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Markdown } from "./components/ui/markdown"

type AcceptStatus = "accepted" | "rejected" | "none"

interface JsonItem {
  filePath: string
  response: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
  status?: AcceptStatus
}

export default function JsonReviewTool() {
  const [data, setData] = useState<JsonItem[]>([])
  const [decisionState, setDecisionState] = useState<AcceptStatus[]>([])
  const [current, setCurrent] = useState(0)
  const [filter, setFilter] = useState<"all" | "accepted" | "rejected" | "none">("all")
  const [viewIndexes, setViewIndexes] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event: ProgressEvent<FileReader>) => {
      try {
        const text = event.target?.result as string
        const json = JSON.parse(text)
        if (Array.isArray(json)) {
          setData(json)
          // If items already have status, use it, otherwise set to "none"
          const statuses = json.map((item) => (item.status as AcceptStatus) || "none")
          setDecisionState(statuses)
          setCurrent(0)
          setFilter("all")
          setViewIndexes(Array.from({ length: json.length }, (_, i) => i))
        } else {
          alert("Uploaded JSON should be an array of objects.")
        }
      } catch {
        alert("Invalid JSON file.")
      }
    }
    reader.readAsText(file)
  }

  const filterDecisionIndexes = (filterOption: typeof filter, decisionArr: AcceptStatus[], search = "") => {
    let indexes = decisionArr.map((_, i) => i)

    // Apply status filter
    if (filterOption !== "all") {
      indexes = indexes.filter((i) => decisionArr[i] === filterOption)
    }

    // Apply search filter if there's a search term
    if (search.trim()) {
      indexes = indexes.filter((i) => {
        const item = data[i]
        return (
          item.filePath?.toLowerCase().includes(search.toLowerCase()) ||
          item.response?.toLowerCase().includes(search.toLowerCase())
        )
      })
    }

    return indexes
  }

  // On data or filter or decisionState change, recalc viewIndexes
  useEffect(() => {
    setViewIndexes(filterDecisionIndexes(filter, decisionState, searchTerm))
  }, [filter, decisionState, data.length, searchTerm])

  // Ensure current is valid with filtered viewIndexes
  useEffect(() => {
    if (viewIndexes.length === 0) {
      setCurrent(0)
    } else if (current >= viewIndexes.length) {
      setCurrent(Math.max(0, viewIndexes.length - 1))
    }
  }, [viewIndexes, current])

  const goNext = () => {
    if (current < viewIndexes.length - 1) setCurrent(current + 1)
  }

  const goBack = () => {
    if (current > 0) setCurrent(current - 1)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return

      if (event.key === "ArrowRight") {
        goNext()
      } else if (event.key === "ArrowLeft") {
        goBack()
      } else if (event.key === "a") {
        handleAccept()
      } else if (event.key === "r") {
        handleReject()
      } else if (event.key === "s") {
        setIsSearching(true)
      } else if (event.key === "Escape") {
        setIsSearching(false)
      } else if (event.key === "k" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        setShowKeyboardShortcuts((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [current, viewIndexes.length])

  const handleAccept = () => {
    if (viewIndexes.length === 0) return
    const idx = viewIndexes[current]
    setDecisionState((prev) => {
      const next = [...prev]
      next[idx] = "accepted"
      return next
    })
  }

  const handleReject = () => {
    if (viewIndexes.length === 0) return
    const idx = viewIndexes[current]
    setDecisionState((prev) => {
      const next = [...prev]
      next[idx] = "rejected"
      return next
    })
  }

  const handleReset = () => {
    if (viewIndexes.length === 0) return
    const idx = viewIndexes[current]
    setDecisionState((prev) => {
      const next = [...prev]
      next[idx] = "none"
      return next
    })
  }

  const getStatusIcon = (status: AcceptStatus) => {
    if (status === "accepted") return <CheckCircle className="h-5 w-5 text-green-600" />
    if (status === "rejected") return <XCircle className="h-5 w-5 text-red-600" />
    return <HelpCircle className="h-5 w-5 text-gray-400" />
  }

  const getStatusBadge = (status: AcceptStatus) => {
    if (status === "accepted")
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Accepted
        </Badge>
      )
    if (status === "rejected")
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          Rejected
        </Badge>
      )
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
        Undecided
      </Badge>
    )
  }

  const handleDownload = () => {
    const output = data.map((item, idx) => ({
      ...item,
      status: decisionState[idx], // could be accepted/rejected/none
    }))
    const content = JSON.stringify(output, null, 2)
    const blob = new Blob([content], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "reviewed.json"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const filterButtons = [
    { key: "all", label: "All" },
    { key: "none", label: "Undecided" },
    { key: "accepted", label: "Accepted" },
    { key: "rejected", label: "Rejected" },
  ] as const

  const decisionCounts = {
    accepted: decisionState.filter((v) => v === "accepted").length,
    rejected: decisionState.filter((v) => v === "rejected").length,
    none: decisionState.filter((v) => v === "none").length,
    all: decisionState.length,
  }

  const progressPercentage =
    data.length > 0 ? ((decisionCounts.accepted + decisionCounts.rejected) / data.length) * 100 : 0

  const hasData = data.length > 0 && viewIndexes.length > 0
  const showObjIndex = hasData ? viewIndexes[current] : 0
  const currentObj = hasData ? data[showObjIndex] : null
  const currentStatus = hasData ? decisionState[showObjIndex] : "none"

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileJson className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-semibold">JSON Review Tool</h1>
        </div>

        <div className="flex items-center gap-3">
          {hasData && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Progress:</span>
              <Progress value={progressPercentage} className="w-32 h-2" />
              <span>{Math.round(progressPercentage)}%</span>
            </div>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setShowKeyboardShortcuts(true)}>
                  <Keyboard className="h-4 w-4 mr-1" />
                  Shortcuts
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Show keyboard shortcuts (Ctrl+K)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button variant="outline" size="sm" onClick={handleDownload} disabled={data.length === 0}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>

          <div className="relative">
            <Input
              type="file"
              id="file-upload"
              accept="application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label htmlFor="file-upload">
              <Button variant="default" size="sm" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-1" />
                  Upload JSON
                </span>
              </Button>
            </label>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearching(true)}
                onBlur={() => setIsSearching(false)}
              />
            </div>
          </div>

          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col gap-1">
              {filterButtons.map((b) => (
                <Button
                  key={b.key}
                  variant={filter === b.key ? "default" : "outline"}
                  size="sm"
                  className={filter === b.key ? "" : "justify-start"}
                  onClick={() => {
                    setFilter(b.key as typeof filter)
                    setCurrent(0)
                  }}
                >
                  {b.label}
                  <Badge variant="secondary" className="ml-auto">
                    {decisionCounts[b.key as keyof typeof decisionCounts]}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
              {hasData ? (
                viewIndexes.map((idx, i) => (
                  <Button
                    key={idx}
                    variant="ghost"
                    className={`w-full justify-start mb-1 text-left ${i === current ? "bg-blue-50 text-blue-700" : ""}`}
                    onClick={() => setCurrent(i)}
                  >
                    <div className="flex items-center gap-2 truncate w-full">
                      {getStatusIcon(decisionState[idx])}
                      <span className="truncate text-xs">{data[idx].filePath || `Item ${idx + 1}`}</span>
                    </div>
                  </Button>
                ))
              ) : (
                <div className="text-center text-gray-500 p-4">No items to display</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {hasData && currentObj ? (
            <>
              <div className="bg-white p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium truncate max-w-2xl">
                      {currentObj.filePath || `Item ${showObjIndex + 1}`}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <span>
                        Item {current + 1} of {viewIndexes.length}
                      </span>
                      <Separator orientation="vertical" className="h-4" />
                      {getStatusBadge(currentStatus)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={goBack} disabled={current === 0}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button size="sm" variant="outline" onClick={goNext} disabled={current === viewIndexes.length - 1}>
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>

              <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">

                  <TabsList className="m-2">
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="metadata">Metadata</TabsTrigger>
                  </TabsList>


                <TabsContent value="content" className="flex-1 overflow-hidden p-0 m-0">
                  <ScrollArea className="h-full">
                    <div className="p-2">
                      <Markdown className="prose dark:prose-invert max-w-none prose-sm bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                        {currentObj.response}
                      </Markdown>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="metadata" className="flex-1 overflow-auto p-0 m-0">
                  <div className="p-2">
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-lg font-medium mb-4">Item Metadata</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">File Path</h4>
                            <p className="mt-1">{currentObj.filePath || "N/A"}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Status</h4>
                            <p className="mt-1 flex items-center gap-2">
                              {getStatusIcon(currentStatus)}
                              <span>
                                {currentStatus === "accepted"
                                  ? "Accepted"
                                  : currentStatus === "rejected"
                                    ? "Rejected"
                                    : "Undecided"}
                              </span>
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Prompt Tokens</h4>
                            <p className="mt-1">{currentObj.usage?.promptTokens ?? "N/A"}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Completion Tokens</h4>
                            <p className="mt-1">{currentObj.usage?.completionTokens ?? "N/A"}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Total Tokens</h4>
                            <p className="mt-1">{currentObj.usage?.totalTokens ?? "N/A"}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Index</h4>
                            <p className="mt-1">{showObjIndex}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="bg-white p-4 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" onClick={handleReset}>
                          Reset
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mark as undecided</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Sheet>
                    <SheetTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Info className="h-4 w-4 mr-1" />
                        Item Details
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Item Details</SheetTitle>
                        <SheetDescription>Full information about this item</SheetDescription>
                      </SheetHeader>
                      <div className="mt-4">
                        <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-[80vh]">
                          {JSON.stringify(currentObj, null, 2)}
                        </pre>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={currentStatus === "rejected" ? "destructive" : "outline"}
                          onClick={handleReject}
                          className={currentStatus !== "rejected" ? "border-red-200 text-red-700 hover:bg-red-50" : ""}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Shortcut: R</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={currentStatus === "accepted" ? "default" : "outline"}
                          onClick={handleAccept}
                          className={
                            currentStatus !== "accepted" ? "border-green-200 text-green-700 hover:bg-green-50" : ""
                          }
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Shortcut: A</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              {data.length > 0 && viewIndexes.length === 0 ? (
                <>
                  <Search className="h-12 w-12 text-gray-300 mb-4" />
                  <h2 className="text-xl font-medium text-gray-700 mb-2">No items found</h2>
                  <p className="text-gray-500 max-w-md">
                    No items match your current filter or search criteria. Try changing your filters or search term.
                  </p>
                </>
              ) : (
                <>
                  <FileJson className="h-16 w-16 text-gray-300 mb-4" />
                  <h2 className="text-xl font-medium text-gray-700 mb-2">No JSON file loaded</h2>
                  <p className="text-gray-500 max-w-md mb-6">
                    Upload a JSON file to start reviewing. The file should contain an array of objects with response
                    data.
                  </p>
                  <Input
                    type="file"
                    id="file-upload-empty"
                    accept="application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="file-upload-empty">
                    <Button variant="default" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload JSON File
                      </span>
                    </Button>
                  </label>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Dialog */}
      <Sheet open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Keyboard Shortcuts</SheetTitle>
            <SheetDescription>Use these shortcuts to navigate and review items quickly</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-100 rounded text-sm">←</kbd>
                <span>Previous item</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-100 rounded text-sm">→</kbd>
                <span>Next item</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-100 rounded text-sm">A</kbd>
                <span>Accept item</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-100 rounded text-sm">R</kbd>
                <span>Reject item</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-100 rounded text-sm">S</kbd>
                <span>Focus search</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-100 rounded text-sm">Esc</kbd>
                <span>Clear search focus</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-100 rounded text-sm">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-sm">K</kbd>
                <span>Show/hide shortcuts</span>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
