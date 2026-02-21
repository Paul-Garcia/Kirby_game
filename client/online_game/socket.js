import { io } from 'socket.io-client'

export const socket = io()

let lastOnlineCount = undefined

function getPlayerName() {
  try {
    return (window?.localStorage?.getItem('kirby_player_name') || '').trim()
  } catch {
    return ''
  }
}

function renderOnline() {
  const el = document.getElementById('hud-online')
  if (!el) return
  const n = Number.isFinite(lastOnlineCount) ? lastOnlineCount : Number(lastOnlineCount)
  el.textContent = `Online: ${Number.isFinite(n) ? n : '-'}`
}

function renderPseudo() {
  const el = document.getElementById('hud-pseudo')
  if (!el) return
  const name = getPlayerName()
  el.textContent = `Nickname: ${name || '-'}`
}

function setOnlineCount(count) {
  lastOnlineCount = count
  renderOnline()
}

socket.on('players_count', ({ count } = {}) => {
  setOnlineCount(count)
})

socket.on('connect', () => {
  socket.emit('get_players_count')
  renderOnline()
  renderPseudo()
})

export function refreshHud() {
  renderPseudo()
}