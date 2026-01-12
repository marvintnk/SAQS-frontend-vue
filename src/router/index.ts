import { createRouter, createWebHistory } from 'vue-router'
import StartView from '@/views/StartView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'start',
      component: StartView
    },
    {
      path: '/my-work-steps',
      name: 'actor-dashboard',
      component: () => import('@/views/ActorDashboardView.vue') // Placeholder logic
    },
    {
      path: '/workflow-manager',
      name: 'manager-dashboard',
      component: () => import('@/views/ManagerDashboardView.vue') // Placeholder logic
    }
  ],
})

export default router
