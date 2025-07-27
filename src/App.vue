<!--<template>
  <div>
    <div ref="board" style="width: 400px; height: 400px;"></div>
    <button @click="loadPuzzle">🎯 加载新战术题</button>
    <p>题目编号：{{ puzzleId }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Chess, type Square, type Color } from 'chess.js'
import { Chessground } from 'chessground'
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import 'chessground/assets/chessground.cburnett.css'
import type { Key } from 'chessground/types'

const board = ref<HTMLElement | null>(null)
const game = new Chess()
let ground: ReturnType<typeof Chessground> | null = null

const puzzleId = ref('')
const solution = ref<string[]>([])

const files = ['a','b','c','d','e','f','g','h']
const ranks = ['1','2','3','4','5','6','7','8']
const SQUARES: Square[] = []
for (const r of ranks) for (const f of files) SQUARES.push((f + r) as Square)

function isValidSquare(s: string): s is Square {
  return /^[a-h][1-8]$/.test(s)
}

function computeDests(game: Chess) {
  const dests = new Map<Key, Key[]>()
  SQUARES.forEach(sq => {
    if (!isValidSquare(sq)) return
    const moves = game.moves({ square: sq, verbose: true })
    if (moves.length) dests.set(sq as Key, moves.map(m => m.to as Key))
  })
  return dests
}

function mapColor(c: Color): 'white' | 'black' {
  return c === 'w' ? 'white' : 'black'
}

async function loadPuzzle() {
  try {
    const res = await fetch('https://lichess.org/api/puzzle/daily')
    const data = await res.json()
    console.log('puzzle data:', data)

    puzzleId.value = data.puzzle.id
    solution.value = data.puzzle.solution

    // 使用PGN加载棋局
    if (data.game.pgn) {
      const loadResult = game.loadPgn(data.game.pgn)
 // 如果你用的是0.13.7版本，这个函数是load_pgn

      // 获取当前局面FEN
      const currentFEN = game.fen()

      // 更新棋盘
      ground?.set({
        fen: currentFEN,
        turnColor: mapColor(game.turn()),
        movable: {
          color: mapColor(game.turn()),
          dests: computeDests(game),
          events: { after: onPlayerMove }
        }
      })
    } else {
      throw new Error('No PGN data available')
    }
  } catch (e) {
    console.error('Failed to load puzzle:', e)
  }
}



function onPlayerMove(orig: Key, dest: Key) {
  const move = game.move({ from: orig, to: dest })
  if (!move) {
    ground?.set({ fen: game.fen() }) // 非法走法还原
    return
  }

  const correctMoveSAN = solution.value[0]
  if (move.san === correctMoveSAN) {
    solution.value.shift()
    if (solution.value.length === 0) {
      alert('✅ 完美解题！')
    } else {
      setTimeout(() => {
        const nextMove = game.move(solution.value[0])
        solution.value.shift()
        ground?.set({
          fen: game.fen(),
          turnColor: mapColor(game.turn()),
          movable: {
            color: mapColor(game.turn()),
            dests: computeDests(game),
            events: { after: onPlayerMove }
          }
        })
      }, 500)
    }
  } else {
    alert('❌ 错误！再试试')
    game.undo()
    ground?.set({ fen: game.fen() })
  }
}

onMounted(() => {
  ground = Chessground(board.value!, {
    fen: game.fen(),
    turnColor: mapColor(game.turn()),
    movable: {
      color: mapColor(game.turn()),
      dests: computeDests(game),
      events: { after: onPlayerMove }
    }
  })

  loadPuzzle()
})
</script>

