import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { objectiveService, type Objective } from '@/services/api/objective';
import { useUserStore } from '@/stores/user';

export const useWorkflowStore = defineStore('workflow', () => {
  const workflows = ref<Objective[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const userStore = useUserStore();

  async function loadWorkflows() {
    loading.value = true;
    try {
      const tenantId = userStore.currentTenant?.guid;
      workflows.value = await objectiveService.getAll(tenantId);
    } catch (e) {
      console.error(e);
      error.value = 'Failed to load workflows';
    } finally {
      loading.value = false;
    }
  }

  async function createWorkflow(title: string, deadline: string, description?: string) {
    loading.value = true;
    try {
      const tenantId = userStore.currentTenant?.guid;
      await objectiveService.create(title, deadline, description, tenantId);
      await loadWorkflows(); // Refresh list
    } catch (e) {
      console.error(e);
      error.value = 'Failed to create workflow';
      throw e;

    } finally {
      loading.value = false;
    }
  }

  async function deleteWorkflow(guid: string) {
    loading.value = true;
    try {
      await objectiveService.delete(guid);
      await loadWorkflows(); // Refresh
    } catch (e) {
      console.error(e);
      error.value = 'Failed to delete workflow';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return {
    workflows,
    loading,
    error,
    loadWorkflows,
    createWorkflow,
    deleteWorkflow
  };
});
