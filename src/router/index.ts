// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import PuzzlePage from '../views/PuzzlePage.vue'
import AIPage from '../views/AIPage.vue'

const routes = [
  {
    path: '/',
    redirect:'/puzzle'
  },
  {
    path: '/puzzle',
    name: 'PuzzlePage',
    component: PuzzlePage
  },
  {
    path: '/ai',
    name: 'AIPage',
    component: AIPage
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
