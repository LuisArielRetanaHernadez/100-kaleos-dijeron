import test from 'node:test'
import assert from 'node:assert/strict'
import { applyAction, createGame, publicGame } from './game.js'

test('oculta respuestas y suma al pozo solo al revelar por primera vez', () => {
  const game = createGame()
  assert.deepEqual(publicGame(game).answers[0], { index: 0 })
  assert.deepEqual(publicGame(game).hostAnswers[0], { text: 'Música', points: 28 })
  applyAction(game, 'reveal', { index: 0 })
  applyAction(game, 'reveal', { index: 0 })
  assert.equal(game.bank, 28)
  assert.equal(publicGame(game).answers[0].text, 'Música')
})

test('aplica el multiplicador de ronda y entrega los puntos al equipo activo', () => {
  const game = createGame()
  game.round = 2
  applyAction(game, 'reveal', { index: 0 })
  assert.equal(game.bank, 64)
  applyAction(game, 'award')
  assert.equal(game.teams[0].score, 64)
  assert.equal(game.bank, 0)
})

test('limita los errores a tres y prepara la siguiente ronda', () => {
  const game = createGame()
  for (let i = 0; i < 5; i += 1) applyAction(game, 'strike')
  assert.equal(game.strikes, 3)
  applyAction(game, 'next-round')
  assert.equal(game.round, 1)
  assert.equal(game.strikes, 0)
  assert.equal(game.activeTeam, 1)
})

test('permite seleccionar una sección sin borrar los puntos de los equipos', () => {
  const game = createGame()
  game.teams[0].score = 85
  applyAction(game, 'select-section', { section: 2 })
  const view = publicGame(game)
  assert.equal(view.sectionTitle, 'Ronda 3: Cultura general cristiana')
  assert.equal(view.question, 'Menciona un gigante, villano o enemigo famoso de la Biblia')
  assert.equal(view.teams[0].score, 85)
})

test('avanza automáticamente a la siguiente sección al terminar sus preguntas', () => {
  const game = createGame()
  game.round = 4
  applyAction(game, 'next-round')
  assert.equal(game.section, 1)
  assert.equal(game.round, 0)
  assert.equal(publicGame(game).hostAnswers[0].text, 'La Pasión de Cristo')
})

test('usa las rondas dinámicas al mostrar y avanzar el juego', () => {
  const customSections = [
    { title: 'Ronda editable', shortTitle: 'Editable', questions: [{ question: 'Pregunta nueva', multiplier: 3, answers: [{ text: 'Respuesta nueva', points: 7 }] }] },
    { title: 'Segunda ronda', shortTitle: 'Segunda', questions: [{ question: 'Otra pregunta', multiplier: 1, answers: [{ text: 'Otra respuesta', points: 5 }] }] },
  ]
  const game = createGame()
  assert.equal(publicGame(game, customSections).question, 'Pregunta nueva')
  applyAction(game, 'reveal', { index: 0 }, customSections)
  assert.equal(game.bank, 21)
  applyAction(game, 'next-round', {}, customSections)
  assert.equal(game.section, 1)
  assert.equal(publicGame(game, customSections).question, 'Otra pregunta')
})
