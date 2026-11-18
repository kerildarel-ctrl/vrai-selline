import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Send } from 'lucide-react'
import { MobileBar } from '../components/PageHeader'
import { Alert, ErrorState, PageLoader, Spinner } from '../components/States'
import { useCounters } from '../context/CountersContext'
import { api } from '../lib/api'
import type { Conversation as Conv, Message } from '../lib/types'

const time = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
const day = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

export default function Conversation() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const seller = useLocation().pathname.startsWith('/seller')
  const { refresh } = useCounters()
  const [conv, setConv] = useState<Conv | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const lastCount = useRef(0)

  const load = useCallback(async (silent: boolean) => {
    try {
      const res = await api.conversation(id)
      setConv(res.conversation)
      setMessages(res.messages)
      setError(null)
      void refresh()
    } catch (e) { if (!silent) setError(e instanceof Error ? e.message : 'Erreur') }
    finally { setLoading(false) }
  }, [id, refresh])

  useEffect(() => {
    void load(false)
    const t = setInterval(() => { if (!document.hidden) void load(true) }, 8000)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    if (messages.length !== lastCount.current) {
      endRef.current?.scrollIntoView({ behavior: lastCount.current === 0 ? 'auto' : 'smooth' })
      lastCount.current = messages.length
    }
  }, [messages])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    setSending(true); setSendError(null)
    try {
      const m = await api.sendMessage(id, value)
      setMessages((prev) => [...prev, m])
      setText('')
    } catch (err) { setSendError(err instanceof Error ? err.message : 'Message non envoyé') }
    finally { setSending(false) }
  }

  const back = seller ? '/seller/messages' : '/messages'
  const title = conv?.title ?? 'Conversation'

  const thread = loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={() => load(false)} /> : (
    <>
      <div className="hidden items-center gap-3 border-b border-slate-100 px-4 py-3 md:flex">
        <button onClick={() => navigate(back)} className="-ml-1 rounded-full p-1.5 hover:bg-slate-100" aria-label="Retour"><ChevronLeft size={20} /></button>
        <div className="min-w-0"><p className="truncate font-semibold">{title}</p>{conv?.productName && <p className="truncate text-xs text-teal-700">{conv.productName}</p>}</div>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto bg-slate-50 px-3 py-4 md:px-5" aria-live="polite">
        {messages.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Écrivez le premier message.</p>}
        {messages.map((m, i) => {
          const newDay = i === 0 || day(messages[i - 1].createdAt) !== day(m.createdAt)
          return (
            <div key={m.id}>
              {newDay && <p className="my-3 text-center text-xs capitalize text-slate-400">{day(m.createdAt)}</p>}
              <div className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm md:max-w-[65%] ${m.mine ? 'rounded-br-md bg-selline-dark text-white' : 'rounded-bl-md bg-white shadow-sm'}`}>
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p className={`mt-0.5 text-right text-[10px] ${m.mine ? 'text-slate-400' : 'text-slate-400'}`}>{time(m.createdAt)}</p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="border-t border-slate-100 bg-white p-3">
        {sendError && <div className="mb-2"><Alert>{sendError}</Alert></div>}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(min-width: 768px)').matches) { e.preventDefault(); e.currentTarget.form?.requestSubmit() } }}
            rows={1}
            maxLength={2000}
            placeholder="Votre message"
            aria-label="Votre message"
            className="input-field max-h-32 min-h-[46px] flex-1 resize-none rounded-2xl py-3"
          />
          <button type="submit" disabled={sending || !text.trim()} aria-label="Envoyer" className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-selline-yellow text-selline-dark transition hover:brightness-95 disabled:opacity-50">
            {sending ? <Spinner /> : <Send size={20} />}
          </button>
        </div>
      </form>
    </>
  )

  const box = 'flex flex-col overflow-hidden bg-white md:card'
  if (seller) {
    return <div className={`${box} h-[calc(100dvh-10.5rem)] md:h-[calc(100vh-4rem)]`}>{thread}</div>
  }
  return (
    <>
      <MobileBar title={title} back={back} />
      <div className="md:page md:py-6">
        <div className={`${box} mx-auto h-[calc(100dvh-3.5rem)] max-w-3xl md:h-[calc(100vh-13rem)]`}>{thread}</div>
      </div>
    </>
  )
}
