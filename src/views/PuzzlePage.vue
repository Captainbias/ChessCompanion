<template>
  <div>
    <div ref="board" style="width: 400px; height: 400px; margin-bottom: 10px;"></div>
    <button @click="highlightUndefended">高亮对手无防守棋子</button>
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

// 计算所有棋格
const files = 'abcdefgh'
const ranks = '12345678'
const SQUARES: Square[] = []
for (const r of ranks) for (const f of files) SQUARES.push((f + r) as Square)

// 判断某格是否被指定颜色防守
function isSquareDefendedBy(square: Square, defenderColor: Color): boolean {
  const attackers = game.attackers(square, defenderColor)
  console.log(attackers)
  return attackers.length > 0
}

// 计算所有合法走法目标
function computeDests(game: Chess) {
  const dests = new Map<Key, Key[]>()
  SQUARES.forEach(sq => {
    const moves = game.moves({ square: sq, verbose: true })
    if (moves.length) dests.set(sq as Key, moves.map(m => m.to as Key))
  })
  return dests
}

function mapColor(c: Color): 'white' | 'black' {
  return c === 'w' ? 'white' : 'black'
}

function onPlayerMove(orig: Key, dest: Key) {
  const move = game.move({ from: orig, to: dest })
  if (!move) {
    alert('❌ 非法走法！')
    ground?.set({
      fen: game.fen(),
      turnColor: mapColor(game.turn()),
      movable: {
        free: false,
        color: mapColor(game.turn()),
        dests: computeDests(game),
        events: { after: onPlayerMove }
      }
    })
    return
  }
  ground?.set({
    fen: game.fen(),
    turnColor: mapColor(game.turn()),
    movable: {
      free: false,
      color: mapColor(game.turn()),
      dests: computeDests(game),
      events: { after: onPlayerMove }
    },
    highlight: {}  // 清除高亮
  })
}

// 高亮无防守对手棋子
function highlightUndefended() {
  const highlights = new Map<Key, string>()
  const playerColor = game.turn()
  const opponent: Color = playerColor === 'w' ? 'b' : 'w'

  for (const sq of SQUARES) {
    const piece = game.get(sq)
    if (piece && piece.color === opponent) {
      if (!isSquareDefendedBy(sq, opponent)) {
        highlights.set(sq as Key, 'undefended-piece')
      }
    }
  }

  ground?.set({
    fen: game.fen(),
    turnColor: mapColor(game.turn()),
    movable: {
      free: false,
      color: mapColor(game.turn()),
      dests: computeDests(game),
      events: { after: onPlayerMove }
    },
    highlight: {
      custom: highlights
    }
  })
}

onMounted(() => {
  ground = Chessground(board.value!, {
    fen: game.fen(),
    turnColor: mapColor(game.turn()),
    movable: {
      free: false,
      color: mapColor(game.turn()),
      dests: computeDests(game),
      events: { after: onPlayerMove }
    },
    highlight: {}
  })

  // 你可以在这里载入棋局，比如开始局面
  game.reset()
  ground.set({ fen: game.fen() })
})
</script>

<style scoped>
/* 自定义高亮样式 */
.cg-square.undefended-piece {
  background-color: rgba(255, 0, 0, 0.5) !important;
}
button {
  margin-bottom: 10px;
  padding: 6px 12px;
  background-color: #4caf50;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
}
button:hover {
  background-color: #45a049;
}
</style>


<!--<template>
  <div>
    <div ref="board" style="width: 400px; height: 400px; margin-bottom: 10px;"></div>
    <button @click="highlightUndefendedOpponentPieces" style="margin-top: 10px;">
      {{ highlightActive ? '取消高亮未防守棋子' : '高亮未防守对方棋子' }}
    </button>
    <div style="margin: 10px 0;">
      <label>
        主题:
        <select v-model="selectedTheme">
          <option value="">全部</option>
          <option v-for="theme in themes" :key="theme" :value="theme">{{ theme }}</option>
        </select>
      </label>

      <label style="margin-left: 10px;">
        难度:
        <select v-model="selectedRatingRange">
          <option value="">全部</option>
          <option v-for="range in ratingOptions" :key="range" :value="range">{{ range }}</option>
        </select>
      </label>

      <button @click="loadPuzzle" style="margin-left: 10px;">🎯 加载新战术题</button>
    </div>

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

