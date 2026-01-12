<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useUserStore } from '@/stores/user';
import { onMounted, ref } from 'vue';

const userStore = useUserStore();
const isRestoring = ref(true);

onMounted(async () => {
  await userStore.restoreSession();
  isRestoring.value = false;
});
</script>

<template>
  <div class="app-container">
    <div v-if="isRestoring" class="loading-overlay">
       <div class="spinner">Lade Kolla...</div>
    </div>
    <RouterView v-else />
  </div>
</template>

<style>
/* Global styles */
body {
  margin: 0;
  padding: 0;
  background-color: #f4f7f6;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.loading-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #f4f7f6;
    z-index: 9999;
    color: #666;
    font-size: 1.2rem;
}
</style>
