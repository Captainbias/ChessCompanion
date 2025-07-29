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
        const promotion = move.length === 5 ? move[4] : undefined

        const result = game.move({ from, to, promotion })
        if (!result) {
          console.error('AI move failed:', from, to, promotion || '')
        } else {
          updateBoard()
        }
      }
    }
  }catch (e) {
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
            const piece = game.get(orig)

            // Check for pawn promotion
            const isPromotion = piece?.type === 'p' &&
              ((piece.color === 'w' && dest[1] === '8') || (piece.color === 'b' && dest[1] === '1'))

            let move
            if (isPromotion) {
              let promotion = prompt("Promote to (q, r, b, n):", "q")?.toLowerCase()
              if (!['q', 'r', 'b', 'n'].includes(promotion)) {
                promotion = 'q' // fallback to queen
              }
              move = game.move({ from: orig, to: dest, promotion })
            } else {
              move = game.move({ from: orig, to: dest })
            }

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