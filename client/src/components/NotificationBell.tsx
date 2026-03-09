import React, { useState, useRef, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications, useUnreadCount, useMarkNotificationRead, useMarkAllRead } from "@/hooks/useNotifications";
import type { Notification } from "@shared/schema";

// ─── NotificationRow ──────────────────────────────────────────────────────────
function NotificationRow({ notification, onMarkRead }: { notification: Notification; onMarkRead: (id: number) => void }) {
  return (
    <div className={`px-4 py-3 border-b border-border last:border-0 ${notification.isRead ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold leading-tight truncate">{notification.title}</p>
            <Badge variant="secondary" className="text-xs flex-shrink-0 capitalize">
              {notification.type.replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">{notification.message}</p>
        </div>
        {!notification.isRead && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-6 px-2 flex-shrink-0"
            onClick={() => onMarkRead(notification.id)}
          >
            Mark read
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── NotificationBell ─────────────────────────────────────────────────────────
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: unreadData } = useUnreadCount();
  const { data: notifications, isLoading } = useNotifications(10);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();

  const unreadCount = unreadData?.count ?? 0;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex items-center justify-center h-8 w-8 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-all"
        aria-label="Notifications"
      >
        <Bell className="h-[15px] w-[15px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 max-h-96 overflow-y-auto rounded-xl border border-border bg-popover shadow-md">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-popover z-10">
            <p className="text-sm font-semibold">Notifications</p>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={() => markAllRead.mutate()}
                >
                  Mark all read
                </Button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          {isLoading ? (
            <div className="px-4 py-3 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">No notifications yet.</p>
          ) : (
            <div>
              {notifications.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onMarkRead={(id) => markRead.mutate(id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
