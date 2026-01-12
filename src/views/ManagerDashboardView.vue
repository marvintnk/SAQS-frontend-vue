<template>
  <div class="manager-dashboard">
    <header class="dashboard-header">
      <h1>Workflow Manager Dashboard</h1>
      <div class="user-info">
        Eingeloggt als: {{ userStore?.currentUser?.displayName }}
        <button @click="logout" class="btn-logout">Logout</button>
      </div>
    </header>

    <div class="tabs">
      <button :class="{ active: currentTab === 'workflows' }" @click="currentTab = 'workflows'">Workflows & Aufgaben</button>
      <button :class="{ active: currentTab === 'actors' }" @click="currentTab = 'actors'">Akteure & Aufgabenverteilung</button>
      <button :class="{ active: currentTab === 'roles' }" @click="currentTab = 'roles'">Rollen & Berechtigungen</button>
    </div>

    <main class="dashboard-content">
      <!-- Workflows Tab -->
      <section v-if="currentTab === 'workflows'">
        <div v-if="!selectedWorkflow">
            <div class="section-actions">
            <h2>Aktive Workflows</h2>
            <button @click="showCreateWorkflow = true" class="btn-action">+ Neuer Workflow</button>
            </div>
            
            <div v-if="workflowStore.loading" class="loading">Lade Workflows...</div>
            <div v-else class="workflow-list">
            <div v-for="wf in workflowStore.workflows" :key="wf.guid" class="workflow-card">
                <h3>{{ wf.displayName }}</h3>
                <p>{{ wf.description }}</p>
              <p><strong>Deadline:</strong> {{ formatDeadline(wf.deadlineDate) }}</p>
                
                <div class="stats-container">
                    <div class="stat-item">
                        <span class="stat-label">Aufgaben</span>
                        <span class="stat-value">{{ workStepStore.getWorkflowStats(wf.guid).completed }} / {{ workStepStore.getWorkflowStats(wf.guid).total }}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Gesamtdauer</span>
                      <span class="stat-value">{{ workStepStore.getWorkflowStats(wf.guid).duration }} Std</span>
                    </div>
                </div>

                <div class="card-actions">
                    <button class="btn-small" @click="selectWorkflow(wf)"> Aufgaben verwalten </button>
                    <button class="btn-delete" @click="handleDeleteWorkflow(wf.guid)">Löschen</button>
                </div>
            </div>
            <p v-if="workflowStore.workflows.length === 0">Keine Workflows vorhanden.</p>
            </div>
        </div>

        <!-- DETAIL VIEW -->
        <div v-else class="workflow-detail">
            <div class="detail-header">
                <button @click="clearSelection" class="btn-back">← Zurück</button>
                <h2>{{ selectedWorkflow.displayName }} - Aufgaben</h2>
            </div>
            <div class="detail-meta">
                <p>{{ selectedWorkflow.description }}</p>
              <p>Deadline: {{ formatDeadline(selectedWorkflow.deadlineDate) }}</p>
            </div>

            <div class="section-actions">
                <h3>Aufgabenliste</h3>
                <button @click="showCreateAssignment = true" class="btn-action">+ Neue Aufgabe</button>
            </div>

            <div class="assignment-list">
                <table v-if="workflowAssignments.length > 0">
                    <thead>
                        <tr>
                            <th>Nr.</th>
                            <th>Titel</th>
                            <th>Dauer (Std)</th>
                            <th>Priorität</th>
                            <th>Benötigte Rolle</th>
                            <th>Status</th>
                            <th>Aktion</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(task, index) in workflowAssignments" :key="task.guid">
                            <td>{{ index + 1 }}</td>
                            <td>{{ task.displayName }}</td>
                            <td>{{ task.duration }}</td>
                            <td>
                              <template v-if="task.status === 1">
                                <select 
                                  :value="task.priority" 
                                  @change="e => handlePriorityChange(task.guid, +(e.target as HTMLSelectElement).value)"
                                  class="priority-select"
                                >
                                  <option :value="0">Kurzfristig</option>
                                  <option :value="1">Mittelfristig</option>
                                  <option :value="2">Langfristig</option>
                                </select>
                              </template>
                              <template v-else>
                                <span class="priority-hint">Prio erst bei Bearbeitung.</span>
                              </template>
                            </td>
                            <td>{{ roles.find(r => r.guid === task.requiredRoleGuid)?.displayName || '-' }}</td>
                            <td>{{ task.status === 0 ? 'Geplant' : (task.status === 1 ? 'In Bearbeitung' : 'Erledigt') }}</td>
                            <td>
                                <button class="btn-delete" @click="handleDeleteAssignment(task.guid)">Löschen</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <p v-else>Keine Aufgaben definiert.</p>
            </div>
        </div>

        <!-- Create Workflow Modal -->
        <div v-if="showCreateWorkflow" class="modal-overlay">
          <div class="modal">
            <h3>Neuer Workflow</h3>
            <form @submit.prevent="handleCreateWorkflow">
              <label>Name: <input v-model="newWorkflow.title" required /></label>
              <label>Beschreibung: <input v-model="newWorkflow.description" /></label>
              <label>Deadline: <input type="datetime-local" v-model="newWorkflow.deadline" required /></label>
              
              <div class="modal-actions">
                <button type="button" @click="showCreateWorkflow = false">Abbrechen</button>
                <button type="submit">Erstellen</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Create Assignment Modal -->
        <div v-if="showCreateAssignment" class="modal-overlay">
            <div class="modal">
                <h3>Neue Aufgabe für {{ selectedWorkflow?.displayName }}</h3>
                <form @submit.prevent="handleCreateAssignment">
                    <label>Titel: <input v-model="newAssignment.displayName" required /></label>
                    <label>Beschreibung: <input v-model="newAssignment.description" /></label>
                    <label>Dauer (Std): <input type="number" v-model.number="newAssignment.duration" min="0.25" step="0.25" required /></label>
                    
                    <label>Benötigte Rolle:
                        <select v-model="newAssignment.requiredRoleGuid" required>
                            <option value="" disabled>Bitte wählen...</option>
                        <option v-for="r in assignmentCreatableRoles" :key="r.guid" :value="r.guid">{{ r.displayName }}</option>
                        </select>
                    </label>

                    <div class="modal-actions">
                        <button type="button" @click="showCreateAssignment = false">Abbrechen</button>
                        <button type="submit">Speichern</button>
                    </div>
                </form>
            </div>
        </div>
      </section>

      <!-- Actors Tab -->
      <section v-if="currentTab === 'actors'">
        <div class="section-actions">
          <h2>Akteure</h2>
           <button @click="showCreateActor = true" class="btn-action">+ Neuer Akteur</button>
        </div>
        
        <div v-if="userStore.loading" class="loading">Lade Akteure...</div>
        <div v-else class="actor-list">
           <div v-for="user in userStore.users" :key="user.guid" class="actor-card">
             <h3>{{ user.displayName }}</h3>
             <p>Rolle: {{ user.role?.displayName || 'Keine' }}</p>
             <div class="card-actions">
               <button class="btn-small" @click="handleViewActorTasks(user)">Aufgaben einsehen</button>
               <button 
                 class="btn-delete" 
                 @click="handleDeleteActor(user.guid)"
                 :disabled="user.guid === userStore?.currentUser?.guid">
                 Löschen
               </button>
             </div>
           </div>
           <p v-if="userStore.users.length === 0">Keine Akteure vorhanden.</p>
        </div>

         <!-- Create Actor Modal -->
         <div v-if="showCreateActor" class="modal-overlay">
          <div class="modal">
            <h3>Neuer Akteur</h3>
            <form @submit.prevent="handleCreateActor">
              <label>Name: <input v-model="newActor.name" required /></label>
              
              <label>Rolle: 
                <select v-model="newActor.roleGuid" required>
                  <option value="" disabled>Bitte wählen...</option>
                  <option v-for="role in actorCreatableRoles" :key="role.guid" :value="role.guid">
                    {{ role.displayName }}
                  </option>
                </select>
              </label>

              <div class="modal-actions">
                <button type="button" @click="showCreateActor = false">Abbrechen</button>
                <button type="submit">Erstellen</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Actor Tasks Modal -->
        <div v-if="showActorTasks && selectedActor" class="modal-overlay">
            <div class="modal modal-large">
                <div class="modal-header">
                    <h3>Aufgaben für {{ selectedActor.displayName }}</h3>
                    <button @click="showActorTasks = false" class="btn-close">X</button>
                </div>
                <p class="role-hint">Basierend auf Rolle: {{ selectedActor.role?.displayName || 'Keine' }}</p>

                <div class="assignment-list">
                    <table v-if="actorAssignments.length > 0">
                        <thead>
                            <tr>
                                <th>Workflow</th>
                                <th>Aufgabe</th>
                                <th>Dauer</th>
                                <th>Priorität</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="task in actorAssignments" :key="task.guid">
                                <td>{{ workflowStore.workflows.find(w => w.guid === task.parentObjectiveGuid)?.displayName || 'Unbekannt' }}</td>
                                <td>{{ task.displayName }}</td>
                                <td>{{ task.duration }} Std</td>
                                <td>
                                  <template v-if="task.status === 1">
                                    <select 
                                      :value="task.priority" 
                                      @change="e => handlePriorityChange(task.guid, +(e.target as HTMLSelectElement).value)"
                                      class="priority-select"
                                    >
                                      <option :value="0">Kurzfristig</option>
                                      <option :value="1">Mittelfristig</option>
                                      <option :value="2">Langfristig</option>
                                    </select>
                                  </template>
                                  <template v-else>
                                    <span class="priority-hint">Prio erst bei Bearbeitung.</span>
                                  </template>
                                </td>
                                <td>{{ task.status === 0 ? 'Geplant' : (task.status === 1 ? 'In Bearbeitung' : 'Erledigt') }}</td>
                            </tr>
                        </tbody>
                    </table>
                    <p v-else>Keine Aufgaben für diese Rolle gefunden.</p>
                </div>
            </div>
        </div>
      </section>

      <!-- Roles Tab -->
      <section v-if="currentTab === 'roles'">
        <div class="section-actions">
           <h2>Rollen</h2>
            <button @click="showCreateRole = true" class="btn-action">+ Neue Rolle</button>
        </div>
         
         <div v-if="loadingRoles" class="loading">Lade Rollen...</div>
         <div v-else class="role-list">
            <div v-for="role in roles" :key="role.guid" class="role-card">
              <h3>{{ role.displayName }}</h3>
              <p>{{ role.description }}</p>
              <span v-if="role.isAdmin" class="badge-admin">Admin</span>
              <div class="card-actions">
                 <button 
                   class="btn-delete" 
                   @click="handleDeleteRole(role.guid)"
                   :disabled="role.displayName === 'Manager'">
                   Löschen
                 </button>
              </div>
            </div>
         </div>

         <!-- Create Role Modal -->
         <div v-if="showCreateRole" class="modal-overlay">
          <div class="modal">
            <h3>Neue Rolle</h3>
            <form @submit.prevent="handleCreateRole">
              <label>Name: <input v-model="newRole.name" required /></label>
              <label>Beschreibung: <input v-model="newRole.description" /></label>
              
              <div class="modal-actions">
                <button type="button" @click="showCreateRole = false">Abbrechen</button>
                <button type="submit">Erstellen</button>
              </div>
            </form>
          </div>
        </div>
      </section>

    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useUserStore } from '@/stores/user';