const highlightActive = ref(false)

const files = ['a','b','c','d','e','f','g','h']
const ranks = ['1','2','3','4','5','6','7','8']
const SQUARES: Square[] = []
for (const r of ranks) {
  for (const f of files) {
    SQUARES.push((f + r) as Square)
  }
}

const puzzleId = ref('')
const solution = ref<string[]>([])

const selectedTheme = ref('')
const selectedRatingRange = ref('')

const ratingOptions = [
  "0-1000",
  "1000-1200",
  "1200-1400",
  "1400-1600",
  "1600-1800",
  "1800-2000",
  "2000-2200",
  "2200-2400",
  "2400+"
]

const themes = [
  "advancedPawn","advantage","anastasiaMate","arabianMate","attackingF2F7","attraction",
  "backRankMate","bishopEndgame","bodenMate","capturingDefender","castling","clearance",
  "crushing","defensiveMove","deflection","discoveredAttack","doubleBishopMate","doubleCheck",
  "dovetailMate","enPassant","endgame","equality","exposedKing","fork","hangingPiece","hookMate",
  "interference","intermezzo","killBoxMate","kingsideAttack","knightEndgame","mate","mateIn1",
  "mateIn2","mateIn3","mateIn4","mateIn5","middlegame","oneMove","opening","pawnEndgame",
  "pin","promotion","queenEndgame","queenRookEndgame","queensideAttack","quietMove","rookEndgame",
  "sacrifice","skewer","smotheredMate","trappedPiece","underPromotion","vukovicMate","xRayAttack",
  "zugzwang"
]

// 辅助：判断某格是否被指定颜色防守
function isSquareDefendedBy(square: Square, defenderColor: Color): boolean {
  const attackers = game.attackers(square, defenderColor)
  return attackers.length > 0
}


// 获取对方颜色
function opponentColor(c: Color): Color {
  return c === 'w' ? 'b' : 'w'
}

// 找出对方未被防守的棋子格子，返回高亮对象
function getUndefendedOpponentSquares() {
  const currentTurn = game.turn()
  const opponent = opponentColor(currentTurn)

  const highlights: Record<string, { background: string }> = {}

  // 遍历棋盘所有格
  for (let file of 'abcdefgh') {
    for (let rank = 1; rank <= 8; rank++) {
      const sq = `${file}${rank}` as Square
      const piece = game.get(sq)
      if (piece && piece.color === opponent) {
        // 如果该格不被己方防守
        if (!isSquareDefendedBy(sq, opponent)) {
          highlights[sq] = { background: 'rgba(255, 0, 0, 0.5)' }
        }
      }
    }
  }
  return highlights
}

