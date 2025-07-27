<template>
  <div ref="board" style="width: 400px; height: 400px;"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Chess } from 'chess.js'
import { Chessground } from 'chessground'
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import 'chessground/assets/chessground.cburnett.css'

import stockfish from '@/stockfish-worker.js' // 注意路径要对应你的项目结构

const board = ref(null)
const game = new Chess()
let ground = null

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

function updateBoard() {
  if (!ground) return
  ground.set({
    fen: game.fen(),
    turnColor: mapColor(game.turn()),
    movable: {
      color: mapColor(game.turn()),
      dests: computeDests(game)
    }
  })
}

function makeAIMove() {
  stockfish.postMessage('position fen ' + game.fen())
  stockfish.postMessage('go depth 15')
}

stockfish.onmessage = (event) => {
  const line = event.data
  console.log('Stockfish:', line)

  if (line.startsWith('bestmove')) {
    const parts = line.split(' ')
    const move = parts[1]
    if (move === '(none)') return // no moves available

    const from = move.slice(0, 2)
    const to = move.slice(2, 4)
    const result = game.move({ from, to })
    if (result) updateBoard()
  }
}

onMounted(() => {
  console.log(board.value)
  stockfish.postMessage('uci')
  
  ground = Chessground(board.value, {
    fen: game.fen(),
    turnColor: 'white',
    sprite: {
      url: 'https://chessboardjs.com/img/chesspieces/wikipedia.png',
      size: 60,
      cache: false
    },
    movable: {
      color: 'white',
      free: false,
      dests: computeDests(game),
      events: {
        after: (orig, dest) => {
          const move = game.move({ from: orig, to: dest })
          if (move) {
            updateBoard()
            if (game.turn() === 'b') makeAIMove()
          } else {
            ground.set({ fen: game.fen() })
          }
        }
      }
    },
    highlight: { lastMove: true, check: true },
    animation: { enabled: true, duration: 300 }
  })
})
</script>

<!--  can play black pieces  <template>
  <div ref="board" style="width: 400px; height: 400px;"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Chess } from 'chess.js'
import { Chessground } from 'chessground'
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'

const board = ref(null)
const game = new Chess()
let ground = null

// 生成所有合法格子
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

// 把 chess.js 里的 'w'/'b' 转成 chessground 的 'white'/'black'
function mapColor(c) {
  return c === 'w' ? 'white' : 'black'
}

onMounted(() => {
  ground = Chessground(board.value, {
    fen: game.fen(),
    turnColor: mapColor(game.turn()),
    sprite: {
      url: 'https://chessboardjs.com/img/chesspieces/wikipedia.png',
      size: 60,
      cache: false
    },
    movable: {
      free: false,
      color: mapColor(game.turn()),
      dests: computeDests(game),
      events: {
        after: (orig, dest) => {
          const moveResult = game.move({ from: orig, to: dest })
          if (moveResult) {
            const justMovedColor = game.turn() === 'w' ? 'b' : 'w'

            ground.set({
              fen: game.fen(),
              turnColor: mapColor(game.turn()),
              movable: {
                color: mapColor(game.turn()),
                dests: computeDests(game)
              }
            })

            if (game.in_checkmate()) {
              alert('Checkmate! ' + mapColor(justMovedColor) + ' wins.')
            } else if (game.in_stalemate()) {
              alert('Stalemate!')
            } else if (game.in_draw()) {
              alert('Draw!')
            } else if (game.insufficient_material()) {
              alert('Draw by insufficient material!')
            } else if (game.in_threefold_repetition()) {
              alert('Draw by threefold repetition!')
            } else if (game.in_check()) {
              console.log(`${mapColor(justMovedColor)} is in check!`)
            }
          } else {
            ground.set({ fen: game.fen() })
          }
        }
      }
    }
  })
})
</script>

<style>
/* 你可以根据需要自定义样式 */
</style> -->