<style scoped>
button {
  margin-top: 10px;
  padding: 6px 12px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
}
</style>-->
<template>
  <div>
    <div ref="board" style="width: 400px; height: 400px; margin-bottom: 10px;"></div>
    <div>
      <label>
        Stockfish Depth:
        <input type="number" v-model.number="depth" min="1" max="20" />
      </label>
      <button @click="toggleBlackMode" style="margin-left: 20px;">
        切换黑方控制模式：{{ isBlackAIMode ? 'AI' : '人工' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Chess } from 'chess.js'
import { Chessground } from 'chessground'
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import 'chessground/assets/chessground.cburnett.css'

import stockfish from '@/stockfish-worker.js'

// ========== STATE ==========
const depth = ref(15)
const isBlackAIMode = ref(true)
const board = ref(null)
const game = new Chess()
let ground = null
let waitingForReadyOk = false

// ========== SQUARES ==========
const files = ['a','b','c','d','e','f','g','h']
const ranks = ['1','2','3','4','5','6','7','8']
const SQUARES = []
for (const r of ranks) {
  for (const f of files) {
    SQUARES.push(f + r)
  }
}

// ========== HELPERS ==========
function computeDests(game) {
  const dests = new Map()
  for (const sq of SQUARES) {
    const moves = game.moves({ square: sq, verbose: true })
    if (moves.length) {
      dests.set(sq, moves.map(m => m.to))
    }
  }
  return dests
}

function mapColor(c) {
  return c === 'w' ? 'white' : 'black'
}

function getMovableColor() {
  if (game.turn() === 'w') return 'white'
  return isBlackAIMode.value ? null : 'black'
}

// ========== UPDATE BOARD ==========
function updateBoard() {
  if (!ground) return

  ground.set({
    fen: game.fen(),
    turnColor: mapColor(game.turn()),
    movable: {
      color: getMovableColor(),
      dests: computeDests(game),
    },
    highlight: { lastMove: true, check: true },
  })

  if (game.isCheckmate()) {
    alert(`Checkmate! ${mapColor(game.turn() === 'w' ? 'b' : 'w')} wins.`)
  } else if (game.isStalemate()) {
    alert('Stalemate! Draw.')
  } else if (game.isDraw()) {
    alert('Draw.')
  }
}

// ========== AI MOVE ==========
function makeAIMove() {
  if (game.turn() !== 'b' || !isBlackAIMode.value) return
  console.log('AI thinking...')
  stockfish.postMessage(`position fen ${game.fen()}`)
  stockfish.postMessage('isready')
  waitingForReadyOk = true
}

stockfish.onmessage = (event) => {
  try {
    const line = event.data.trim()
    console.log('Stockfish:', line)

    if (line === 'readyok' && waitingForReadyOk) {
      waitingForReadyOk = false
      stockfish.postMessage(`go depth ${depth.value}`)
    } else if (line.startsWith('bestmove')) {
      const move = line.split(' ')[1]
      if (move && move !== '(none)') {
        const from = move.slice(0, 2)
        const to = move.slice(2, 4)
        console.log('AI move:', from, '->', to)
        const result = game.move({ from, to })
        if (!result) {
          console.error('AI move failed:', from, to)
        } else {
          updateBoard()
        }
      }
    }
  } catch (e) {
    console.error('Error processing stockfish message:', e)
  }
}

// ========== TOGGLE AI ==========
function toggleBlackMode() {
  isBlackAIMode.value = !isBlackAIMode.value
  updateBoard()
  if (isBlackAIMode.value && game.turn() === 'b') {
    makeAIMove()
  }
}

// ========== INITIALIZE ==========
onMounted(() => {
  stockfish.postMessage('uci')

  ground = Chessground(board.value, {
    fen: game.fen(),
    turnColor: 'white',
    sprite: {
      url: 'https://chessboardjs.com/img/chesspieces/wikipedia.png',
      size: 60,
      cache: false,
    },
    movable: {
      color: getMovableColor(),
      free: false,
      dests: computeDests(game),
      events: {
        after: (orig, dest) => {
          try {
            const move = game.move({ from: orig, to: dest })
            if (move) {
              updateBoard()
              if (game.turn() === 'b' && isBlackAIMode.value) {
                makeAIMove()
              }
            } else {
              // Illegal move, reset board
              ground.set({ fen: game.fen() })
            }
          } catch (e) {
            console.error('Error in after move event:', e)
          }
        }
      }
    },
    highlight: { lastMove: true, check: true },
    animation: { enabled: true, duration: 300 },
  })

  updateBoard()  // Set initial movable state
})
</script>

<!--<template>
  <div>
    <div ref="board" style="width: 400px; height: 400px; margin-bottom: 10px;"></div>
    <div>
      <label>
        Stockfish Depth:
        <input type="number" v-model.number="depth" min="1" max="20" />
      </label>
      <button @click="toggleBlackMode" style="margin-left: 20px;">
        切换黑方控制模式：{{ isBlackAIMode ? 'AI' : '人工' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Chess } from 'chess.js'
import { Chessground } from 'chessground'
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import 'chessground/assets/chessground.cburnett.css'

import stockfish from '@/stockfish-worker.js'

const depth = ref(15)
const isBlackAIMode = ref(true)

const board = ref(null)
const game = new Chess()
let ground = null

let waitingForReadyOk = false

const files = ['a','b','c','d','e','f','g','h']
const ranks = ['1','2','3','4','5','6','7','8']
const SQUARES = []
for (const r of ranks) {
  for (const f of files) {
    SQUARES.push(f + r)
  }
}

function computeDests(game) {
  const dests = new Map()
  SQUARES.forEach(sq => {
    const moves = game.moves({ square: sq, verbose: true })
    if (moves.length) dests.set(sq, moves.map(m => m.to))
  })
  return dests
}

function mapColor(c) {
  return c === 'w' ? 'white' : 'black'
}

function getMovableColor() {
  if (game.turn() === 'w') return 'white'
  return isBlackAIMode.value ? null : 'black'
}

function updateBoard() {
  if (!ground) return
  ground.set({
    fen: game.fen(),
    turnColor: mapColor(game.turn()),
    movable: {
      color: getMovableColor(),
      dests: computeDests(game),
    },
    highlight: { lastMove: true, check: true },
  })

  if (game.isCheckmate()) alert('Checkmate! ' + mapColor(game.turn() === 'w' ? 'b' : 'w') + ' wins.')
  else if (game.isStalemate()) alert('Stalemate! Draw.')
  else if (game.isDraw()) alert('Draw.')
}

function makeAIMove() {
  if (game.turn() !== 'b' || !isBlackAIMode.value) return
  console.log('AI thinking...')
  stockfish.postMessage('position fen ' + game.fen())
  stockfish.postMessage('isready')
  waitingForReadyOk = true
}

stockfish.onmessage = (event) => {
  try {
    const line = event.data.trim()
    console.log('Stockfish:', line)

    if (line === 'readyok' && waitingForReadyOk) {
      waitingForReadyOk = false
      stockfish.postMessage('go depth ' + depth.value)
    } else if (line.startsWith('bestmove')) {
      const move = line.split(' ')[1]
      if (move && move !== '(none)') {
        const from = move.slice(0, 2)
        const to = move.slice(2, 4)
        console.log('AI move:', from, '->', to)
        const result = game.move({ from, to })
        if (!result) {
          console.error('AI move failed:', from, to)
        } else {
          updateBoard()
        }
      }
    }
  } catch (e) {
    console.error('Error processing stockfish message:', e)
  }
}

function toggleBlackMode() {
  isBlackAIMode.value = !isBlackAIMode.value
  updateBoard()
  if (isBlackAIMode.value && game.turn() === 'b') {
    makeAIMove()
  }
}

onMounted(() => {
  stockfish.postMessage('uci')

  ground = Chessground(board.value, {
    fen: game.fen(),
    turnColor: 'white',
    sprite: {
      url: 'https://chessboardjs.com/img/chesspieces/wikipedia.png',
      size: 60,
      cache: false,
    },
    movable: {
      color: getMovableColor(),
      free: false,
      dests: computeDests(game),
      events: {
        after: (orig, dest) => {
          try {
            const move = game.move({ from: orig, to: dest })
            if (move) {
              updateBoard()
              if (game.turn() === 'b' && isBlackAIMode.value) {
                makeAIMove()
              }
            } else {
              ground.set({ fen: game.fen() })
            }
          } catch (e) {
            console.error('Error in after move event:', e)
          }
        }
      }
    },
    highlight: { lastMove: true, check: true },
    animation: { enabled: true, duration: 300 },
  })
})
</script>-->