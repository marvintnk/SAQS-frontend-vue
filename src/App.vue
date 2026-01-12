<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useUserStore } from '@/stores/user';
import { onMounted, ref, onErrorCaptured } from 'vue';

const userStore = useUserStore();
const isRestoring = ref(true);
const globalError = ref<string | null>(null);

onMounted(async () => {
  try {
      await userStore.restoreSession();
  } catch(e) {
      console.error("Critical session restore error", e);
  } finally {
      isRestoring.value = false;
  }
});

onErrorCaptured((err) => {
    console.error("Captured global error:", err);
    globalError.value = String(err);
    return false; // Stop propagation
});
</script>

<template>
  <div class="app-container">
    <div v-if="globalError" class="global-error">
        <h2>Ein kritischer Fehler ist aufgetreten:</h2>
        <pre>{{ globalError }}</pre>
        <button @click="globalError = null; $router.push('/')">Zur Startseite</button>
    </div>
    <div v-else-if="isRestoring" class="loading-overlay">
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

.global-error {
    padding: 2rem;
    background: white;
    color: #c0392b;
    border: 1px solid #c0392b;
    margin: 2rem;
    border-radius: 8px;
}
</style>
