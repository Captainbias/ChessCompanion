<!-- src/App.vue -->
<template>
  <div>
    <nav class="p-4 bg-gray-200">
      <button
        @click="goTo('/puzzle')"
        class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
        style="margin-right: 64px; margin-bottom:16px"
      >
        Puzzles
      </button>
      <button
        @click="goTo('/ai')"
        class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
      >
        Play AI
      </button>
    </nav>
    <router-view />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
const goTo = (path) => {
  router.push(path)
}
</script>