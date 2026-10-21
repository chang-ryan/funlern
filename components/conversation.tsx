'use client'

import type { UIMessage } from 'ai'
import type { ReactNode } from 'react'
import type { RailItem } from './thread-rail'
import type { ThreadData } from './types'
import type { Anchor } from '@/lib/db/schema'
import type { SessionMode, SessionStart, TrainingStyle } from '@/lib/plans/modes'
import { Chat, useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createThread } from '@/app/actions'
import { isAddedPart } from '@/lib/added-parts'
import { anchorFromRange, rangeFromAnchor } from '@/lib/anchor'
import { fetchOrThrow } from '@/lib/fetch'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { usePressOutside } from '@/lib/hooks/use-press-outside'
import { TITLE_PART } from '@/lib/messages'
import { activeQuizId, QUIZ_RESULTS, quizIdOf, quizResultsOf } from '@/lib/quiz'
import { AssistantMessage } from './assistant-message'
import { ChatView } from './chat/chat-view'
import { SessionModeChip } from './chat/session-mode'
import { ConversationHeader } from './conversation-header'
import { NewThreadCard, ThreadCard } from './thread'
import { ThreadDrawer } from './thread-drawer'
import { ThreadRail } from './thread-rail'

interface Draft { messageId: string, anchor: Anchor }

// Thread anchors, painted with the CSS Custom Highlight API (no DOM changes to the message).
const HIGHLIGHT_CSS = `
::highlight(thread-anchor) { background-color: rgb(250 204 21 / 0.25); }
::highlight(thread-anchor-focused) { background-color: rgb(250 204 21 / 0.55); }
`

// The server holds the history, so each request carries only the newest message.
function transportFor(api: string) {
  return new DefaultChatTransport({
    api,
    fetch: fetchOrThrow,
    prepareSendMessagesRequest: ({ id, messages, body }) => ({ body: { ...body, id, message: messages.at(-1) } }),
  })
}
const chatTransport = transportFor('/api/chat')
const threadTransport = transportFor('/api/thread')

