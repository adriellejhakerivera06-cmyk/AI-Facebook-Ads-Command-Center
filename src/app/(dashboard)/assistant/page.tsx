'use client'

import { useState, useRef, useEffect } from 'react'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { Send, Bot, User, Loader as Loader2, Sparkles, Info, ChevronRight, ChartBar as BarChart3, Target, TrendingUp, CircleAlert as AlertCircle } from 'lucide-react'
import { createUserMessage, createAssistantMessage } from '@/lib/ai-chat'
import type { ChatMessage, DataSource } from '@/lib/ai-chat'

const SUGGESTED_QUESTIONS = [
  'Show me an overview of my campaigns',
  'What are my top performing campaigns?',
  'Which campaigns have the worst ROAS?',
  'What is my average CPA?',
  'Give me optimization suggestions',
  'Show me spend trends',
]

export default function AssistantPage() {
  const { currentWorkspace } = useWorkspace()
  const [messages, setMessages] = useState<ChatMessage[]>([
    createAssistantMessage(
      'Hello! I\'m your AI Campaign Assistant. I can answer questions about your Meta Ads campaigns using only your synchronized data.\n\nTry asking about:\n- Campaign performance overview\n- Top/worst performers\n- ROAS, CPA, CTR metrics\n- Trends and changes\n- Optimization suggestions'
    ),
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (content: string) => {
    if (!content.trim() || !currentWorkspace || loading) return

    const userMessage = createUserMessage(content)
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: content,
          workspace_id: currentWorkspace.id,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const assistantMessage = createAssistantMessage(data.response, data.sources)
        setMessages((prev) => [...prev, assistantMessage])
      } else {
        setMessages((prev) => [
          ...prev,
          createAssistantMessage(`Sorry, I encountered an error: ${data.error || 'Unknown error'}`),
        ])
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        createAssistantMessage('Sorry, I couldn\'t process your request. Please try again.'),
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question)
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <Bot className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">AI Campaign Assistant</h1>
          <p className="text-sm text-slate-400">Ask questions about your campaign data</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300">
            All responses are generated from your synchronized campaign data only.
            No information is fabricated. Sources are shown for each response.
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}
        {loading && (
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Analyzing your campaign data...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 2 && !loading && (
        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSuggestedQuestion(q)}
                className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-full transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your campaigns..."
            disabled={loading}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
        isUser ? 'bg-slate-700' : 'bg-blue-500/20'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-slate-400" />
        ) : (
          <Sparkles className="w-4 h-4 text-blue-400" />
        )}
      </div>
      <div className={`max-w-[80%] rounded-lg px-4 py-3 ${
        isUser
          ? 'bg-blue-600 text-white'
          : 'bg-slate-800 border border-slate-700 text-slate-200'
      }`}>
        <div className="text-sm whitespace-pre-wrap leading-relaxed">
          {message.content}
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 mb-2">Data sources:</p>
            <div className="flex flex-wrap gap-2">
              {message.sources.slice(0, 5).map((source, i) => (
                <SourceBadge key={i} source={source} />
              ))}
              {message.sources.length > 5 && (
                <span className="text-xs text-slate-500">+{message.sources.length - 5} more</span>
              )}
            </div>
          </div>
        )}

        <p className={`text-xs mt-2 ${isUser ? 'text-blue-200' : 'text-slate-500'}`}>
          {new Date(message.timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}

function SourceBadge({ source }: { source: DataSource }) {
  const icons: Record<string, any> = {
    campaign: Target,
    insight: BarChart3,
    health_score: TrendingUp,
    recommendation: Sparkles,
    forecast: BarChart3,
  }
  const Icon = icons[source.type] || AlertCircle

  return (
    <span className="inline-flex items-center gap-1 text-xs bg-slate-900 border border-slate-700 text-slate-400 px-2 py-0.5 rounded">
      <Icon className="w-3 h-3" />
      {source.entityName}
      {source.metric && <span className="text-slate-500">({source.metric})</span>}
    </span>
  )
}
