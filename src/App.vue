<template>
  <div ref="board" style="width: 400px; height: 400px;"></div>
  <ChessBoard/>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Chess } from 'chess.js'
import { Chessground } from 'chessground'
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import ChessBoard from './components/ChessBoard.vue'

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
            ground.set({
              fen: game.fen(),
              turnColor: mapColor(game.turn()),
              movable: {
                color: mapColor(game.turn()),
                dests: computeDests(game)
              }
            })
          } else {
            // 非法走法时重置棋盘
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
</style>