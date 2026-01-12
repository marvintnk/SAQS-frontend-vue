<template>
  <div class="actor-dashboard">
    <header class="dashboard-header">
      <h1>Meine Aufgaben</h1>
      <div class="controls">
         <div class="view-toggle">
            <button :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">Liste</button>
            <button :class="{ active: viewMode === 'tiles' }" @click="viewMode = 'tiles'">Kacheln</button>
         </div>
         <div class="user-info">
            {{ userStore.currentUser?.displayName }} ({{ userStore.currentUser?.role?.displayName || 'Keine Rolle' }})
            <button @click="logout" class="btn-logout">Logout</button>
         </div>
      </div>
    </header>

    <main class="dashboard-content">
       <div v-if="loading" class="loading">Lade Aufgaben...</div>
       
       <div v-else-if="myTasks.length === 0" class="empty-state">
           <p>Keine offenen Aufgaben gefunden. Zeit für einen Kaffee! ☕</p>
       </div>

       <!-- List View -->
       <div v-else-if="viewMode === 'list'" class="task-list">
          <div v-for="task in myTasks" :key="task.guid" class="task-item-list" :class="getPriorityClass(task.priority)">
             <div class="task-main">
                <div class="task-status-indicator" :class="getPriorityClass(task.priority)"></div>
                <div class="task-info">
                    <h3>{{ task.displayName }}</h3>
                    <span class="workflow-badge">{{ getWorkflowName(task.parentObjectiveGuid) }}</span>
                </div>
             </div>
             <div class="task-meta">
                <span>Dauer: {{ task.duration }} min</span>
                <span>Deadline: {{ getDeadline(task.parentObjectiveGuid) }}</span>
             </div>
             <button class="btn-check" @click="completeTask(task.guid)" title="Als erledigt markieren">✔</button>
          </div>
       </div>

       <!-- Tiles View -->
       <div v-else class="task-tiles">
          <div v-for="task in myTasks" :key="task.guid" class="task-card" :class="getPriorityClass(task.priority)">
             <div class="card-header">
                <span class="priority-label">{{ getPriorityLabel(task.priority) }}</span>
                <span class="workflow-name">{{ getWorkflowName(task.parentObjectiveGuid) }}</span>
             </div>
             <h3>{{ task.displayName }}</h3>
             <p class="description">{{ task.description || 'Keine Beschreibung' }}</p>
             <div class="card-footer">
                <span>⏱ {{ task.duration }} min</span>
                <button class="btn-done" @click="completeTask(task.guid)">Erledigt</button>
             </div>
          </div>
       </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { useWorkStepStore } from '@/stores/workStep';
import { useWorkflowStore } from '@/stores/workflow';
import { useRouter } from 'vue-router';
import { AssignmentStatus, Priority } from '@/types/domain';

const userStore = useUserStore();
const workStepStore = useWorkStepStore();
const workflowStore = useWorkflowStore();
const router = useRouter();

const viewMode = ref<'list' | 'tiles'>('tiles');
const loading = ref(false);

const myTasks = computed(() => {
    const user = userStore.currentUser;
    if (!user) return [];

    const myRoleGuid = user.role?.guid;
    const myUserGuid = user.guid;

    return workStepStore.workSteps.filter(t => {
        // Erledigte Aufgaben ausblenden
        if (t.status === AssignmentStatus.Completed) return false;

        // Direkt mir zugewiesen
        if (t.assigneeGuid === myUserGuid) return true;

        // Nicht zugewiesen, aber für meine Rolle relevant (Pool-Aufgaben)
        if (!t.assigneeGuid && t.requiredRoleGuid === myRoleGuid) return true;

        return false;
    }).sort((a,b) => b.priority - a.priority); 
});

onMounted(async () => {
    if (!userStore.currentUser) {
        router.push('/');
        return;
    }
    loading.value = true;
    await Promise.all([
        workflowStore.loadWorkflows(),
        workStepStore.loadAllWorkSteps()
    ]);
    loading.value = false;
});

const getWorkflowName = (guid: string | null) => {
    if (!guid) return 'Unbekannt';
    const wf = workflowStore.workflows.find(w => w.guid === guid);
    return wf ? wf.displayName : 'Loading...';
};

const getDeadline = (guid: string | null) => {
    if (!guid) return '-';
    const wf = workflowStore.workflows.find(w => w.guid === guid);
    return wf ? new Date(wf.deadlineDate).toLocaleDateString() : '-';
};

const getPriorityClass = (p: Priority) => {
    switch(p) {
        case Priority.ShortTerm: return 'prio-short'; // 0
        case Priority.MidTerm: return 'prio-mid';     // 1
        case Priority.LongTerm: return 'prio-long';   // 2
        default: return '';
    }
};

const getPriorityLabel = (p: Priority) => {
    switch(p) {
        case Priority.ShortTerm: return 'Kurzfristig';
        case Priority.MidTerm: return 'Mittelfristig';
        case Priority.LongTerm: return 'Langfristig';
        default: return '';
    }
};

const completeTask = async (guid: string) => {
    await workStepStore.updateStatus(guid, AssignmentStatus.Completed);
};

const logout = () => {
    userStore.logout();
    router.push('/');
};
</script>

<style scoped>
.actor-dashboard {
    max-width: 1000px;
    margin: 0 auto;
    padding: 1rem;
}

.dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap; 
    gap: 1rem;
}

.controls {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
    width: 100%;
}

@media (min-width: 768px) {
    .controls {
        width: auto;
        gap: 2rem;
        justify-content: flex-end;
    }
}

.view-toggle {
    display: flex;
    background: #e0e0e0;
    border-radius: 4px;
    padding: 2px;
}

.view-toggle button {
    border: none;
    background: transparent;
    padding: 0.5rem 1rem;
    cursor: pointer;
    border-radius: 2px;
}

.view-toggle button.active {
    background: white;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    font-weight: bold;
}

/* Priority Styles */
.prio-short { border-left: 5px solid #e74c3c; } /* Red */
.task-card.prio-short .priority-label { color: #e74c3c; background: #fadbd8; }

.prio-mid { border-left: 5px solid #f39c12; } /* Orange */
.task-card.prio-mid .priority-label { color: #d35400; background: #fdebd0; }

.prio-long { border-left: 5px solid #27ae60; } /* Green */
.task-card.prio-long .priority-label { color: #27ae60; background: #d5f5e3; }

/* List View */
.task-list {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
}

.task-item-list {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: white;
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    flex-wrap: wrap; 
    gap: 1rem;
}

.task-main {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 2;
    min-width: 250px;
}

.task-info h3 {
    margin: 0;
    font-size: 1.1rem;
}

.workflow-badge {
    font-size: 0.8rem;
    color: #7f8c8d;
    background: #f0f3f4;
    padding: 2px 6px;
    border-radius: 4px;
}

.task-meta {
    flex: 1;
    display: flex;
    flex-direction: column;
    font-size: 0.9rem;
    color: #666;
}

.btn-check {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid #42b983;
    background: transparent;
    color: #42b983;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-check:hover {
    background: #42b983;
    color: white;
}

/* Tile View */
.task-tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
}

.task-card {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 200px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.8em;
    margin-bottom: 0.5rem;
}

.priority-label {
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: bold;
}

.card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
    border-top: 1px solid #eee;
    padding-top: 1rem;
}

.btn-done {
    background: #42b983;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
}
</style>