/** Persisted conversation with side threads anchored on highlighted passages. */
export function Conversation({ id, isNew = false, start, mode = start?.mode ?? 'learning', trainingStyle = null, firstMessage, intro, suggestions, stayOnPage = false, title, plan, model, initialMessages, initialThreads }: {
  id: string
  /** Not saved yet: the server creates it with the first message. */
  isNew?: boolean
  /** How a new session starts (its plan and mode): sent with the first message, which creates it. */
  start?: SessionStart
  /** The session's fixed mode, shown under the composer. */
  mode?: SessionMode
  trainingStyle?: TrainingStyle | null
  /** Sent as soon as the conversation mounts, e.g. typed on the plan page. */
  firstMessage?: string
  /** A panel that stays above the transcript (mission control). */
  intro?: ReactNode
  /** Suggested messages on the composer, sent in one click; none unless given. */
  suggestions?: string[]
  /** The page's own URL, not /c/{id}, is the session's address (mission control at /p/[id]/mc). */
  stayOnPage?: boolean
  title: string | null
  /** The plan the session is in, for the breadcrumb. */
  plan?: { id: string, title: string | null }
  model: string
  initialMessages: UIMessage[]
  initialThreads: ThreadData[]
}) {
  const [threads, setThreads] = useState(initialThreads)
  const [currentTitle, setCurrentTitle] = useState(title)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  // Threads from earlier visits start collapsed; new ones open expanded.
  const [collapsed, setCollapsed] = useState(() => new Set(initialThreads.map(t => t.id)))
  const [draft, setDraft] = useState<Draft | null>(null)
  const [ask, setAsk] = useState<(Draft & { x: number, y: number }) | null>(null)
  const [tops, setTops] = useState<Record<string, number>>({})
  const [layoutTick, setLayoutTick] = useState(0)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const transcriptRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const rangesRef = useRef(new Map<string, Range>())
  const draftRangeRef = useRef<Range | null>(null)
  const chatsRef = useRef(new Map<string, Chat<UIMessage>>())

  function chatFor(t: ThreadData) {
    let chat = chatsRef.current.get(t.id)
    if (!chat) {
      chat = new Chat({ id: t.id, messages: t.messages, transport: threadTransport })
      chatsRef.current.set(t.id, chat)
    }
    return chat
  }

  const router = useRouter()
  const { messages, sendMessage, regenerate, status, error, stop, setMessages } = useChat({
    id,
    messages: initialMessages,
    transport: chatTransport,
    // A page that shows the plan beside the chat (mission control) re-reads it after each reply, which may have
    // edited it. A new session's page re-renders once its first reply is saved (just after the stream ends), so
    // Next's cached copy, which Back and Forward replay, is the saved conversation rather than an empty new one.
    onFinish: () => {
      if (stayOnPage)
        router.refresh()
      else if (isNew)
        setTimeout(() => router.refresh(), 1000)
    },
    // The server adds folded side questions and rebuilt quiz results to this turn's learner message.
    // On the first turn it also sends the title it generated.
    onData: (part) => {
      if (part.type === TITLE_PART) {
        setCurrentTitle(current => current ?? part.data as string)
        return
      }
      if (!isAddedPart(part.type))
        return
      setMessages((ms) => {
        const i = ms.findLastIndex(m => m.role === 'user')
        return i < 0 ? ms : ms.with(i, { ...ms[i], parts: [{ type: part.type, data: part.data }, ...ms[i].parts.filter(p => p.type !== part.type)] })
      })
    },
  })

  // The latest quiz blocks the chat until its results are sent; while they're on their way, its card waits.
  const activeQuiz = activeQuizId(messages)
  const lastResults = messages.at(-1) && quizResultsOf(messages.at(-1)!)
  const endingQuiz = status === 'submitted' ? lastResults?.quizId : undefined

  // Only a new chat's first message carries how it starts; the server ignores it once the conversation exists.
  const send = (text: string) => sendMessage({ text }, isNew && start ? { body: { start } } : undefined)
  const sentFirstRef = useRef(false)
  useEffect(() => {
    if (!firstMessage || sentFirstRef.current)
      return
    // Deferred: in dev, StrictMode's extra cleanup runs useChat's stop(), which would abort a send made now.
    const timer = setTimeout(() => {
      sentFirstRef.current = true
      sendMessage({ text: firstMessage }, isNew && start ? { body: { start } } : undefined)
      // A first message that came in the URL (?do=…) must not be sent again on reload. Through the router, so
      // Next's history stays in step with the URL.
      if (stayOnPage)
        router.replace(window.location.pathname, { scroll: false })
    })
    return () => clearTimeout(timer)
  }, [firstMessage, start, isNew, stayOnPage, sendMessage, router])

  // A reply arriving means the server has saved the conversation.
  const saved = !isNew || messages.some(m => m.role === 'assistant')

  // Show the Ask button for a settled selection inside one finished tutor message.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const onChange = () => {
      clearTimeout(timer)
      timer = setTimeout(() => setAsk(readSelection(transcriptRef.current)), 150)
    }
    const hide = () => setAsk(null)
    document.addEventListener('selectionchange', onChange)
    window.addEventListener('scroll', hide, true)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('selectionchange', onChange)
      window.removeEventListener('scroll', hide, true)
    }
  }, [])

  // Re-measure when the transcript resizes (streaming, window width, rail appearing), and re-find
  // anchors when its DOM changes: ranges hold text nodes, and a swapped node (Streamdown's lazy
  // code blocks resolving, a re-parse) collapses the range, so the highlight silently disappears.
  useEffect(() => {
    const el = transcriptRef.current
    if (!el)
      return
    let frame = 0
    const tick = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setLayoutTick(t => t + 1))
    }
    const ro = new ResizeObserver(tick)
    ro.observe(el)
    const mo = new MutationObserver(tick)
    mo.observe(el, { childList: true, characterData: true, subtree: true })
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      mo.disconnect()
    }
  }, [])

  // Find each thread's passage, paint highlights, and measure where rail cards should sit.
  useLayoutEffect(() => {
    const root = transcriptRef.current
    if (!root)
      return
    const find = (messageId: string, anchor: Anchor) => {
      const el = root.querySelector(`[data-anchor-root][data-message-id="${CSS.escape(messageId)}"]`)
      return el ? rangeFromAnchor(el, anchor) : null
    }

    const map = new Map<string, Range>()
    for (const t of threads) {
      const r = find(t.anchorMessageId, t.anchor)
      if (r)
        map.set(t.id, r)
    }
    const draftRange = draft ? find(draft.messageId, draft.anchor) : null
    rangesRef.current = map
    draftRangeRef.current = draftRange

    if ('highlights' in CSS) {
      CSS.highlights.set('thread-anchor', new Highlight(...map.values()))
      const focused = focusedId ? map.get(focusedId) : draftRange
      if (focused)
        CSS.highlights.set('thread-anchor-focused', new Highlight(focused))
      else CSS.highlights.delete('thread-anchor-focused')
    }

    const rail = railRef.current
    if (!rail)
      return
    const base = rail.getBoundingClientRect().top
    const next: Record<string, number> = {}
    for (const [key, r] of map) next[key] = r.getBoundingClientRect().top - base
    if (draftRange)
      next.draft = draftRange.getBoundingClientRect().top - base
    setTops(prev => sameTops(prev, next) ? prev : next)
  }, [messages, threads, draft, focusedId, isDesktop, layoutTick])

  useEffect(() => () => {
    if ('highlights' in CSS) {
      CSS.highlights.delete('thread-anchor')
      CSS.highlights.delete('thread-anchor-focused')
    }
  }, [])

  function openDraft() {
    if (!ask)
      return
    setDraft({ messageId: ask.messageId, anchor: ask.anchor })
    setFocusedId(null)
    setAsk(null)
    document.getSelection()?.removeAllRanges()
  }

  async function startThread(question: string) {
    if (!draft)
      return
    const t = await createThread({ conversationId: id, anchorMessageId: draft.messageId, anchor: draft.anchor })
    const thread = { ...t, messages: [] }
    setThreads(ts => [...ts, thread])
    setDraft(null)
    setFocusedId(t.id)
    chatFor(thread).sendMessage({ text: question })
  }

  // Clicking a highlighted passage opens its thread.
  function onTranscriptClick(e: React.MouseEvent) {
    if (!document.getSelection()?.isCollapsed)
      return
    const threadId = threadAt(rangesRef.current, e.clientX, e.clientY)
    if (threadId) {
      focus(threadId)
      setDraft(null)
    }
  }

  // ::highlight() can't set a cursor, so hover is hit-tested against the painted ranges.
  function onTranscriptPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.style.cursor = threadAt(rangesRef.current, e.clientX, e.clientY) ? 'pointer' : ''
  }

  // A press outside the focused thread's card and its passage collapses and unfocuses it;
  // outside an unsent Ask's card and passage, it drops the Ask (the reader changed their mind).
  usePressOutside(!!focusedId, e => pressedOn(e, `[data-thread-id="${CSS.escape(focusedId!)}"]`, rangesRef.current.get(focusedId!)), () => {
    setFocusedId(null)
    setCollapsed(c => new Set(c).add(focusedId!))
  })
  usePressOutside(!!draft, e => pressedOn(e, '[data-draft-thread]', draftRangeRef.current), () => setDraft(null))

  // Focusing a thread also expands it.
  function focus(threadId: string) {
    setFocusedId(threadId)
    setCollapsed(c => c.has(threadId) ? new Set([...c].filter(x => x !== threadId)) : c)
  }

  function toggle(threadId: string) {
    setCollapsed((c) => {
      const next = new Set(c)
      if (!next.delete(threadId))
        next.add(threadId)
      return next
    })
  }

  const card = (t: ThreadData, inDrawer = false) => (
    <ThreadCard
      key={t.id}
      thread={t}
      chat={chatFor(t)}
      focused={t.id === focusedId}
      collapsed={!inDrawer && collapsed.has(t.id)}
      onFocus={() => focus(t.id)}
      onToggle={inDrawer ? undefined : () => toggle(t.id)}
    />
  )
  const draftCard = draft && <NewThreadCard quote={draft.anchor.quote} onAsk={startThread} onCancel={() => setDraft(null)} />
  const focusedThread = threads.find(t => t.id === focusedId)

  const railItems: RailItem[] = threads.map(t => ({ key: t.id, top: tops[t.id] ?? null, node: card(t) }))
  if (draftCard)
    railItems.push({ key: 'draft', top: tops.draft ?? null, node: draftCard })

  return (
    <ChatView
      messages={messages}
      status={status}
      error={error}
      onSend={send}
      onStop={stop}
      onRetry={() => regenerate()}
      model={model}
      session={<SessionModeChip mode={mode} style={trainingStyle} />}
      top={intro}
      suggestions={suggestions && { items: suggestions, onPick: send }}
      transcriptRef={transcriptRef}
      header={<ConversationHeader id={id} title={currentTitle} setTitle={setCurrentTitle} saved={saved} plan={plan} />}
      onTranscriptClick={onTranscriptClick}
      onTranscriptPointerMove={onTranscriptPointerMove}
      renderTutor={(m, _i, streaming) => (
        <AssistantMessage
          message={m}
          streaming={streaming}
          quizPhase={quizIdOf(m) === activeQuiz ? 'active' : quizIdOf(m) === endingQuiz ? 'ending' : 'ended'}
          // Ending a quiz is a learner turn: the server rebuilds the results from the database and the tutor reviews them.
          onQuizEnd={status === 'ready' || status === 'error' ? (quizId, end) => sendMessage({ parts: [{ type: QUIZ_RESULTS, data: { quizId, status: end } }] }) : undefined}
        />
      )}
      blocked={activeQuiz ? 'Finish or exit the quiz to keep chatting.' : undefined}
      rail={isDesktop && railItems.length > 0 ? <ThreadRail items={railItems} railRef={railRef} /> : undefined}
      overlay={(
        <>
          {/* Kept out of globals.css: Lightning CSS doesn't parse ::highlight() yet and warns on every build. */}
          <style href="thread-highlights" precedence="default">{HIGHLIGHT_CSS}</style>
          {ask && (
            <div
              role="toolbar"
              aria-label="Selection"
              // Keep the selection alive until the click lands.
              onMouseDown={e => e.preventDefault()}
              style={{ left: ask.x, top: ask.y - 8 }}
              className="fixed z-30 flex -translate-x-1/2 -translate-y-full items-center rounded-xl border border-border bg-surface p-1 shadow-lg"
            >
              <button
                type="button"
                onClick={openDraft}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium hover:bg-tutor"
              >
                <AskIcon />
                Ask
              </button>
            </div>
          )}
          {!isDesktop && (
            <ThreadDrawer
              open={!!draft || !!focusedThread}
              onClose={() => {
                setDraft(null)
                setFocusedId(null)
              }}
            >
              {draftCard ?? (focusedThread && card(focusedThread, true))}
            </ThreadDrawer>
          )}
        </>
      )}
    />
  )
}

