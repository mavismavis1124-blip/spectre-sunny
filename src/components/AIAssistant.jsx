/**
 * AI Agent – page-aware assistant. Opens News, highlights Fear & Greed, etc.
 * Type @ to search tokens and add to watchlist. Ask for socials, latest tweet, roadmap, whitepaper.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { useTokenSearch } from '../hooks/useCodexData'
import { getProjectLinks, fetchProjectCrawl, fetchLatestTweet, fetchAiAnswer } from '../services/projectLinksApi'
import { getCryptoNews } from '../services/cryptoNewsApi'
import { getCoinDetails } from '../services/coinGeckoApi'
import spectreIcons from '../icons/spectreIcons'
import './AIAssistant.css'

const PADDING = 24
const FAB_SIZE = 60

/** Parse user message and return { actionKey, payload, reply } for page actions. */
function parsePageIntent(message, context, t) {
  const text = (message || '').toLowerCase().trim()
  const fearGreed = context?.fearGreed

  if (/\b(news|check news|open news|show news)\b/.test(text)) {
    return { actionKey: 'openCommandCenterTab', payload: 'news', reply: t('monarch.openedTab', { tab: t('monarch.tabNews') }) }
  }
  if (/\b(analysis|market analysis|ai market)\b/.test(text)) {
    return { actionKey: 'openCommandCenterTab', payload: 'analysis', reply: t('monarch.openedTab', { tab: t('monarch.tabAnalysis') }) }
  }
  if (/\b(flows|funding|liquidations|whale)\b/.test(text)) {
    return { actionKey: 'openCommandCenterTab', payload: 'flows', reply: t('monarch.openedTab', { tab: t('monarch.tabFlows') }) }
  }
  if (/\b(mindshare|narrative)\b/.test(text)) {
    return { actionKey: 'openCommandCenterTab', payload: 'mindshare', reply: t('monarch.openedTab', { tab: t('monarch.tabMindshare') }) }
  }
  if (/\b(calendar|economic calendar)\b/.test(text)) {
    return { actionKey: 'openCommandCenterTab', payload: 'calendar', reply: t('monarch.openedTab', { tab: t('monarch.tabCalendar') }) }
  }
  if (/\b(heatmap|heatmaps)\b/.test(text)) {
    return { actionKey: 'openCommandCenterTab', payload: 'heatmaps', reply: t('monarch.openedTab', { tab: t('monarch.tabHeatmaps') }) }
  }
  if (/\b(fear|fear and greed|fear & greed|sentiment|fng)\b/.test(text)) {
    const value = fearGreed?.value != null ? fearGreed.value : '—'
    const classification = fearGreed?.classification || '—'
    return {
      actionKey: 'highlightFearGreed',
      payload: null,
      reply: t('monarch.fearGreedReply', { value, classification }),
    }
  }
  if (/\b(watchlist|my watchlist|saved tokens)\b/.test(text)) {
    return { actionKey: 'openWatchlist', payload: null, reply: t('monarch.openedWatchlist') }
  }
  if (/\b(welcome widget|welcome panel)\b/.test(text)) {
    return { actionKey: 'openWelcomeWidget', payload: null, reply: t('monarch.openedWelcomePanel') }
  }
  if (/\b(glossary|learn terms|definitions)\b/.test(text)) {
    return { actionKey: 'openGlossary', payload: null, reply: t('monarch.openedGlossary') }
  }
  // Pull up / open token chart: "pull up eth chart", "eth chart", "show btc chart", etc.
  const chartSymbolMatch = text.match(/\b(pull up|show|open|get)\s+(?:the\s+)?(eth|btc|sol|bnb|matic|avax|link|uni|arb|op|doge|pepe|shib|usdt|usdc)\s*(?:chart)?\b|\b(eth|btc|sol|bnb|matic|avax|link|uni|arb|op|doge|pepe|shib|usdt|usdc)\s+chart\b|\bchart\s+(?:for\s+)?(eth|btc|sol|bnb|matic|avax|link|uni|arb|op|doge|pepe|shib|usdt|usdc)\b/i)
  const symbol = chartSymbolMatch ? (chartSymbolMatch[2] || chartSymbolMatch[3] || chartSymbolMatch[4]).toUpperCase() : null
  if (symbol) {
    return { actionKey: 'openTokenChart', payload: symbol, reply: t('monarch.openedChart', { symbol }) }
  }
  return null
}

