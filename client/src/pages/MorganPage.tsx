import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  useMorganConversations,
  useMorganMessages,
  useCreateMorganConversation,
  useArchiveConversation,
  useSendMessage,
} from "@/hooks/useMorgan";
import {
  Plus,
  Send,
  Archive,
  MessageSquare,
  Sparkles,
  Brain,
  Loader2,
  User,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg, userName }: { msg: any; userName: string }) {
  const isMorgan = msg.role === "morgan";

  return (
    <div className={`flex gap-3 ${isMorgan ? "items-start" : "items-start flex-row-reverse"}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
          isMorgan
            ? "bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-[0_2px_8px_rgba(139,92,246,0.3)]"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {isMorgan ? <Sparkles className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
      </div>

      {/* Content */}
      <div className={`max-w-[75%] space-y-1 ${isMorgan ? "" : "text-right"}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {isMorgan ? "Morgan" : userName}
          </span>
          <span className="text-[10px] text-muted-foreground/50">
            {formatTime(msg.createdAt)}
          </span>
        </div>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            isMorgan
              ? "bg-card border border-border/50 text-foreground rounded-tl-md"
              : "bg-primary text-primary-foreground rounded-tr-md"
          }`}
        >
          {msg.content}
        </div>
        {isMorgan && msg.metadata && (
          <span className="text-[10px] text-muted-foreground/40">
            {(msg.metadata as any).model} · {(msg.metadata as any).latencyMs}ms
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Conversation Sidebar ────────────────────────────────────────────────────

function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
  onArchive,
}: {
  conversations: any[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onArchive: (id: number) => void;
}) {
  return (
    <div className="w-[260px] flex-shrink-0 border-r border-border/50 flex flex-col bg-muted/20">
      <div className="p-4 border-b border-border/50">
        <Button onClick={onNew} className="w-full" size="sm">
          <Plus className="h-3.5 w-3.5 mr-2" />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {conversations.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Brain className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-xs text-muted-foreground">No conversations yet</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Start a new chat with Morgan
            </p>
          </div>
        ) : (
          conversations.map((conv: any) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`group w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
                activeId === conv.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {conv.title || "New conversation"}
                </p>
                <p className="text-[10px] text-muted-foreground/60">
                  {formatDate(conv.updatedAt)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-opacity"
                title="Archive"
              >
                <Archive className="h-3 w-3" />
              </button>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Chat Input ──────────────────────────────────────────────────────────────

function ChatInput({
  onSend,
  isLoading,
}: {
  onSend: (message: string) => void;
  isLoading: boolean;
}) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  return (
    <div className="p-4 border-t border-border/50 bg-background">
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Morgan..."
          className="min-h-[44px] max-h-[200px] resize-none rounded-xl bg-muted/50 border-border/50 focus:border-primary/50"
          rows={1}
        />
        <Button
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          size="sm"
          className="h-[44px] w-[44px] rounded-xl flex-shrink-0 p-0"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
        Morgan uses AI to generate responses. Always verify important information.
      </p>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyChat({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center mb-6 shadow-[0_4px_20px_rgba(139,92,246,0.3)]">
        <Sparkles className="h-7 w-7 text-white" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Hey, I'm Morgan</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
        Your AI Head of Marketing. I can help plan campaigns, write post copy, analyze performance,
        or just brainstorm ideas. What are we working on?
      </p>
      <div className="flex flex-wrap gap-2 justify-center max-w-lg">
        {[
          "What should we post this week?",
          "Plan a campaign for our latest release",
          "How are our socials performing?",
          "Draft some TikTok captions",
        ].map((suggestion) => (
          <button
            key={suggestion}
            onClick={onNew}
            className="px-3.5 py-2 rounded-xl border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Morgan Page ─────────────────────────────────────────────────────────────

export default function MorganPage() {
  const { user } = useAuth();
  const userName = user?.firstName || user?.username || "You";
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: convsLoading } = useMorganConversations();
  const { data: messages = [], isLoading: msgsLoading } = useMorganMessages(
    activeConversationId ?? undefined
  );
  const createConversation = useCreateMorganConversation();
  const archiveConversation = useArchiveConversation();
  const sendMessage = useSendMessage();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleNewConversation() {
    const conv = await createConversation.mutateAsync({});
    setActiveConversationId(conv.id);
  }

  async function handleSend(message: string) {
    if (!activeConversationId) {
      // Create a new conversation first
      const conv = await createConversation.mutateAsync({});
      setActiveConversationId(conv.id);
      sendMessage.mutate({ conversationId: conv.id, message });
    } else {
      sendMessage.mutate({ conversationId: activeConversationId, message });
    }
  }

  function handleArchive(id: number) {
    archiveConversation.mutate(id);
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  }

  const allConversations = conversations as any[];
  const allMessages = messages as any[];

  return (
    <div className="flex h-full">
      {/* Conversation sidebar */}
      <ConversationList
        conversations={allConversations}
        activeId={activeConversationId}
        onSelect={setActiveConversationId}
        onNew={handleNewConversation}
        onArchive={handleArchive}
      />

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeConversationId ? (
          <EmptyChat onNew={handleNewConversation} />
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto space-y-6">
                {msgsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3">
                        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                        <Skeleton className="h-16 w-[60%] rounded-2xl" />
                      </div>
                    ))}
                  </div>
                ) : allMessages.length === 0 ? (
                  <div className="text-center py-12">
                    <Sparkles className="h-6 w-6 text-violet-500/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Start the conversation — I'm all ears.
                    </p>
                  </div>
                ) : (
                  allMessages.map((msg: any) => (
                    <MessageBubble key={msg.id} msg={msg} userName={userName} />
                  ))
                )}

                {sendMessage.isPending && (
                  <div className="flex gap-3 items-start">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="bg-card border border-border/50 rounded-2xl rounded-tl-md px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span className="text-xs text-muted-foreground">Morgan is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <ChatInput onSend={handleSend} isLoading={sendMessage.isPending} />
          </>
        )}
      </div>
    </div>
  );
}
