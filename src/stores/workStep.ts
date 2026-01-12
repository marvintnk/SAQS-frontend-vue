import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { assignmentService } from '@/services/api/assignment';
import { signalRService } from '@/services/signalr';
import type { WorkStep } from '@/types/domain';
import { useUserStore } from '@/stores/user';

export const useWorkStepStore = defineStore('workStep', () => {
  const workSteps = ref<WorkStep[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const userStore = useUserStore();

  // SignalR Integeration
  function initSignalR() {
      signalRService.start();
      signalRService.onAssignmentUpdated(async (guid) => {
          await refreshWorkStep(guid);
      });
  }
  
  // Call init immediately? Or better let the component call it? 
  // Stores are lazy, but once used, we want it running.
  // We'll call it inside loadAllWorkSteps if not connected, or just call it here.
  // Ideally, start it once.
  initSignalR();

  // Getters
  const getWorkStepsByWorkflow = computed(() => {
    return (workflowGuid: string) => workSteps.value.filter(ws => ws.parentObjectiveGuid === workflowGuid);
  });

  const getWorkflowStats = computed(() => {
    return (workflowGuid: string) => {
        const steps = getWorkStepsByWorkflow.value(workflowGuid);
        const total = steps.length;
        const completed = steps.filter(s => s.status === 2).length; // 2 = Completed
        const duration = steps.reduce((acc, curr) => acc + curr.duration, 0);
        return { total, completed, duration };
    };
  });

  // Actions
  async function loadAllWorkSteps() {
    loading.value = true;
    try {
      const tenantId = userStore.currentTenant?.guid;
      workSteps.value = await assignmentService.getAll(tenantId);
    } catch (e) {
      console.error(e);
      error.value = 'Failed to load work steps';
    } finally {
      loading.value = false;
    }
  }

  async function refreshWorkStep(guid: string) {
      // Don't set global loading default to avoid flicker, maybe just silent update
      try {
          const updated = await assignmentService.getById(guid);
          if (updated) {
              const index = workSteps.value.findIndex(s => s.guid === guid);
              if (index !== -1) {
                  workSteps.value[index] = updated;
              } else {
                  // New assignment? Add it.
                  workSteps.value.push(updated);
              }
          } else {
             // If null is returned, maybe it was deleted?
             // But getById returns null on error too.
             // If deleted, we should remove it.
             // But getById returning null is ambiguous in my implementation (could be error).
             // However, for now, if we can't fetch it, we ignore assignment update or we could reload all.
             // Let's reload all if we suspect deletion or sync issue
             const index = workSteps.value.findIndex(s => s.guid === guid);
             if (index !== -1) {
                 // It existed, but now we can't fetch it. Maybe deleted?
                 // Let's remove it to be safe or do nothing.
                 // Safer: do nothing on error. 
             }
          }
      } catch (e) {
          console.error('Failed to refresh work step via SignalR', e);
      }
  }

  async function createWorkStep(workStep: Partial<WorkStep> & { parentObjectiveGuid: string }) {
    loading.value = true;
    try {
      await assignmentService.create(workStep);
      await loadAllWorkSteps(); // Refresh
    } catch (e) {
      console.error(e);
      error.value = 'Failed to create work step';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function deleteWorkStep(guid: string) {
    loading.value = true;
    try {
      await assignmentService.delete(guid);
      await loadAllWorkSteps(); // Refresh
    } catch (e) {
      console.error(e);
      error.value = 'Failed to delete work step';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function updatePriority(guid: string, priority: number) {
    // Optimistic update could be done here, but safe route is reload
    try {
      await assignmentService.setPriority(guid, priority);
      // We could reload all, or just update local state if we trust the backend op succeeded
      const step = workSteps.value.find(s => s.guid === guid);
      if (step) {
        step.priority = priority;
      }
    } catch (e) {
      console.error(e);
      error.value = 'Failed to update priority';
      // Revert or reload
      await loadAllWorkSteps();
    }
  }

  async function updateStatus(guid: string, status: number) {
    try {
      await assignmentService.setStatus(guid, status);
      const step = workSteps.value.find(s => s.guid === guid);
      if (step) {
        step.status = status;
      }
    } catch (e) {
      console.error(e);
      error.value = 'Failed to update status';
      await loadAllWorkSteps();
    }
  }

  return {
    workSteps,
    loading,
    error,
    getWorkStepsByWorkflow,
    getWorkflowStats,
    loadAllWorkSteps,
    createWorkStep,
    deleteWorkStep,
    updatePriority,
    updateStatus
  };
});