/** Parse @ project + intent: latest | latest_tweet | roadmap | whitepaper | socials | about (Monarch logic) */
function parseProjectIntent(message) {
  const text = (message || '').trim()
  const atIdx = text.lastIndexOf('@')
  if (atIdx < 0) return null
  const afterAt = text.slice(atIdx + 1).trim()
  if (!afterAt) return null
  const words = afterAt.split(/\s+/)
  const token = words[0] || ''
  const rest = afterAt.slice(token.length).trim().toLowerCase()
  const beforeAt = text.slice(0, atIdx).toLowerCase()
  const fullLower = text.toLowerCase()
  if (!token) return null
  let intent = 'about'
  if (/\b(give me the latest|what'?s the latest|get me the latest|the latest for|latest for)\b/.test(fullLower) || /\blatest\b/.test(rest) || /\blatest\b/.test(beforeAt)) intent = 'latest'
  else if (/\b(chart|tradingview|trading view|pull up chart|show chart|open chart)\b/.test(rest)) intent = 'chart'
  else if (/\b(latest tweet|last tweet|recent tweet)\b/.test(rest) || (/\btweet\b/.test(rest) && /\b(latest|last|recent)\b/.test(rest))) intent = 'latest_tweet'
  else if (/\broadmap\b/.test(rest)) intent = 'roadmap'
  else if (/\bwhitepaper\b|\bwhite paper\b/.test(rest)) intent = 'whitepaper'
  else if (/\b(website|site|socials|links|twitter|discord|telegram)\b/.test(rest)) intent = 'socials'
  else if (/\b(news|latest news|recent news)\b/.test(rest)) intent = 'news'
  else if (/\b(about|info|tell me about)\b/.test(rest) || rest === '') intent = 'about'
  return { token, intent }
}

const AIAssistant = ({ actions, context, isWelcomeView = false, addToWatchlist, isInWatchlist, embedded = false, dayMode = false, onBack, onOpenLogs }) => {
  const { t } = useTranslation()
  const defaultGreeting = t('monarch.greeting')
  const [isOpen, setIsOpen] = useState(embedded)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [input, setInput] = useState('')
  const [deepMode, setDeepMode] = useState(false)
  const messagesEndRef = useRef(null)
  const atDropdownRef = useRef(null)
  const [messages, setMessages] = useState([
    { id: 1, type: 'ai', content: defaultGreeting }
  ])
  const [selectedToken, setSelectedToken] = useState(null) // @ selection: { symbol, name, logo, address, networkId }
  const [contentBeforeAt, setContentBeforeAt] = useState('') // text before @ so chip stays inline (e.g. "tell me about ")
  const hasChatSequence = messages.length > 1

  // Ctrl+L / Cmd+L → open Monarch logs (when embedded and onOpenLogs provided)
  useEffect(() => {
    if (!embedded || typeof onOpenLogs !== 'function') return
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault()
        onOpenLogs()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [embedded, onOpenLogs])

  // @ token search: query is the text after the last "@"
  const atIndex = input.lastIndexOf('@')
  const atQuery = atIndex >= 0 ? input.slice(atIndex + 1).trim() : ''
  const showAtDropdown = atIndex >= 0
  const { results: atSearchResults, loading: atSearchLoading } = useTokenSearch(atQuery, 300)

  const handleAddTokenToWatchlist = useCallback((token) => {
    if (typeof addToWatchlist !== 'function') return
    addToWatchlist({ symbol: token.symbol, name: token.name, address: token.address, networkId: token.networkId })
    const beforeAt = input.slice(0, atIndex).trimEnd()
    const afterQuery = input.slice(atIndex + 1 + atQuery.length).trim()
    setInput(afterQuery ? beforeAt + ' ' + afterQuery : beforeAt)
  }, [addToWatchlist, input, atIndex, atQuery])

  const inputRef = useRef(null)
  const contentBeforeAtRef = useRef('')
  const handleSelectTokenForQuestion = useCallback((token) => {
    const beforeAt = input.slice(0, atIndex).trimEnd()
    const withSpace = beforeAt ? (beforeAt.endsWith(' ') ? beforeAt : beforeAt + ' ') : ''
    contentBeforeAtRef.current = beforeAt
    setContentBeforeAt(withSpace)
    setSelectedToken({
      symbol: token.symbol,
      name: token.name,
      logo: token.logo,
      address: token.address,
      networkId: token.networkId,
    })
    setInput('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [input, atIndex])

  const handleRemoveSelectedToken = useCallback(() => {
    const rest = (input || '').trim()
    setInput(contentBeforeAt + (selectedToken ? '@' + selectedToken.symbol + (rest ? ' ' + rest : '') : rest))
    setContentBeforeAt('')
    contentBeforeAtRef.current = ''
    setSelectedToken(null)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [contentBeforeAt, selectedToken, input])

  // Draggable: null = use default bottom-right; { x, y } = fixed position in px
  const [position, setPosition] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hasMoved, setHasMoved] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Keep focus in the input when @ dropdown opens (embedded Monarch) so we don't kick to landing
  useEffect(() => {
    if (embedded && showAtDropdown && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus()
    }
  }, [embedded, showAtDropdown])

  const getDefaultPosition = useCallback(() => ({
    x: window.innerWidth - PADDING - FAB_SIZE / 2,
    y: window.innerHeight - PADDING - FAB_SIZE / 2
  }), [])

  const handlePointerDown = (e) => {
    if (e.target.closest('.ai-panel')) return
    setIsDragging(true)
    setHasMoved(false)
    const x = position !== null ? position.x : getDefaultPosition().x
    const y = position !== null ? position.y : getDefaultPosition().y
    dragStartRef.current = { x, y, startX: e.clientX, startY: e.clientY }
  }

  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return
    const { x, y, startX, startY } = dragStartRef.current
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) setHasMoved(true)
    const newX = Math.max(FAB_SIZE / 2, Math.min(window.innerWidth - FAB_SIZE / 2, x + dx))
    const newY = Math.max(FAB_SIZE / 2, Math.min(window.innerHeight - FAB_SIZE / 2, y + dy))
    dragStartRef.current = { ...dragStartRef.current, x: newX, y: newY, startX: e.clientX, startY: e.clientY }
    setPosition({ x: newX, y: newY })
  }, [isDragging])

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e) => handlePointerMove(e)
    const onUp = () => handlePointerUp()
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [isDragging, handlePointerMove, handlePointerUp])

  useEffect(() => {
    const onResize = () => {
      if (position === null) return
      setPosition(p => ({
        x: Math.min(p.x, window.innerWidth - FAB_SIZE / 2),
        y: Math.min(p.y, window.innerHeight - FAB_SIZE / 2)
      }))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [position])

  const handleFabClick = () => {
    if (!hasMoved) setIsOpen(prev => !prev)
  }

  const containerStyle = position !== null
    ? { position: 'fixed', left: position.x, top: position.y, transform: 'translate(-50%, -50%)', bottom: 'auto', right: 'auto', padding: 0 }
    : { position: 'fixed', bottom: 0, right: 0, left: 'auto', top: 'auto', transform: 'none', padding: PADDING + 'px' }

  const quickActions = [
    { label: 'Analyze SPECTRE' },
    { label: 'Market Trends' },
    { label: 'Trading Tips' },
    { label: 'Risk Analysis' },
  ]

  const sendMessage = () => {
    const textPart = input.trim()
    const contentBeforeAt = selectedToken ? (contentBeforeAtRef.current || '') : ''
    const contentRest = selectedToken ? textPart : textPart
    const userText = selectedToken
      ? (contentBeforeAt + '@' + (selectedToken.symbol || '') + (contentRest ? ' ' + contentRest : '')).trim()
      : textPart
    if (!userText) return

    const userMsg = {
      id: messages.length + 1,
      type: 'user',
      content: userText,
      ...(selectedToken && {
        tokenRef: { symbol: selectedToken.symbol, name: selectedToken.name, logo: selectedToken.logo },
        contentBeforeAt: contentBeforeAt || '',
        contentRest: contentRest || '',
      }),
    }
    setMessages(prev => [...prev, userMsg])
    contentBeforeAtRef.current = ''
    setContentBeforeAt('')
    const sentToken = selectedToken
    setInput('')
    setSelectedToken(null)

    // Infer intent from typed text when we have selectedToken (so "about", "roadmap", etc. always work)
    function inferIntentFromText(text) {
      const t = (text || '').toLowerCase()
      if (/\b(give me the latest|what'?s the latest|get me the latest|the latest|latest)\b/.test(t)) return 'latest'
      if (/\b(chart|tradingview|pull up chart|show chart|open chart)\b/.test(t)) return 'chart'
      if (/\b(latest tweet|last tweet|recent tweet)\b/.test(t) || (/\btweet\b/.test(t) && /\b(latest|last|recent)\b/.test(t))) return 'latest_tweet'
      if (/\b(news|latest news|recent news)\b/.test(t)) return 'news'
      if (/\broadmap\b/.test(t)) return 'roadmap'
      if (/\bwhitepaper\b|\bwhite paper\b/.test(t)) return 'whitepaper'
      if (/\b(website|site|socials|links|twitter|discord|telegram)\b/.test(t)) return 'socials'
      if (/\b(about|info|tell me about)\b/.test(t) || t === '') return 'about'
      return 'about'
    }

    // @ project: socials, latest tweet, roadmap, whitepaper, chart
    let projectIntent = parseProjectIntent(userText)
    if (!projectIntent && sentToken) {
      projectIntent = { token: sentToken.symbol, intent: inferIntentFromText(contentRest) }
    }
    if (projectIntent) {
      const { token, intent } = projectIntent
      const tokenMatch = sentToken && (
        (sentToken.symbol && token && String(sentToken.symbol).toUpperCase() === String(token).toUpperCase()) ||
        (sentToken.name && token && String(sentToken.name).toLowerCase() === String(token).toLowerCase())
      )
      const linksInput = tokenMatch
        ? { symbol: sentToken.symbol, address: sentToken.address, networkId: sentToken.networkId }
        : (typeof token === 'string' ? token.trim() : token)
      const loadingId = messages.length + 2
      setMessages(prev => [...prev, { id: loadingId, type: 'ai', content: 'Checking @' + (token || '…') + '…' }])
      const setLastReply = (content) => {
        setMessages(prev => {
          const next = [...prev]
          const idx = next.findIndex(m => m.id === loadingId)
          if (idx >= 0) next[idx] = { ...next[idx], content }
          return next
        })
      }
      const AGENT_TIMEOUT_MS = 18000
      const timeoutHandle = setTimeout(() => {
        setLastReply(`This is taking longer than usual. Try again in a moment or check your connection.`)
      }, AGENT_TIMEOUT_MS)
      getProjectLinks(linksInput).then(links => {
        clearTimeout(timeoutHandle)
        const name = links?.name || links?.symbol || token
        let reply
        if (!links) {
          clearTimeout(timeoutHandle)
          setLastReply(`I couldn't find links for "${token}". Try another symbol or name.`)
          return
        }
        clearTimeout(timeoutHandle)
        if (intent === 'socials') {
          const parts = []
          if (links.website) parts.push(`Website: ${links.website}`)
          if (links.twitter) parts.push(`Twitter: ${links.twitter}`)
          if (links.discord) parts.push(`Discord: ${links.discord}`)
          if (links.telegram) parts.push(`Telegram: ${links.telegram}`)
          reply = parts.length ? `${name} — ${parts.join(' • ')}` : `${name}: No social links on file.`
        } else if (intent === 'latest_tweet') {
          if (links.twitter) {
            fetchLatestTweet(links.twitter).then(({ message }) => {
              setMessages(prev => {
                const next = [...prev]
                next[next.length - 1] = { ...next[next.length - 1], content: `${name} — ${message}\n\nOpening X in a new tab…` }
                return next
              })
              try { window.open(links.twitter, '_blank', 'noopener') } catch (_) {}
            }).catch(() => {
              setMessages(prev => {
                const next = [...prev]
                next[next.length - 1] = { ...next[next.length - 1], content: `${name} — I don't have live X/Twitter content here. Their profile: ${links.twitter} (open to see their latest posts).` }
                return next
              })
              try { window.open(links.twitter, '_blank', 'noopener') } catch (_) {}
            })
            return
          }
          reply = `${name}: No Twitter link on file.`
        } else if (intent === 'latest') {
          const symbolForNews = (links.symbol || token || '').toString().toUpperCase()
          const tweetPromise = links.twitter ? fetchLatestTweet(links.twitter).then(({ message }) => message).catch(() => null) : Promise.resolve(null)
          const newsPromise = symbolForNews ? getCryptoNews(symbolForNews, 5) : Promise.resolve([])
          Promise.all([tweetPromise, newsPromise]).then(([latestTweet, news]) => {
            const headlines = Array.isArray(news) && news.length > 0 ? news.slice(0, 3).map((n) => n.title).filter(Boolean) : []
            const context = {
              name,
              latestTweet: latestTweet || null,
              twitterUrl: links.twitter || null,
              website: links.website || null,
              headlines: headlines.length ? headlines : null,
            }
            fetchAiAnswer(userText, context).then(({ text }) => {
              setLastReply(text || (latestTweet ? `${name} — Latest: ${latestTweet.slice(0, 300)}…` : `${name} — ${links.twitter ? `X: ${links.twitter}` : ''}${headlines.length ? `\n\nRecent: ${headlines.join(' · ')}` : ''}`.trim()))
            }).catch(() => {
              const fallback = latestTweet ? `${name} — Latest: ${latestTweet}${links.twitter ? `\nX: ${links.twitter}` : ''}` : `${name} — ${links.twitter ? `X: ${links.twitter}` : ''}${headlines.length ? `\n\nRecent: ${headlines.join(' · ')}` : ''}`.trim()
              setLastReply(fallback || `Couldn't load latest for ${name}. Try their X or news.`)
            })
          }).catch(() => {
            setLastReply(`${name} — Couldn't load latest. ${links.twitter ? `X: ${links.twitter}` : 'No X link.'}`)
          })
          return
        } else if (intent === 'about' && links.website) {
          const symbolForNews = (links.symbol || token || '').toString().toUpperCase()
          const majors = ['BTC', 'ETH', 'SOL']
          const isMajor = majors.includes(symbolForNews)
          // For majors: get CoinGecko in parallel with crawl so we always have real info even when site blocks
          const crawlPromise = fetchProjectCrawl(links.website, 'about').catch(() => null)
          const coingeckoPromise = isMajor ? getCoinDetails(symbolForNews) : Promise.resolve(null)
          const newsPromise = symbolForNews ? getCryptoNews(symbolForNews, 3) : Promise.resolve([])
          Promise.all([crawlPromise, coingeckoPromise, newsPromise])
            .then(([crawlData, details, news]) => {
              const snippet = (crawlData?.text || '').trim()
              const desc = (details?.description || '').trim().slice(0, 500)
              const crawledText = snippet || (isMajor && desc ? desc : null) || 'No summary found.'
              const headlines = Array.isArray(news) && news.length > 0 ? news.slice(0, 2).map((n) => n.title).filter(Boolean) : []
              const context = {
                name,
                crawledText,
                twitterUrl: links.twitter || null,
                website: links.website || null,
                headlines: headlines.length ? headlines : null,
              }
              fetchAiAnswer(userText, context).then(({ text }) => {
                setMessages(prev => {
                  const next = [...prev]
                  const line = text || `${name} — ${crawledText}${links.twitter ? `\nX: ${links.twitter}` : ''}`
                  const chartNote = !embedded && typeof actions?.openTokenChart === 'function' && (sentToken || symbolForNews) ? '\n\nReal-time chart opened above.' : ''
                  next[next.length - 1] = { ...next[next.length - 1], content: line + chartNote }
                  return next
                })
                if (!embedded && sentToken && typeof actions?.openTokenChart === 'function') actions.openTokenChart(sentToken)
                else if (!embedded && typeof actions?.openTokenChart === 'function' && symbolForNews) {
                  fetch(`/api/tokens/search?q=${encodeURIComponent(token)}`).then((r) => r.json()).then((data) => {
                    const first = data?.results?.[0]
                    const t = first?.token
                    if (t && first) actions.openTokenChart({ symbol: t.symbol, name: t.name, address: t.address, networkId: t.networkId, logo: t.info?.imageThumbUrl, price: first.priceUSD, change: first.change24 })
                  }).catch(() => {})
                }
              }).catch(() => {
                let fallback = `${name} — ${crawledText}${links.twitter ? `\nX: ${links.twitter}` : ''}`
                if (headlines.length) fallback += `\n\nRecent headlines: ${headlines.join(' · ')}`
                setMessages(prev => {
                  const next = [...prev]
                  next[next.length - 1] = { ...next[next.length - 1], content: fallback }
                  return next
                })
                if (!embedded && sentToken && typeof actions?.openTokenChart === 'function') actions.openTokenChart(sentToken)
              })
            })
            .catch(() => {
              if (isMajor) {
                getCoinDetails(symbolForNews).then((details) => {
                  const desc = (details?.description || '').trim().slice(0, 500)
                  const context = {
                    name,
                    crawledText: desc || null,
                    twitterUrl: links.twitter || null,
                    website: links.website || null,
                    headlines: null,
                  }
                  getCryptoNews(symbolForNews, 2).then((news) => {
                    const headlines = Array.isArray(news) && news.length > 0 ? news.slice(0, 2).map((n) => n.title).filter(Boolean) : []
                    if (headlines.length) context.headlines = headlines
                    fetchAiAnswer(userText, context).then(({ text }) => {
                      setMessages(prev => {
                        const next = [...prev]
                        const line = text || `${name} — ${desc || 'No description.'}${links.twitter ? `\nX: ${links.twitter}` : ''}`
                        const chartNote = !embedded && typeof actions?.openTokenChart === 'function' ? '\n\nReal-time chart opened above.' : ''
                        next[next.length - 1] = { ...next[next.length - 1], content: line + chartNote }
                        return next
                      })
                      if (!embedded && sentToken && typeof actions?.openTokenChart === 'function') actions.openTokenChart(sentToken)
                      else if (!embedded && typeof actions?.openTokenChart === 'function') {
                        fetch(`/api/tokens/search?q=${encodeURIComponent(token)}`).then((r) => r.json()).then((data) => {
                          const first = data?.results?.[0]
                          const t = first?.token
                          if (t && first) actions.openTokenChart({ symbol: t.symbol, name: t.name, address: t.address, networkId: t.networkId, logo: t.info?.imageThumbUrl, price: first.priceUSD, change: first.change24 })
                        }).catch(() => {})
                      }
                    }).catch(() => {
                      setMessages(prev => {
                        const next = [...prev]
                        next[next.length - 1] = { ...next[next.length - 1], content: `${name} — ${desc || 'No description.'}${links.website ? `\nWebsite: ${links.website}` : ''}${links.twitter ? `\nX: ${links.twitter}` : ''}` }
                        return next
                      })
                      if (!embedded && sentToken && typeof actions?.openTokenChart === 'function') actions.openTokenChart(sentToken)
                    })
                  }).catch(() => {
                    setMessages(prev => {
                      const next = [...prev]
                      next[next.length - 1] = { ...next[next.length - 1], content: `${name} — ${desc || 'No description.'}${links.website ? `\nWebsite: ${links.website}` : ''}${links.twitter ? `\nX: ${links.twitter}` : ''}` }
                      return next
                    })
                    if (!embedded && sentToken && typeof actions?.openTokenChart === 'function') actions.openTokenChart(sentToken)
                  })
                }).catch(() => {
                  const parts = []
                  if (links.website) parts.push(`Website: ${links.website}`)
                  if (links.twitter) parts.push(`X: ${links.twitter}`)
                  setMessages(prev => {
                    const next = [...prev]
                    next[next.length - 1] = { ...next[next.length - 1], content: `${name} — Couldn't load site or CoinGecko. ${parts.length ? parts.join(' • ') : 'No links on file.'}` }
                    return next
                  })
                })
              } else {
                const parts = []
                if (links.website) parts.push(`Website: ${links.website}`)
                if (links.twitter) parts.push(`X: ${links.twitter}`)
                setMessages(prev => {
                  const next = [...prev]
                  next[next.length - 1] = { ...next[next.length - 1], content: `${name} — Couldn't load their site. ${parts.length ? parts.join(' • ') : 'No links on file.'}` }
                  return next
                })
              }
            })
          return
        } else if (intent === 'about') {
          const symbolForNews = (links.symbol || token || '').toString().toUpperCase()
          getCryptoNews(symbolForNews, 2).then((news) => {
            const headlines = Array.isArray(news) && news.length > 0 ? news.slice(0, 2).map((n) => n.title).filter(Boolean) : []
            const context = {
              name,
              crawledText: null,
              twitterUrl: links.twitter || null,
              website: links.website || null,
              headlines: headlines.length ? headlines : null,
            }
            fetchAiAnswer(userText, context).then(({ text }) => {
              setMessages(prev => {
                const next = [...prev]
                next[next.length - 1] = { ...next[next.length - 1], content: text || `${name} — ${links.website ? `Website: ${links.website}` : ''}${links.twitter ? ` • X: ${links.twitter}` : ''}${headlines.length ? `\n\nRecent: ${headlines.join(' · ')}` : ''}`.trim() }
                return next
              })
            }).catch(() => {
              reply = `${name} — ${links.website ? `Website: ${links.website}` : ''}${links.twitter ? ` • X: ${links.twitter}` : ''}${headlines.length ? `\n\nRecent: ${headlines.join(' · ')}` : ''}`.trim() || `${name}: No links on file.`
              setMessages(prev => {
                const next = [...prev]
                next[next.length - 1] = { ...next[next.length - 1], content: reply }
                return next
              })
            })
          }).catch(() => {
            reply = `${name} — ${links.website ? `Website: ${links.website}` : ''}${links.twitter ? ` X: ${links.twitter}` : ''}`.trim() || `${name}: No links on file.`
            setMessages(prev => {
              const next = [...prev]
              next[next.length - 1] = { ...next[next.length - 1], content: reply }
              return next
            })
          })
          return
        } else if (intent === 'chart') {
          const tokenForChart = sentToken || null
          if (!embedded && tokenForChart && typeof actions?.openTokenChart === 'function') {
            actions.openTokenChart(tokenForChart)
            reply = `Opened the TradingView chart for ${name}.`
            setMessages(prev => {
              const next = [...prev]
              next[next.length - 1] = { ...next[next.length - 1], content: reply }
              return next
            })
            return
          } else if (!embedded && typeof actions?.openTokenChart === 'function') {
            fetch(`/api/tokens/search?q=${encodeURIComponent(token)}`)
              .then((r) => r.json())
              .then((data) => {
                const first = data?.results?.[0]
                const t = first?.token
                if (t && first) {
                  const chartToken = {
                    symbol: t.symbol,
                    name: t.name || t.symbol,
                    address: t.address,
                    networkId: t.networkId,
                    logo: t.info?.imageThumbUrl || t.info?.imageLargeUrl,
                    price: first.priceUSD,
                    change: first.change24,
                  }
                  actions.openTokenChart(chartToken)
                  setMessages(prev => {
                    const next = [...prev]
                    next[next.length - 1] = { ...next[next.length - 1], content: `Opened the TradingView chart for ${t.name || t.symbol}.` }
                    return next
                  })
                } else {
                  setMessages(prev => {
                    const next = [...prev]
                    next[next.length - 1] = { ...next[next.length - 1], content: `Couldn't find a token for "${token}" to open the chart. Try selecting it from the @ dropdown first.` }
                    return next
                  })
                }
              })
              .catch(() => {
                setMessages(prev => {
                  const next = [...prev]
                  next[next.length - 1] = { ...next[next.length - 1], content: `Couldn't search for "${token}". Try selecting the token from the @ dropdown and ask for the chart again.` }
                  return next
                })
              })
            return
          } else {
            reply = `To open the TradingView chart for ${name}, go to the Research Platform (Welcome) and ask again, or select the token from the @ dropdown here and say "chart".`
          }
        } else if ((intent === 'roadmap' || intent === 'whitepaper') && links.website) {
          fetchProjectCrawl(links.website, intent).then(data => {
            const snippet = (data?.text || '').trim() || `No ${intent} text found on their site.`
            const context = { name, crawledText: snippet, twitterUrl: links.twitter || null, website: links.website || null }
            fetchAiAnswer(userText, context).then(({ text }) => {
              setMessages(prev => {
                const next = [...prev]
                next[next.length - 1] = { ...next[next.length - 1], content: text || `${name} — ${intent}:\n${snippet}` }
                return next
              })
            }).catch(() => {
              setMessages(prev => {
                const next = [...prev]
                next[next.length - 1] = { ...next[next.length - 1], content: `${name} — ${intent}:\n${snippet}` }
                return next
              })
            })
          }).catch(() => {
            setMessages(prev => {
              const next = [...prev]
              next[next.length - 1] = { ...next[next.length - 1], content: `${name} — I tried to crawl their site for ${intent} but couldn't load it (timeout or block). You can open their site: ${links.website}` }
              return next
            })
          })
          return
        } else if (intent === 'roadmap' || intent === 'whitepaper') {
          reply = `${name}: No website on file to fetch ${intent} from.`
        } else {
          reply = `${name}: No links on file.`
        }
        setLastReply(reply)
      }).catch(() => {
        clearTimeout(timeoutHandle)
        setLastReply(`Couldn't load project info for "${token}". Try again.`)
      })
      return
    }

    let reply = "I can open News, Analysis, Flows, or Mindshare in Command Center; highlight Fear & Greed; pull up a token chart (e.g. ETH, BTC, SOL); open your Watchlist; or open the Glossary. What would you like?"
    let runAction = null

    if (actions) {
      const intent = parsePageIntent(userText, context)
      if (intent) {
        reply = intent.reply
        if (intent.actionKey === 'openCommandCenterTab' && intent.payload) {
          runAction = () => actions.openCommandCenterTab?.(intent.payload)
        } else if (intent.actionKey === 'highlightFearGreed') {
          runAction = () => actions.highlightSection?.('[data-tour="sentiment"]')
        } else if (intent.actionKey === 'openWatchlist') {
          runAction = () => actions.openWatchlist?.()
        } else if (intent.actionKey === 'openWelcomeWidget') {
          runAction = () => actions.openWelcomeWidget?.()
        } else if (intent.actionKey === 'openGlossary') {
          runAction = () => actions.openGlossary?.()
        } else if (intent.actionKey === 'openTokenChart' && intent.payload) {
          runAction = () => { if (!embedded) actions.openTokenChart?.(intent.payload) }
        }
      }
    }

    if (runAction) runAction()

    setTimeout(() => {
      setMessages(prev => [...prev, { id: prev.length + 2, type: 'ai', content: reply }])
    }, 400)
  }

  const sharedInputProps = {
    ref: inputRef,
    type: 'text',
    value: input,
    onChange: (e) => setInput(e.target.value),
    onKeyDown: (e) => {
      if (showAtDropdown) {
        e.stopPropagation()
        if (e.key === 'Escape') {
          setInput(input.slice(0, atIndex))
          e.preventDefault()
          return
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          return
        }
      }
      if (e.key === 'Enter' && !e.shiftKey) sendMessage()
    },
  }

  const selectedTokenChip = selectedToken && (
    <span
      className="ai-selected-token-inline"
      onClick={() => inputRef.current?.focus()}
      onMouseDown={(e) => { if (!e.target.closest('.ai-selected-token-remove')) e.preventDefault() }}
      role="presentation"
    >
      <span className="ai-selected-token-chip">
        <span className="ai-selected-token-at" aria-hidden>@</span>
        <span className="ai-selected-token-logo-wrap">
          {selectedToken.logo && String(selectedToken.logo).trim() && !String(selectedToken.logo).includes('placeholder') ? (
            <img src={selectedToken.logo} alt="" className="ai-selected-token-logo" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; const fb = e.target.nextElementSibling; if (fb) fb.classList.add('show') }} />
          ) : null}
          <span className={`ai-selected-token-logo-fallback ${!selectedToken.logo ? 'show' : ''}`}>{(selectedToken.symbol || '?').charAt(0)}</span>
        </span>
        <span className="ai-selected-token-name">{selectedToken.symbol}</span>
        <button
          type="button"
          className="ai-selected-token-remove"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveSelectedToken() }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
          aria-label="Remove token"
          title="Remove token"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden>
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </span>
      <span className="ai-selected-token-space" aria-hidden> </span>
    </span>
  )

  const sharedDropdown = showAtDropdown && (
    <div
      ref={atDropdownRef}
      className="ai-at-dropdown"
      role="listbox"
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
      onClick={(e) => e.stopPropagation()}
    >
      {!atQuery ? (
        <div className="ai-at-dropdown-hint">Type to search tokens (e.g. spectre, palm)</div>
      ) : atSearchLoading ? (
        <div className="ai-at-dropdown-hint">Searching...</div>
      ) : atSearchResults.length === 0 ? (
        <div className="ai-at-dropdown-hint">No tokens found</div>
      ) : (
        <ul className="ai-at-dropdown-list">
          {atSearchResults.slice(0, 8).map((token) => {
            const id = token.address || token.symbol
            const inList = typeof isInWatchlist === 'function' && isInWatchlist(id)
            const logoUrl = token.logo && String(token.logo).trim() && !String(token.logo).includes('placeholder') ? token.logo : null
            return (
              <li key={id} className="ai-at-dropdown-item" role="option">
                <button
                  type="button"
                  className="ai-at-dropdown-project"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                  onClick={() => handleSelectTokenForQuestion(token)}
                  title={`Select ${token.symbol} to analyze or ask a question`}
                >
                  <span className="ai-at-dropdown-logo-wrap">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt=""
                        className="ai-at-dropdown-logo"
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.style.display = 'none'
                          const fb = e.target.parentElement?.querySelector('.ai-at-dropdown-logo-fallback')
                          if (fb) fb.classList.add('show')
                        }}
                      />
                    ) : null}
                    <span className={`ai-at-dropdown-logo-fallback ${!logoUrl ? 'show' : ''}`}>{(token.symbol || '?').charAt(0)}</span>
                  </span>
                  <span className="ai-at-dropdown-symbol">{token.symbol}</span>
                  <span className="ai-at-dropdown-name">{token.name}</span>
                </button>
                {typeof addToWatchlist === 'function' ? (
                  <button
                    type="button"
                    className={`ai-at-dropdown-add ${inList ? 'in-watchlist' : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onClick={(e) => { e.stopPropagation(); if (!inList) handleAddTokenToWatchlist(token) }}
                    disabled={inList}
                  >
                    {inList ? 'In watchlist' : 'Add to watchlist'}
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )

  const [monarchFocus, setMonarchFocus] = useState('all')
  const FOCUS_OPTIONS = [
    { id: 'all', label: 'All', icon: spectreIcons.discover },
    { id: 'tokens', label: 'Tokens', icon: spectreIcons.tokenTab },
    { id: 'wallets', label: 'Wallets', icon: spectreIcons.portfolio },
    { id: 'defi', label: 'DeFi', icon: spectreIcons.whale },
    { id: 'nfts', label: 'NFTs', icon: spectreIcons.image },
    { id: 'news', label: 'News', icon: spectreIcons.news },
  ]
  const TRENDING_ITEMS = [
    { title: 'Top gainers last 24h', tag: 'MARKETS', icon: spectreIcons.timeframe },
    { title: 'New Solana token launches', tag: 'DISCOVERY', icon: spectreIcons.plus },
    { title: 'Undervalued DeFi gems', tag: 'ALPHA', icon: spectreIcons.sparkles },
    { title: 'Whale wallet movements', tag: 'ON-CHAIN', icon: spectreIcons.whale },
    { title: 'ETH gas tracker', tag: 'TOOLS', icon: spectreIcons.aiAnalysis },
    { title: 'Institutional flows today', tag: 'SMART MONEY', icon: spectreIcons.bank },
  ]

  const panelContent = embedded ? (
    <>
      {/* Monarch header – glass strip matching main landing (Back, logo, title, Clear) */}
      <header className="ai-monarch-header">
        <div className="ai-monarch-header-inner">
          {typeof onBack === 'function' && (
            <button
              type="button"
              className="ai-monarch-back"
              onClick={() => { if (!showAtDropdown) onBack() }}
              onMouseDown={(e) => { if (showAtDropdown) { e.preventDefault(); e.stopPropagation() } }}
              aria-label="Back to Research"
            >
              {spectreIcons.chevronLeft}
              <span>Back</span>
            </button>
          )}
          <div className="ai-monarch-header-brand">
            <div className="ai-monarch-header-logo-wrap">
              <img src="/monarch-ai-logo.png" alt="" className="ai-monarch-header-logo" onError={(e) => { e.target.onerror = null; e.target.src = '/monarch-ai-logo.png' }} />
            </div>
            <span className="ai-monarch-header-title">Monarch AI</span>
          </div>
          <div className="ai-monarch-header-actions">
            {typeof onOpenLogs === 'function' && (
              <button
                type="button"
                className="ai-monarch-logs-btn"
                onClick={onOpenLogs}
                aria-label="View logs (Ctrl+L or Cmd+L)"
                title="View Monarch AI server logs (Ctrl+L or ⌘L)"
              >
                <span className="ai-monarch-logs-icon">{spectreIcons.list}</span>
                <span>Logs</span>
                <span className="ai-monarch-logs-kbd">⌘L</span>
              </button>
            )}
            {hasChatSequence && (
              <button
                type="button"
                className="ai-monarch-clear-chat"
                onClick={() => setMessages([{ id: 1, type: 'ai', content: DEFAULT_GREETING }])}
                aria-label="Clear chat"
                title="Clear chat"
              >
                <span className="ai-monarch-clear-icon">{spectreIcons.trash}</span>
                <span>Clear chat</span>
              </button>
            )}
          </div>
        </div>
      </header>
      <div className="ai-monarch-wrap">
        <div className="ai-monarch-hero">
          <div className="ai-monarch-brand">
            <div className="ai-monarch-brand-logo-wrap">
              <img src="/monarch-ai-logo.png" alt="" className="ai-monarch-brand-logo" onError={(e) => { e.target.onerror = null; e.target.src = '/monarch-ai-logo.png' }} />
            </div>
            <span className="ai-monarch-brand-text">Monarch AI</span>
          </div>
          <p className="ai-monarch-prompt">Ask anything about crypto, DeFi, or blockchain.</p>
        </div>
        {hasChatSequence && (
          <div className="ai-messages ai-monarch-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`msg ${msg.type}`}>
                {msg.type === 'ai' && (
                  <div className="msg-avatar">
                    <img src="/monarch-ai-logo.png" alt="" className="msg-avatar-img" />
                  </div>
                )}
                <div className="msg-bubble">
                  {msg.type === 'user' && msg.tokenRef ? (
                    <>
                      {(msg.contentBeforeAt ?? '').trim() ? <span className="msg-user-text">{msg.contentBeforeAt}</span> : null}
                      {(msg.contentBeforeAt ?? '').trim() ? <span className="msg-user-text-space"> </span> : null}
                      <span className="msg-user-token-chip">
                        <span className="msg-user-token-at" aria-hidden>@</span><span className="msg-user-token-logo-wrap">
                          {msg.tokenRef.logo && String(msg.tokenRef.logo).trim() ? (
                            <img src={msg.tokenRef.logo} alt="" className="msg-user-token-logo" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; const fb = e.target.nextElementSibling; if (fb) fb.classList.add('show') }} />
                          ) : null}
                          <span className={`msg-user-token-logo-fb ${!msg.tokenRef.logo ? 'show' : ''}`}>{(msg.tokenRef.symbol || '?').charAt(0)}</span>
                        </span><span className="msg-user-token-name">{msg.tokenRef.symbol}</span>
                      </span>
                      {msg.contentRest ? <><span className="msg-user-text-space"> </span><span className="msg-user-text">{msg.contentRest}</span></> : null}
                    </>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
        <div className="ai-monarch-box-wrap">
          <div className="ai-monarch-box ai-monarch-box--perplexity">
            <div className="ai-monarch-box-main ai-monarch-box-main--with-chip">
              {contentBeforeAt ? <span className="ai-compose-before">{contentBeforeAt}</span> : null}
              {selectedTokenChip}
              <input
                {...sharedInputProps}
                className="ai-monarch-input"
                placeholder={selectedToken ? 'Ask about this token...' : 'Ask anything. Type @ for mentions and / for shortcuts.'}
                aria-label="Message"
              />
            </div>
            {sharedDropdown}
            <div className="ai-monarch-box-bar">
              <div className="ai-monarch-box-bar-left">
                <button type="button" className="ai-monarch-bar-btn ai-monarch-bar-btn--search active" aria-label="Search" title="Search">
                  {spectreIcons.search}
                </button>
                <button type="button" className="ai-monarch-bar-btn ai-monarch-bar-btn--discover" aria-label="Discover" title="Discover">
                  {spectreIcons.discover}
                </button>
                <button type="button" className="ai-monarch-bar-btn ai-monarch-bar-btn--add" aria-label="Add" title="Add">
                  {spectreIcons.plus}
                </button>
              </div>
              <div className="ai-monarch-box-bar-right">
                <button type="button" className="ai-monarch-bar-btn ai-monarch-bar-btn--globe" aria-label="Web" title="Web">
                  {spectreIcons.globe}
                </button>
                <button type="button" className="ai-monarch-bar-btn ai-monarch-bar-btn--code" aria-label="Code" title="Code">
                  {spectreIcons.aiAnalysis}
                </button>
                <button type="button" className="ai-monarch-bar-btn ai-monarch-bar-btn--attach" aria-label="Attach" title="Attach">
                  {spectreIcons.attach}
                </button>
                <button type="button" className="ai-monarch-bar-btn ai-monarch-bar-btn--mic" aria-label="Voice" title="Voice">
                  {spectreIcons.mic}
                </button>
                <button
                  type="button"
                  className="ai-monarch-bar-btn ai-monarch-send-btn ai-monarch-bar-btn--send"
                  onClick={sendMessage}
                  disabled={!input.trim() && !selectedToken}
                  aria-label="Send"
                  title="Send"
                >
                  {spectreIcons.send}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="ai-monarch-focus">
          <span className="ai-monarch-focus-label">FOCUS</span>
          <div className="ai-monarch-focus-pills">
            {FOCUS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`ai-monarch-pill ai-monarch-pill--${opt.id} ${monarchFocus === opt.id ? 'active' : ''}`}
                onClick={() => setMonarchFocus(opt.id)}
                aria-pressed={monarchFocus === opt.id}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="ai-monarch-trending">
          <div className="ai-monarch-trending-header">
            {spectreIcons.trending}
            <span>TRENDING NOW</span>
          </div>
          <div className="ai-monarch-trending-grid">
            {TRENDING_ITEMS.map((item, i) => (
              <button key={i} type="button" className="ai-monarch-trend-card">
                <span className="ai-monarch-trend-icon">{item.icon}</span>
                <div className="ai-monarch-trend-content">
                  <span className="ai-monarch-trend-title">{item.title}</span>
                  <span className="ai-monarch-trend-tag">{item.tag}</span>
                </div>
                {spectreIcons.chevronRight}
              </button>
            ))}
          </div>
        </div>
        <div className="ai-monarch-bottom">
          <button type="button" className="ai-monarch-bottom-btn">
            {spectreIcons.chat}
            <span>Start a Thread</span>
          </button>
          <button type="button" className="ai-monarch-bottom-btn">
            {spectreIcons.grid}
            <span>Create Collection</span>
          </button>
          <button type="button" className="ai-monarch-bottom-btn">
            {spectreIcons.library}
            <span>Explore Library</span>
          </button>
        </div>
      </div>
    </>
  ) : (
    <>
      <div className="ai-header">
        <div className="ai-info">
          <div className="ai-avatar">
            <img src="/monarch-ai-logo.png" alt="" className="ai-avatar-img" />
          </div>
          <div>
            <span className="ai-name">Spectre AI</span>
            <span className="ai-status"><span className="status-dot"></span> Online</span>
          </div>
        </div>
        <div className="ai-header-actions">
          <button
            type="button"
            className="ai-icon-btn ai-clear-chat-btn"
            onClick={() => setMessages([{ id: 1, type: 'ai', content: DEFAULT_GREETING }])}
            aria-label="Clear chat"
            title="Clear chat"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="ai-icon">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.745-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            type="button"
            className="ai-icon-btn"
            onClick={() => setIsFullScreen(!isFullScreen)}
            aria-label={isFullScreen ? 'Exit full screen' : 'Full screen'}
            title={isFullScreen ? 'Exit full screen' : 'Full screen'}
          >
            {isFullScreen ? (
              <svg viewBox="0 0 20 20" fill="currentColor" className="ai-icon">
                <path fillRule="evenodd" d="M4 4a1 1 0 011-1h4a1 1 0 010 2H6v3a1 1 0 01-2 0V4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-2 0V6h-3a1 1 0 01-1-1zM4 16a1 1 0 011 1h4a1 1 0 010-2H6v-3a1 1 0 01-2 0v4zm10 0a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 01-2 0v3h-3a1 1 0 01-1 1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="ai-icon">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-2 0V5H4a1 1 0 01-1-1zm12 0a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-2 0V5h-2a1 1 0 01-1-1zM3 16a1 1 0 011 1h3a1 1 0 001-1v-3a1 1 0 11-2 0v3H4a1 1 0 01-1 1zm12 0a1 1 0 001 1h3a1 1 0 001-1v-3a1 1 0 11-2 0v3h-2a1 1 0 01-1 1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          <button type="button" className="ai-icon-btn ai-close-btn" onClick={() => { setIsOpen(false); setIsFullScreen(false) }} aria-label="Close chat">
            <svg viewBox="0 0 20 20" fill="currentColor" className="ai-icon">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <div className="ai-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`msg ${msg.type}`}>
            {msg.type === 'ai' && (
              <div className="msg-avatar">
                <img src="/monarch-ai-logo.png" alt="" className="msg-avatar-img" />
              </div>
            )}
            <div className="msg-bubble">
              {msg.type === 'user' && msg.tokenRef ? (
                <>
                  {(msg.contentBeforeAt ?? '').trim() ? <span className="msg-user-text">{msg.contentBeforeAt}</span> : null}
                  {(msg.contentBeforeAt ?? '').trim() ? <span className="msg-user-text-space"> </span> : null}
                  <span className="msg-user-token-chip">
                    <span className="msg-user-token-at" aria-hidden>@</span><span className="msg-user-token-logo-wrap">
                      {msg.tokenRef.logo && String(msg.tokenRef.logo).trim() ? (
                        <img src={msg.tokenRef.logo} alt="" className="msg-user-token-logo" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; const fb = e.target.nextElementSibling; if (fb) fb.classList.add('show') }} />
                      ) : null}
                      <span className={`msg-user-token-logo-fb ${!msg.tokenRef.logo ? 'show' : ''}`}>{(msg.tokenRef.symbol || '?').charAt(0)}</span>
                    </span><span className="msg-user-token-name">{msg.tokenRef.symbol}</span>
                  </span>
                  {msg.contentRest ? <><span className="msg-user-text-space"> </span><span className="msg-user-text">{msg.contentRest}</span></> : null}
                </>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-quick-actions">
        {quickActions.map((action, i) => (
          <button key={i} type="button" className="ai-quick-btn">
            {action.label}
          </button>
        ))}
      </div>

      {sharedDropdown}
      <div className="ai-input ai-input--with-chip">
        {contentBeforeAt ? <span className="ai-compose-before">{contentBeforeAt}</span> : null}
        {selectedTokenChip}
        <input {...sharedInputProps} placeholder={selectedToken ? 'Ask about this token...' : 'Ask me anything... Type @ to search tokens'} aria-label="Message" />
        <button type="button" className="ai-send-btn" onClick={sendMessage} disabled={!input.trim() && !selectedToken} aria-label="Send">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </div>
    </>
  )

  if (embedded) {
    return (
      <div className={`ai-assistant ai-assistant--embedded${dayMode ? ' day-mode' : ''}`}>
        <div className={`ai-panel ai-panel-spectre ai-panel--embedded${dayMode ? ' day-mode' : ''}`}>
          {panelContent}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`ai-assistant ${isDragging ? 'ai-assistant-dragging' : ''}`}
      style={containerStyle}
    >
      {/* Floating chat panel */}
      {isOpen && !isFullScreen && (
        <div className="ai-panel ai-panel-spectre">
          {panelContent}
        </div>
      )}

      {/* Full-screen chat overlay */}
      {isOpen && isFullScreen && createPortal(
        <div
          className="ai-chat-fullscreen"
          role="dialog"
          aria-modal="true"
          aria-label="Spectre AI chat"
        >
          <div className="ai-chat-fullscreen-backdrop" aria-hidden />
          <div className="ai-panel ai-panel-spectre ai-panel--fullscreen">
            {panelContent}
          </div>
        </div>,
        document.body
      )}

      {/* FAB – Spectre logo with glow; drag to move, click to open chat */}
      <button
        type="button"
        className={`ai-fab ${isOpen ? 'active' : ''} ${isDragging && hasMoved ? 'ai-fab-grabbing' : ''}`}
        onPointerDown={handlePointerDown}
        onClick={handleFabClick}
        title="AI Agent – drag to move"
        aria-label={isOpen ? 'Close AI chat' : 'Open AI chat'}
      >
        <span className="ai-fab-badge">AI</span>
        <span className="ai-fab-glow" aria-hidden />
        <span className="ai-fab-logo-wrap">
          <img src="/monarch-ai-logo.png" alt="Monarch AI" className="ai-fab-logo" />
        </span>
        {isOpen && (
          <span className="ai-fab-close-icon" aria-hidden>
            <span /><span />
          </span>
        )}
      </button>
      {isDragging && hasMoved && (
        <div className="ai-drag-hint" aria-hidden>Release to place</div>
      )}
    </div>
  )
}

export default AIAssistant
