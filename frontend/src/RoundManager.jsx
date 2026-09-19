import { useEffect, useState } from 'react'
import { API_URL } from './services/api.js'

const emptyRound = () => ({
  title: 'Nueva ronda',
  shortTitle: 'Nueva ronda',
  questions: [{
    question: '',
    multiplier: 1,
    answers: [{ text: '', points: 0 }, { text: '', points: 0 }],
  }],
})

async function request(url, options) {
  const response = await fetch(`${API_URL}${url}`, options)
  const data = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(data?.error || 'No se pudo completar la operación.')
  return data
}

export default function RoundManager({ onClose, onChanged }) {
  const [rounds, setRounds] = useState([])
  const [draft, setDraft] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadRounds = async (preferredId) => {
    const data = await request('/api/rounds')
    setRounds(data)
    const selected = data.find((round) => round.id === preferredId) || data[0]
    if (selected) {
      setSelectedId(selected.id)
      setDraft(structuredClone(selected))
    }
  }

  useEffect(() => {
    loadRounds().catch((loadError) => setError(loadError.message))
  }, [])

  const selectRound = (round) => {
    setSelectedId(round.id)
    setDraft(structuredClone(round))
    setError('')
  }

  const updateQuestion = (questionIndex, changes) => {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, index) => index === questionIndex ? { ...question, ...changes } : question),
    }))
  }

  const updateAnswer = (questionIndex, answerIndex, changes) => {
    const answers = draft.questions[questionIndex].answers.map((answer, index) => index === answerIndex ? { ...answer, ...changes } : answer)
    updateQuestion(questionIndex, { answers })
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const saved = await request(selectedId ? `/api/rounds/${selectedId}` : '/api/rounds', {
        method: selectedId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      await loadRounds(saved.id)
      await onChanged()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const removeRound = async () => {
    if (!selectedId || !window.confirm(`¿Eliminar “${draft.title}” y todas sus preguntas?`)) return
    setSaving(true)
    setError('')
    try {
      await request(`/api/rounds/${selectedId}`, { method: 'DELETE' })
      await loadRounds()
      await onChanged()
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="manager-overlay" role="dialog" aria-modal="true" aria-labelledby="manager-title">
      <section className="round-manager">
        <header className="manager-header">
          <div><span>CONFIGURACIÓN</span><h2 id="manager-title">Administrar rondas</h2></div>
          <button onClick={onClose} aria-label="Cerrar administrador">×</button>
        </header>

        <div className="manager-body">
          <nav className="round-list" aria-label="Rondas">
            <button className="new-round" onClick={() => { setSelectedId(null); setDraft(emptyRound()); setError('') }}>＋ Nueva ronda</button>
            {rounds.map((round, index) => (
              <button key={round.id} className={selectedId === round.id ? 'selected' : ''} onClick={() => selectRound(round)}>
                <b>{index + 1}</b><span>{round.shortTitle}</span><small>{round.questions.length} preguntas</small>
              </button>
            ))}
          </nav>

          {draft && (
            <form className="round-editor" onSubmit={save}>
              <div className="editor-fields">
                <label>Título completo<input required maxLength="100" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
                <label>Nombre corto<input required maxLength="45" value={draft.shortTitle} onChange={(event) => setDraft({ ...draft, shortTitle: event.target.value })} /></label>
              </div>

              <div className="questions-heading"><h3>Preguntas</h3><span>{draft.questions.length} de 20</span></div>
              <div className="question-editor-list">
                {draft.questions.map((question, questionIndex) => (
                  <article className="question-editor" key={questionIndex}>
                    <div className="question-editor-head">
                      <strong>Pregunta {questionIndex + 1}</strong>
                      <label>Multiplicador <input type="number" min="1" max="10" value={question.multiplier} onChange={(event) => updateQuestion(questionIndex, { multiplier: Number(event.target.value) })} /></label>
                      <button type="button" className="icon-danger" disabled={draft.questions.length === 1} onClick={() => setDraft({ ...draft, questions: draft.questions.filter((_, index) => index !== questionIndex) })}>Eliminar</button>
                    </div>
                    <textarea required maxLength="240" rows="2" placeholder="Escribe la pregunta…" value={question.question} onChange={(event) => updateQuestion(questionIndex, { question: event.target.value })} />
                    <div className="answer-editor-list">
                      <span>RESPUESTAS Y PUNTOS</span>
                      {question.answers.map((answer, answerIndex) => (
                        <div className="answer-editor" key={answerIndex}>
                          <b>{answerIndex + 1}</b>
                          <input required maxLength="100" placeholder="Respuesta" value={answer.text} onChange={(event) => updateAnswer(questionIndex, answerIndex, { text: event.target.value })} />
                          <input aria-label={`Puntos de respuesta ${answerIndex + 1}`} type="number" min="0" max="999" value={answer.points} onChange={(event) => updateAnswer(questionIndex, answerIndex, { points: Number(event.target.value) })} />
                          <button type="button" aria-label="Eliminar respuesta" disabled={question.answers.length === 1} onClick={() => updateQuestion(questionIndex, { answers: question.answers.filter((_, index) => index !== answerIndex) })}>×</button>
                        </div>
                      ))}
                      <button type="button" className="add-answer" disabled={question.answers.length >= 8} onClick={() => updateQuestion(questionIndex, { answers: [...question.answers, { text: '', points: 0 }] })}>＋ Agregar respuesta</button>
                    </div>
                  </article>
                ))}
              </div>
              <button type="button" className="add-question" disabled={draft.questions.length >= 20} onClick={() => setDraft({ ...draft, questions: [...draft.questions, { question: '', multiplier: 1, answers: [{ text: '', points: 0 }] }] })}>＋ Agregar pregunta</button>

              {error && <p className="manager-error">{error}</p>}
              <footer className="editor-actions">
                {selectedId && <button type="button" className="delete-round" disabled={saving} onClick={removeRound}>Eliminar ronda</button>}
                <button type="button" disabled={saving} onClick={onClose}>Cancelar</button>
                <button className="save-round" disabled={saving}>{saving ? 'Guardando…' : selectedId ? 'Guardar cambios' : 'Crear ronda'}</button>
              </footer>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