import { useWorkflowStore } from '@/stores/workflow';
import { useWorkStepStore } from '@/stores/workStep';
import { useRouter } from 'vue-router';
import { roleService } from '@/services/api/role';
import { actorService } from '@/services/api/actor';
import { type Role, type Workflow, type WorkStep, AssignmentStatus, Priority, type User } from '@/types/domain';

const userStore = useUserStore();
const workflowStore = useWorkflowStore();
const workStepStore = useWorkStepStore();
const router = useRouter();

const currentTab = ref('workflows');
const showCreateWorkflow = ref(false);
const showCreateAssignment = ref(false);
const showCreateActor = ref(false);
const showCreateRole = ref(false);
const showActorTasks = ref(false);
const selectedWorkflow = ref<Workflow | null>(null);
const selectedActor = ref<User | null>(null);

// Local state for Roles
const roles = ref<Role[]>([]);
const loadingRoles = ref(false);
const workflowAssignments = computed(() => {
    if (!selectedWorkflow.value) return [];
    // Clone array before sorting to avoid side effects on store state if it returns a reactive array
    const steps = [...workStepStore.getWorkStepsByWorkflow(selectedWorkflow.value.guid)];
    // Sort by sequenceNumber ascending (backend might assign gaps, but frontend needs sequential display order)
    return steps.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
});