function readSelection(transcript: HTMLElement | null): (Draft & { x: number, y: number }) | null {
  const sel = document.getSelection()
  if (!transcript || !sel || sel.isCollapsed || !sel.rangeCount)
    return null
  const range = sel.getRangeAt(0)
  const root = anchorRootOf(range.startContainer)
  if (!root || root !== anchorRootOf(range.endContainer) || !transcript.contains(root))
    return null
  const anchor = anchorFromRange(root, range)
  if (!anchor)
    return null
  const rect = range.getBoundingClientRect()
  return { messageId: root.dataset.messageId!, anchor, x: rect.left + rect.width / 2, y: rect.top }
}

function AskIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="size-4" aria-hidden>
      <path d="M10 17.5a7.5 7.5 0 1 0-6.6-3.9L2.5 17.5l3.9-.9a7.5 7.5 0 0 0 3.6.9Z" />
      <path d="M10 7v6M7 10h6" />
    </svg>
  )
}

function anchorRootOf(node: Node) {
  return (node instanceof Element ? node : node.parentElement)?.closest<HTMLElement>('[data-anchor-root]') ?? null
}

/** The thread whose highlighted passage is under the point, if any. */
function threadAt(ranges: Map<string, Range>, x: number, y: number) {
  for (const [threadId, r] of ranges) {
    if (inRange(r, x, y))
      return threadId
  }
  return null
}

/** A press on an element matching `selector`, or on the passage `range` covers. */
function pressedOn(e: PointerEvent, selector: string, range: Range | null | undefined) {
  return !!(e.target as Element).closest(selector) || (!!range && inRange(range, e.clientX, e.clientY))
}

function inRange(range: Range, x: number, y: number) {
  return [...range.getClientRects()].some(r => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)
}

function sameTops(a: Record<string, number>, b: Record<string, number>) {
  const keys = Object.keys(b)
  return keys.length === Object.keys(a).length && keys.every(k => Math.abs(a[k] - b[k]) < 0.5)
}
