import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { assignmentService } from '@/services/api/assignment';
import { signalRService } from '@/services/signalr';
import { AssignmentStatus, type WorkStep } from '@/types/domain';
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
      const completed = steps.filter(s => s.status === AssignmentStatus.Completed).length;
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
          workSteps.value.push(updated);
        }
      }
    } catch (e) {
      console.error('Failed to refresh work step via SignalR', e);
    }
  }

  async function ensureWorkflowHasInProgress(workflowGuid: string | null | undefined) {
    if (!workflowGuid) return;

    const steps = workSteps.value
      .filter(s => s.parentObjectiveGuid === workflowGuid)
      .slice()
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    if (steps.some(s => s.status === AssignmentStatus.InProgress)) return;

    const nextPlanned = steps.find(s => s.status === AssignmentStatus.Planned);
    if (!nextPlanned) return;

    await assignmentService.setStatus(nextPlanned.guid, AssignmentStatus.InProgress);
    await loadAllWorkSteps();
  }

  async function createWorkStep(workStep: Partial<WorkStep> & { parentObjectiveGuid: string }) {
    loading.value = true;
    try {
      const createdGuid = await assignmentService.create(workStep);
      await loadAllWorkSteps();
      // Requirement: first task of a workflow must be InProgress (if none is currently InProgress)
      await ensureWorkflowHasInProgress(workStep.parentObjectiveGuid);
      return createdGuid;
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
      const toDelete = workSteps.value.find(s => s.guid === guid) || null;
      await assignmentService.delete(guid);
      await loadAllWorkSteps();

      // Requirement: if the current InProgress task is deleted, the next task should become InProgress
      if (toDelete?.status === AssignmentStatus.InProgress) {
        await ensureWorkflowHasInProgress(toDelete.parentObjectiveGuid);
      }
    } catch (e) {
      console.error(e);
      error.value = 'Failed to delete work step';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function updatePriority(guid: string, priority: number) {
    try {
      await assignmentService.setPriority(guid, priority);
      const step = workSteps.value.find(s => s.guid === guid);
      if (step) step.priority = priority;
    } catch (e) {
      console.error(e);
      error.value = 'Failed to update priority';
      await loadAllWorkSteps();
    }
  }

  async function updateStatus(guid: string, status: number) {
    try {
      await assignmentService.setStatus(guid, status);
      const step = workSteps.value.find(s => s.guid === guid);
      if (step) step.status = status as AssignmentStatus;

      // Backend promotes the next task when one is completed.
      if (status === AssignmentStatus.Completed) {
        await loadAllWorkSteps();
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
    updateStatus,
  };
});