const actorAssignments = computed(() => {
    if (!selectedActor.value || !selectedActor.value.role) return [];
    const roleGuid = selectedActor.value.role.guid;
    // Show tasks matching the actor's role
    return workStepStore.workSteps.filter(ws => ws.requiredRoleGuid === roleGuid);
});

const isManagerRole = (r: Role) => (r.isAdmin || r.displayName?.trim().toLowerCase() === 'manager');
const actorCreatableRoles = computed(() => roles.value.filter(r => !isManagerRole(r)));
const assignmentCreatableRoles = computed(() => roles.value.filter(r => !isManagerRole(r)));

const formatDeadline = (deadlineDate: string | null | undefined) => {
  if (!deadlineDate) return '-';
  const d = new Date(deadlineDate);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.toLocaleDateString('de-DE')} ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
};

// Forms
const newWorkflow = ref({ title: '', description: '', deadline: '' });
const newAssignment = ref({ 
  displayName: '', 
  description: '', 
  duration: 0, 
  requiredRoleGuid: ''
});
const newActor = ref({ name: '', roleGuid: '' });
const newRole = ref({ name: '', description: '', isAdmin: false });

onMounted(async () => {
  if (!userStore?.currentUser) {
    router.push('/');
    return;
  }

  const tenantId = userStore.currentTenant?.guid;
  await Promise.all([
    workflowStore.loadWorkflows(),
    workStepStore.loadAllWorkSteps(),
    userStore.loadUsers(tenantId),
    loadRoles(),
  ]);
});

