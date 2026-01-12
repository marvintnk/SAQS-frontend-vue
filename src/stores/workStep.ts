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

  // SignalR Initialization
  function initSignalR() {
      signalRService.start();
      signalRService.onAssignmentUpdated(async (guid) => {
          await refreshWorkStep(guid);
      });
  }
  
  // Wir starten SignalR direkt beim Laden des Stores (Singleton), damit wir keine
  // Echtzeit-Updates verpassen, sobald die App "richtig" läuft.
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
      // Kein globales Lade-Icon triggern ("Silent Update"), damit die UI bei kleinen
      // Updates im Hintergrund ruhig bleibt und nicht flackert.
      try {
          const updated = await assignmentService.getById(guid);
          if (updated) {
              const index = workSteps.value.findIndex(s => s.guid === guid);
              if (index !== -1) {
                  workSteps.value[index] = updated;
              } else {
                  // Neues Assignment live reingekommen
                  workSteps.value.push(updated);
              }
          } else {
             // Edge Case: Backend liefert null (z.B. gelöscht oder Fehler).
             // Wir machen hier nichts, um den lokalen State nicht voreilig kaputt zu machen.
             // Ein sauberer Sync beim nächsten Page-Reload regelt das.
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
  async function updatePriority(guid: string, priority: number) {
    // Hier könnten wir "optimistisch" das UI updaten, bevor der Request durch ist.
    // Sicherer ist im MVP aber: Request -> abwarten -> State Update bei Erfolg.
    try {
      await assignmentService.setPriority(guid, priority);
      // Lokales Update reicht, müssen nicht alles neu laden
      const step = workSteps.value.find(s => s.guid === guid);
      if (step) {
        step.priority = priority;
      }
    } catch (e) {
      console.error(e);
      error.value = 'Failed to update priority';
      // Bei Fehler State lieber einmal sauber neu ziehen
      await loadAllWorkSteps();
    }
  }   }
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
