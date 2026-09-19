import { useCallback, useEffect, useRef, useState } from 'react'

const api = {
  get: () => fetch('/api/game').then((response) => response.json()),
  action: (action, payload = {}) => fetch('/api/game/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  }).then((response) => response.json()),
  reset: () => fetch('/api/game/reset', { method: 'POST' }).then((response) => response.json()),
}

function useSounds() {
  const context = useRef(null)
  return useCallback((type) => {
    context.current ||= new AudioContext()
    const ctx = context.current
    const now = ctx.currentTime
    const notes = type === 'reveal' ? [392, 523, 659] : type === 'strike' ? [180, 110] : [523, 659, 784, 1047]
    notes.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = type === 'strike' ? 'sawtooth' : 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.001, now + index * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.16, now + index * 0.08 + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.17)
      oscillator.connect(gain).connect(ctx.destination)
      oscillator.start(now + index * 0.08)
      oscillator.stop(now + index * 0.08 + 0.2)
    })
  }, [])
}

function TeamCard({ team, index, active, onRename }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(team.name)

  useEffect(() => setName(team.name), [team.name])

  const submit = (event) => {
    event.preventDefault()
    onRename(index, name)
    setEditing(false)
  }

  return (
    <section className={`team-card ${active ? 'active' : ''}`}>
      <div className="team-label">{active ? 'EN TURNO' : `EQUIPO ${index + 1}`}</div>
      {editing ? (
        <form onSubmit={submit} className="rename-form">
          <input autoFocus value={name} maxLength="24" onChange={(event) => setName(event.target.value)} onBlur={submit} />
        </form>
      ) : (
        <button className="team-name" onClick={() => setEditing(true)} title="Cambiar nombre">{team.name}</button>
      )}
      <strong className="team-score">{team.score}</strong>
      <span className="team-points">PUNTOS</span>
    </section>
  )
}

function Answer({ answer, position }) {
  const revealed = Boolean(answer.text)
  return (
    <div className={`answer ${revealed ? 'revealed' : ''}`}>
      <div className="answer-inner">
        <div className="answer-back"><span>{position}</span></div>
        <div className="answer-front">
          <span className="answer-text">{answer.text}</span>
          <span className="answer-points">{answer.points}</span>
        </div>
      </div>
    </div>
  )
}