// 按钮事件调用这个函数高亮
function highlightUndefendedOpponentPieces() {
  if (!ground) return
  const highlights = getUndefendedOpponentSquares()
  ground.set({ highlight: highlights })
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

async function loadPuzzle() {
  try {
    const params = new URLSearchParams()
    if (selectedTheme.value) params.append('theme', selectedTheme.value)
    if (selectedRatingRange.value) {
      const [min, max] = selectedRatingRange.value.split('-')
      params.append('min_rating', min)
      if (max) params.append('max_rating', max)
      else params.append('max_rating', '9999') // “2400+”情况
    }

    const url = `http://127.0.0.1:5000/puzzle/random?${params.toString()}`
    console.log('Request URL:', url)

    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    puzzleId.value = data.PuzzleId || data.id || 'unknown'
    solution.value = data.Moves.split(' ')

    if (data.FEN || data.fen) {
      const fenStr = data.FEN || data.fen
      const loadResult = game.load(fenStr)

      ground?.set({
        fen: fenStr,
        turnColor: mapColor(game.turn()),
        movable: {
          color: mapColor(game.turn()),
          dests: computeDests(game),
          events: { after: onPlayerMove }
        }
      })
    } else {
      throw new Error('No FEN data')
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      alert('加载失败: ' + e.message)
      console.error(e)
    } else {
      alert('加载失败: 未知错误')
      console.error(e)
    }
  }
}

function onPlayerMove(orig: Key, dest: Key) {
  const move = game.move({ from: orig, to: dest })
  if (!move) {
    alert('❌ 非法走法！')
    ground?.set({
      fen: game.fen(),
      turnColor: mapColor(game.turn()),
      movable: {
        free: false,
        color: mapColor(game.turn()),
        dests: computeDests(game),
        events: { after: onPlayerMove }
      }
    })
    return
  }

  const expectedMove = solution.value[0]

  if ((move.from + move.to) === expectedMove) {
    solution.value.shift()
    if (solution.value.length === 0) {
      alert('✅ 完美解题！')
      loadPuzzle()  // 自动加载下一题
    } else {
      setTimeout(() => {
        const nextMoveLAN = solution.value[0]
        const nextMove = game.move({ from: nextMoveLAN.slice(0, 2), to: nextMoveLAN.slice(2, 4) })
        solution.value.shift()
        ground?.set({
          fen: game.fen(),
          turnColor: mapColor(game.turn()),
          movable: {
            free: false,
            color: mapColor(game.turn()),
            dests: computeDests(game),
            events: { after: onPlayerMove }
          }
        })
      }, 400)
    }
  } else {
    alert('❌ 错误！请按正确顺序走')
    game.undo()
    ground?.set({
      fen: game.fen(),
      turnColor: mapColor(game.turn()),
      movable: {
        free: false,
        color: mapColor(game.turn()),
        dests: computeDests(game),
        events: { after: onPlayerMove }
      }
    })
  }
}

onMounted(() => {
  ground = Chessground(board.value!, {
    fen: game.fen(),
    turnColor: mapColor(game.turn()),
    movable: {
      free: false,
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
label {
  font-weight: bold;
}
select {
  margin-left: 6px;
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid #ccc;
}
</style>-->

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
    alert('❌ 非法走法！')
    ground?.set({ fen: game.fen(), turnColor: mapColor(game.turn()), movable: {
      free: false,
      color: mapColor(game.turn()),
      dests: computeDests(game),
      events: { after: onPlayerMove }
    }})
    return
  }

  const expectedMove = solution.value[0]

  console.log('Player move from-to:', move.from + move.to)
  console.log('Expected move:', expectedMove)

  if ((move.from + move.to) === expectedMove) {
    solution.value.shift()
    if (solution.value.length === 0) {
      alert('✅ 完美解题！')
      
    } else {
      setTimeout(() => {
        const nextMoveLAN = solution.value[0]
        const nextMove = game.move({ from: nextMoveLAN.slice(0, 2), to: nextMoveLAN.slice(2, 4) })
        solution.value.shift()
        ground?.set({
          fen: game.fen(),
          turnColor: mapColor(game.turn()),
          movable: {
            free: false,
            color: mapColor(game.turn()),
            dests: computeDests(game),
            events: { after: onPlayerMove }
          }
        })
      }, 400)
    }
  } else {
    alert('❌ 错误！请按正确顺序走')
    game.undo()
    ground?.set({
      fen: game.fen(),
      turnColor: mapColor(game.turn()),
      movable: {
        free: false,
        color: mapColor(game.turn()),
        dests: computeDests(game),
        events: { after: onPlayerMove }
      }
    })
  }
}

onMounted(() => {
  ground = Chessground(board.value!, {
    fen: game.fen(),
    turnColor: mapColor(game.turn()),
    movable: {
      free: false,
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