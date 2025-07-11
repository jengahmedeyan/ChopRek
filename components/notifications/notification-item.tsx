"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckCircle, AlertCircle, Info, Clock, Trash2, Undo2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import type { Notification } from "@/lib/types"

interface NotificationItemProps {
  notification: Notification
  onRead: (id: string) => void
  onDelete: (id: string) => void
  isSelected?: boolean
  onSelect?: (id: string, selected: boolean) => void
  selectionMode?: boolean
}

export function NotificationItem({
  notification,
  onRead,
  onDelete,
  isSelected = false,
  onSelect,
  selectionMode = false,
}: NotificationItemProps) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isMouseDown, setIsMouseDown] = useState(false)
  const itemRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const currentX = useRef(0)
  const dragThreshold = 5 // Minimum pixels to start drag

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
      case "order_status":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning":
      case "reminder":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "new_menu":
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (selectionMode) return
    startX.current = e.touches[0].clientX
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || selectionMode) return

    currentX.current = e.touches[0].clientX
    const diff = startX.current - currentX.current

    // Only allow left swipe (positive diff)
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, 100))
    } else {
      setSwipeOffset(0)
    }
  }

  const handleTouchEnd = () => {
    if (!isDragging || selectionMode) return

    setIsDragging(false)

    // If swiped more than 60px, show delete confirmation
    if (swipeOffset > 60) {
      setShowDeleteConfirm(true)
      setSwipeOffset(100)
    } else {
      // Snap back
      setSwipeOffset(0)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (selectionMode) return

    // Only handle left mouse button
    if (e.button !== 0) return

    e.preventDefault()
    startX.current = e.clientX
    setIsMouseDown(true)

    // Add cursor style to body to show dragging state
    document.body.style.cursor = "grabbing"
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown || selectionMode) return

      currentX.current = e.clientX
      const diff = startX.current - currentX.current

      // Start dragging if we've moved beyond threshold
      if (!isDragging && Math.abs(diff) > dragThreshold) {
        setIsDragging(true)
      }

      if (isDragging) {
        if (diff > 0) {
          setSwipeOffset(Math.min(diff, 100))
        } else {
          setSwipeOffset(0)
        }
      }
    }

    const handleMouseUp = () => {
      if (!isMouseDown) return

      setIsMouseDown(false)

      // Reset cursor
      document.body.style.cursor = ""

      if (isDragging) {
        setIsDragging(false)

        if (swipeOffset > 60) {
          setShowDeleteConfirm(true)
          setSwipeOffset(100)
        } else {
          // Snap back
          setSwipeOffset(0)
        }
      }
    }

    if (isMouseDown) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)

      // Prevent text selection globally while dragging
      document.body.style.userSelect = "none"
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.userSelect = ""
      document.body.style.cursor = ""
    }
  }, [isMouseDown, isDragging, swipeOffset, selectionMode])

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(notification.id)
    } catch (error) {
      console.error("Failed to delete notification:", error)
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      setSwipeOffset(0)
    }
  }

  const handleCancel = () => {
    setShowDeleteConfirm(false)
    setSwipeOffset(0)
  }

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click if we're dragging or have swiped
    if (isDragging || swipeOffset > 0 || isMouseDown) {
      e.preventDefault()
      e.stopPropagation()
      return
    }

    if (selectionMode) {
      onSelect?.(notification.id, !isSelected)
      return
    }

    if (!notification.read) {
      onRead(notification.id)
    }

    // Handle navigation if actionUrl is provided
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl
    }
  }

  const handleCheckboxChange = (checked: boolean) => {
    onSelect?.(notification.id, checked)
  }

  return (
    <div className="relative overflow-hidden">
      {/* Delete background */}
      <div
        className={cn(
          "absolute inset-0 bg-red-500 flex items-center justify-end px-4 transition-opacity",
          swipeOffset > 0 ? "opacity-100" : "opacity-0",
        )}
      >
        {showDeleteConfirm ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-red-600"
              onClick={handleCancel}
              disabled={isDeleting}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-red-600"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-white" />
            <span className="text-white text-sm font-medium">Delete</span>
          </div>
        )}
      </div>

      {/* Notification content */}
      <div
        ref={itemRef}
        className={cn(
          "flex items-start gap-3 p-3 hover:bg-muted/50 transition-all duration-200 bg-background",
          !notification.read && "bg-muted/30",
          selectionMode && "pl-2",
          isSelected && "bg-blue-50 border-l-4 border-blue-500",
          !selectionMode && !isDragging && "cursor-pointer",
          !selectionMode && isMouseDown && "cursor-grabbing",
          !selectionMode && !isMouseDown && swipeOffset === 0 && "hover:cursor-grab",
          (isDragging || isMouseDown) && "select-none",
          "touch-action-pan-y",
        )}
        style={{
          transform: `translateX(-${swipeOffset}px)`,
          WebkitUserSelect: isDragging || isMouseDown ? "none" : "auto",
          MozUserSelect: isDragging || isMouseDown ? "none" : "auto",
          userSelect: isDragging || isMouseDown ? "none" : "auto",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onContextMenu={(e) => (isDragging || isMouseDown) && e.preventDefault()}
        draggable={false}
      >
        {selectionMode && (
          <div className="flex-shrink-0 mt-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleCheckboxChange}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        <div className="flex-shrink-0 mt-0.5">{getNotificationIcon(notification.type)}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("text-sm font-medium leading-tight", (isDragging || isMouseDown) && "select-none")}>
              {notification.title}
            </p>
            {!notification.read && !selectionMode && (
              <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
            )}
          </div>
          <p
            className={cn(
              "text-xs text-muted-foreground mt-1 line-clamp-2",
              (isDragging || isMouseDown) && "select-none",
            )}
          >
            {notification.message}
          </p>
          <p className={cn("text-xs text-muted-foreground mt-2", (isDragging || isMouseDown) && "select-none")}>
            {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  )
}