const loadRoles = async () => {
  loadingRoles.value = true;
  try {
    // Fetch ALL roles first
    const allRoles = await roleService.getAll(); 
    
    // Filter logic:
    // Show role IF:
    // 1. It has NO tenantId (Global role)
    // 2. OR its tenantId matches the current user's TenantId (Specific role)
    const currentTenantId = userStore.currentTenant?.guid;
    
    roles.value = allRoles.filter(r => {
        // Strict check undefined/null/empty vs string comparison
        const isGlobal = !r.tenantId; 
        const isMine = r.tenantId === currentTenantId;
        return isGlobal || isMine;
    });
  } finally {
    loadingRoles.value = false;
  }
};

const logout = () => {
  userStore.logout();
  router.push('/');
};

const selectWorkflow = (wf: Workflow) => {
    selectedWorkflow.value = wf;
};

const clearSelection = () => {
    selectedWorkflow.value = null;
};

const handleCreateAssignment = async () => {
    if (!selectedWorkflow.value) return;
    
    // Validation
    if (newAssignment.value.duration <= 0) {
        alert('Dauer muss größer als 0 sein.');
        return;
    }
    if (!newAssignment.value.requiredRoleGuid) {
        alert('Eine Rolle muss zugewiesen werden.');
        return;
    }

    const selectedRole = roles.value.find(r => r.guid === newAssignment.value.requiredRoleGuid);
    if (selectedRole && isManagerRole(selectedRole)) {
      alert('Die Rolle "Manager" kann nicht für Aufgaben ausgewählt werden.');
      return;
    }

    await workStepStore.createWorkStep({
        displayName: newAssignment.value.displayName,
        description: newAssignment.value.description,
        duration: newAssignment.value.duration,
        sequenceNumber: 0, // Backend logic
        priority: Priority.MidTerm, // Backend logic
        status: AssignmentStatus.Planned,
        requiredRoleGuid: newAssignment.value.requiredRoleGuid,
        parentObjectiveGuid: selectedWorkflow.value.guid
    });
    
    showCreateAssignment.value = false;
    // Reset form
    newAssignment.value = { 
      displayName: '', 
      description: '', 
      duration: 0,
      requiredRoleGuid: ''
    };
};

const handleDeleteAssignment = async (guid: string) => {
    if(!confirm('Aufgabe wirklich löschen?')) return;
    await workStepStore.deleteWorkStep(guid);
};

const handlePriorityChange = async (guid: string, newPriority: number) => {
    // No confirm needed for quick action, or simple toast?
    await workStepStore.updatePriority(guid, newPriority);
};

const getPriorityLabel = (p: Priority) => {
    switch(p) {
        case Priority.ShortTerm: return 'Kurzfristig';
        case Priority.MidTerm: return 'Mittelfristig';
        case Priority.LongTerm: return 'Langfristig';
        default: return 'Unbekannt';
    }
};

const handleCreateWorkflow = async () => {
  await workflowStore.createWorkflow(newWorkflow.value.title, newWorkflow.value.deadline, newWorkflow.value.description);
  showCreateWorkflow.value = false;
  newWorkflow.value = { title: '', description: '', deadline: '' };
};

const handleCreateActor = async () => {
    if (!newActor.value.roleGuid) {
        alert('Bitte eine Rolle auswählen.');
        return;
    }

  const selectedRole = roles.value.find(r => r.guid === newActor.value.roleGuid);
  if (selectedRole && isManagerRole(selectedRole)) {
    alert('Die Rolle "Manager" kann nur der Tenant-Manager haben.');
    return;
  }
    const tenantId = userStore.currentTenant?.guid;
    await actorService.create(newActor.value.name, newActor.value.roleGuid, tenantId);
    await userStore.loadUsers(tenantId); // Refresh
    showCreateActor.value = false;
    newActor.value = { name: '', roleGuid: '' };
};