function HostPanel({ game, onAction, onReset }) {
  const [open, setOpen] = useState(true)
  return (
    <aside className={`host-panel ${open ? 'open' : ''}`}>
      <button className="host-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="live-dot" /> Controles del anfitrión <span>{open ? '⌄' : '⌃'}</span>
      </button>
      {open && (
        <div className="host-content">
          <div className="host-group answer-buttons">
            <span className="control-label">REVELAR RESPUESTA</span>
            <div>
              {game.hostAnswers.map((answer, index) => (
                <button key={index} disabled={Boolean(game.answers[index].text)} onClick={() => onAction('reveal', { index })}>
                  <b>{index + 1}</b>
                  <span>{answer.text}</span>
                  <small>{answer.points}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="host-group">
            <span className="control-label">JUGADA</span>
            <div className="action-buttons">
              <button className="danger" onClick={() => onAction('strike')}>✕ Error</button>
              <button onClick={() => onAction('clear-strikes')}>Limpiar</button>
              <button onClick={() => onAction('switch-team')}>⇄ Cambiar equipo</button>
              <button className="award" disabled={!game.bank} onClick={() => onAction('award')}>★ Dar {game.bank} pts</button>
            </div>
          </div>
          <div className="host-group round-controls">
            <span className="control-label">SECCIÓN Y PARTIDA</span>
            <select aria-label="Seleccionar sección" value={game.section} onChange={(event) => onAction('select-section', { section: Number(event.target.value) })}>
              {game.sections.map((section, index) => <option key={section.title} value={index}>{section.shortTitle}</option>)}
            </select>
            <div>
              <button className="next" onClick={() => onAction('next-round')}>
                {game.isLastQuestion ? (game.isLastSection ? 'Ver ganador' : 'Siguiente sección →') : 'Siguiente pregunta →'}
              </button>
              <button className="reset" onClick={onReset} title="Reiniciar partida">↻</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

export default function App() {
  const [game, setGame] = useState(null)
  const [error, setError] = useState('')
  const playSound = useSounds()
  const previousEvent = useRef(0)

  const load = useCallback(async () => {
    try {
      const next = await api.get()
      setGame((current) => {
        if (current && next.event > previousEvent.current) {
          if (next.lastAction === 'reveal') playSound('reveal')
          if (next.lastAction === 'strike') playSound('strike')
          if (next.lastAction === 'award') playSound('award')
        }
        previousEvent.current = next.event
        return next
      })
      setError('')
    } catch {
      setError('No pudimos conectar con el tablero.')
    }
  }, [playSound])

  useEffect(() => {
    load()
    const timer = setInterval(load, 1500)
    return () => clearInterval(timer)
  }, [load])

  const action = async (name, payload) => {
    const next = await api.action(name, payload)
    previousEvent.current = next.event
    setGame(next)
    if (name === 'reveal' || name === 'strike' || name === 'award') playSound(name)
  }

  const reset = async () => {
    if (window.confirm('¿Quieres reiniciar todos los puntos y volver a la primera ronda?')) setGame(await api.reset())
  }

  if (!game) return <main className="loading">{error || 'Preparando el tablero…'}</main>

  const winner = game.teams[0].score === game.teams[1].score ? null : game.teams.reduce((best, team) => team.score > best.score ? team : best)

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-100">100</span><span>KALEOS<br /><b>DIJERON</b></span></div>
        <div className="round-info">
          <span>{game.sectionTitle}</span>
          <small>PREGUNTA {game.round + 1} DE {game.totalRounds}</small>
          <div className="round-dots">{Array.from({ length: game.totalRounds }, (_, i) => <i key={i} className={i <= game.round ? 'done' : ''} />)}</div>
        </div>
        <div className="multiplier">VALOR <strong>×{game.multiplier}</strong></div>
      </header>

      <div className="game-area">
        <div className="team-side left"><TeamCard team={game.teams[0]} index={0} active={game.activeTeam === 0} onRename={(index, name) => action('team-name', { index, name })} /></div>

        <section className="stage">
          <div className="question-label">LA PREGUNTA ES…</div>
          <h1>{game.question}</h1>
          <div className="board-wrap">
            <div className="bulbs top" />
            <div className="answer-board">
              {game.answers.map((answer, index) => <Answer key={`${game.section}-${game.round}-${index}`} answer={answer} position={index + 1} />)}
            </div>
            <div className="bulbs bottom" />
          </div>
          <div className="round-status">
            <div className="strikes" aria-label={`${game.strikes} errores`}>
              {[0, 1, 2].map((index) => <span key={index} className={index < game.strikes ? 'visible' : ''}>×</span>)}
            </div>
            <div className="bank"><span>POZO DE LA RONDA</span><strong>{game.bank}</strong><small>PTS</small></div>
          </div>
        </section>

        <div className="team-side right"><TeamCard team={game.teams[1]} index={1} active={game.activeTeam === 1} onRename={(index, name) => action('team-name', { index, name })} /></div>
      </div>

      {game.status === 'finished' && (
        <div className="winner-overlay">
          <div className="winner-card">
            <span>✦ RESULTADO FINAL ✦</span>
            <h2>{winner ? `¡Ganó ${winner.name}!` : '¡Tenemos un empate!'}</h2>
            <p>{game.teams[0].score} — {game.teams[1].score}</p>
            <button onClick={reset}>Jugar de nuevo</button>
          </div>
        </div>
      )}

      <HostPanel game={game} onAction={action} onReset={reset} />
      {error && <div className="toast">{error}</div>}
    </main>
  )
}
