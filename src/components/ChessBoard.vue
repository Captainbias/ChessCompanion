<template>
  <div ref="board" style="width: 400px; height: 400px;"></div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Chess, type Square, type Color } from 'chess.js'
import { Chessground } from 'chessground'
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.cburnett.css'
import type { Key } from 'chessground/types'

// 生成合法格子
const files = ['a','b','c','d','e','f','g','h']
const ranks = ['1','2','3','4','5','6','7','8']
const SQUARES: Square[] = []
for (const r of ranks) {
  for (const f of files) {
    SQUARES.push((f + r) as Square)
  }
}

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

const board = ref<HTMLElement | null>(null)
const game = new Chess()
// 用 ReturnType 推断 Chessground 实例类型
let ground: ReturnType<typeof Chessground> | null = null

onMounted(() => {
  ground = Chessground(board.value!, {
    fen: game.fen(),
    turnColor: mapColor(game.turn()),
    movable: {
      free: false,
      color: mapColor(game.turn()),
      dests: computeDests(game),
      events: {
        after: (orig: Key, dest: Key) => {
          const moveResult = game.move({ from: orig, to: dest })
          if (moveResult) {
            ground?.set({
              fen: game.fen(),
              turnColor: mapColor(game.turn()),
              movable: {
                color: mapColor(game.turn()),
                dests: computeDests(game)
              }
            })
          } else {
            ground?.set({ fen: game.fen() })
          }
        }
      }
    }
  })
})
</script>

<style scoped>
/* 你可以根据需求写样式 */
</style>