const handleCreateRole = async () => {
    // Admin creation is disabled here, use Start Page Tenant creation for managers
    const tenantId = userStore.currentTenant?.guid;
    await roleService.create(newRole.value.name, false, newRole.value.description, tenantId);
    await loadRoles();
    showCreateRole.value = false;
    newRole.value = { name: '', description: '', isAdmin: false };
};

const handleDeleteWorkflow = async (guid: string) => {
  if (!confirm('Wirklich löschen?')) return;
  await workflowStore.deleteWorkflow(guid);
};

const handleDeleteActor = async (guid: string) => {
  if (!confirm('Wirklich löschen?')) return;
  await actorService.delete(guid);
  await userStore.loadUsers();
};

const handleDeleteRole = async (guid: string) => {
  if (!confirm('Wirklich löschen?')) return;
  await roleService.delete(guid);
  await loadRoles();
};

const handleViewActorTasks = (user: User) => {
    selectedActor.value = user;
    showActorTasks.value = true;
};
</script>

<style scoped>
.manager-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  border-bottom: 2px solid #eee;
  padding-bottom: 1rem;
  flex-wrap: wrap; /* Added wrap */
  gap: 1rem;
}

.user-info {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap; /* Added wrap */
}

.tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  overflow-x: auto; /* Scrollable tabs on mobile */
  padding-bottom: 0.5rem; /* Space for scrollbar */
  white-space: nowrap; /* Keep buttons inline */
}

.tabs button {
  padding: 0.8rem 1.5rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  flex-shrink: 0; /* Don't shrink buttons */
}

.tabs button.active {
  background: #42b983;
  color: white;
  border-color: #42b983;
}

.priority-hint {
  display: inline-block;
  font-size: 0.85rem;
  color: #666;
  white-space: normal;
  max-width: 140px;
  line-height: 1.2;
}

.section-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.btn-action {
  background: #2c3e50;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 4px;
  cursor: pointer;
}

.workflow-list, .actor-list, .role-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.workflow-card, .actor-card, .role-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  border: 1px solid #eee;
}

.card-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
  gap: 0.5rem;
}

.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 400px; /* Instead of min-width */
}

.modal-large {
    width: 95%;
    max-width: 800px; /* Use max-width */
    height: auto;
    max-height: 90vh;
    overflow-y: auto;
}

.modal form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.badge-admin {
  background: gold;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

label {
    display: flex;
    flex-direction: column;
    font-weight: bold;
    margin-bottom: 0.5rem;
}

input[type="text"], input[type="date"], input[type="datetime-local"], select {
    padding: 0.5rem;
    margin-top: 0.3rem;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.btn-small {
  background: #3498db;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-delete {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-delete:disabled {
  background: #e6b0aa;
  cursor: not-allowed;
}

.workflow-detail {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.detail-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid #eee;
    padding-bottom: 1rem;
}

.btn-back {
    background: #95a5a6;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
}

.detail-meta {
    margin-bottom: 2rem;
    color: #666;
}

.stats-container {
    display: flex;
    gap: 1.5rem;
    margin: 1rem 0;
    padding: 0.5rem;
    background: #f8f9fa;
    border-radius: 4px;
}

.stat-item {
    display: flex;
    flex-direction: column;
}

.stat-label {
    font-size: 0.8rem;
    color: #7f8c8d;
    text-transform: uppercase;
    font-weight: bold;
}

.stat-value {
    font-size: 1.1rem;
    font-weight: bold;
    color: #2c3e50;
}

.assignment-list {
    overflow-x: auto; /* Scrollable table container */
}

.assignment-list table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
    min-width: 600px; /* Force table to have minimum width */
}

.assignment-list th, .assignment-list td {
    border: 1px solid #eee;
    padding: 0.8rem;
    text-align: left;
}

.assignment-list th {
    background: #f9f9f9;
    font-weight: bold;
}

.priority-select {
    padding: 0.3rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    width: 100%;
}

.form-row {
    display: flex;
    gap: 1rem;
}

.form-row label {
    flex: 1;
}

.modal-large {
  max-width: 800px;
  width: 90%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}

.role-hint {
  color: #666;
  margin-bottom: 1rem;
  font-style: italic;
}
</style>
