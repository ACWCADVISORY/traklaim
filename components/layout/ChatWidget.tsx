'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Loader2 } from 'lucide-react'

interface Message { role: 'user' | 'assistant'; content: string }

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  function handleOpen() {
    setOpen(true)
    if (messages.length === 0) {
      setMessages([{ role: 'assistant', content: "Hi! I'm the Traklaim Assistant. Ask me anything about SR&ED eligibility, how to log time, what qualifies as technological uncertainty, or how to use any part of the platform." }])
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const updated: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(updated)
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
      })
      const data = await res.json()
      setMessages([...updated, { role: 'assistant', content: data.content ?? 'Sorry, I had trouble with that.' }])
    } catch {
      setMessages([...updated, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40 w-[340px] sm:w-[380px] h-[500px] bg-navy-800 border border-navy-600 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-navy-600 bg-navy-700">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-teal-500/20 flex items-center justify-center">
                <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
              </div>
              <span className="text-sm font-semibold text-white">Traklaim Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-teal-600 text-white' : 'bg-navy-700 text-slate-200'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-navy-700 px-3 py-2 rounded-xl">
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="p-3 border-t border-navy-600">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Ask about SR&ED eligibility…"
                className="flex-1 px-3 py-2 rounded-lg bg-navy-700 border border-navy-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/60"
              />
              <button onClick={send} disabled={loading || !input.trim()} className="p-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-40 transition-colors">
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40 w-12 h-12 rounded-full bg-teal-600 hover:bg-teal-500 shadow-lg flex items-center justify-center transition-colors"
        style={{ bottom: open ? undefined : undefined }}
      >
        {open ? <X className="w-5 h-5 text-white" /> : <MessageSquare className="w-5 h-5 text-white" />}
      </button>
    </>
  )
}
