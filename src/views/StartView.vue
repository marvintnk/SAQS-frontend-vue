<template>
  <div class="start-page">
    <header class="header">
      <h1>Kolla Aufgabenmanager</h1>
      <p class="subtitle">Kollaboratives Workflow-Management</p>
    </header>

    <main class="content">
      <section class="info-section">
        <h2>Willkommen</h2>
        <p>
          Kolla hilft Teams dabei, komplexe Aufgaben in strukturierte Arbeitsschritte zu unterteilen 
          und effizient abzuarbeiten. Wählen Sie einen Arbeitsbereich (Tenant) und Ihre Identität, um zu beginnen.
        </p>
      </section>

      <section class="login-section" v-if="!userStore.loading && !userStore.error">
        <form @submit.prevent="handleEnter" class="login-form">
          <div class="form-group">
            <div class="label-row">
                <label for="tenant-select">Arbeitsbereich (Tenant)</label>
                <button type="button" class="btn-link" @click="showCreateTenant = true">+ Neuen Tenant anlegen</button>
            </div>
            <select id="tenant-select" v-model="selectedTenantGuid" required>
              <option value="" disabled>Bitte wählen...</option>
              <option v-for="manager in userStore.managers" :key="manager.guid" :value="manager.guid">
                {{ manager.displayName }}
              </option>
            </select>
            <div class="tenant-actions-row" v-if="selectedTenantGuid">
                <button type="button" class="btn-link-danger" @click="handleDeleteTenant">Löschen</button>
            </div>
            <small v-if="userStore.managers.length === 0" class="warning">
              Keine Manager gefunden. Bitte Backend prüfen oder Daten anlegen.
            </small>
          </div>

          <div class="form-group">
            <label for="user-select">Benutzer (Login als)</label>
            <select id="user-select" v-model="selectedUserGuid" required :disabled="!selectedTenantGuid">
              <option value="" disabled>Bitte wählen...</option>
              <option v-for="user in filteredUsers" :key="user.guid" :value="user.guid">
                {{ user.displayName }} <span v-if="user.role">({{ user.role.displayName }})</span>
              </option>
            </select>
          </div>

          <button type="submit" class="btn-primary" :disabled="!isFormValid">
            Starten
          </button>
        </form>
      </section>

      <div v-else-if="userStore.loading" class="loading">
        Lade Benutzerdaten...
      </div>

      <div v-else-if="userStore.error" class="error">
        {{ userStore.error }}
        <button @click="userStore.loadUsers()" class="btn-retry">Erneut versuchen</button>
      </div>

       <!-- Create Tenant Modal -->
      <div v-if="showCreateTenant" class="modal-overlay">
        <div class="modal">
          <h3>Neuen Tenant (Manager) anlegen</h3>
          <p class="modal-info">Dies erstellt einen neuen Benutzer mit der Rolle "Manager".</p>
          <form @submit.prevent="handleCreateTenant">
            <label>Name des Managers: <input v-model="newManagerName" required placeholder="z.B. Alice Chef" /></label>
            
            <div class="modal-actions">
              <button type="button" @click="showCreateTenant = false">Abbrechen</button>
              <button type="submit" class="btn-submit">Anlegen</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';
import { roleService } from '@/services/api/role';
import { actorService } from '@/services/api/actor';

const userStore = useUserStore();
const router = useRouter();

const selectedTenantGuid = ref('');
const selectedUserGuid = ref('');
const showCreateTenant = ref(false);
const newManagerName = ref('');

const filteredUsers = computed(() => {
    if (!selectedTenantGuid.value) return [];
    return userStore.users.filter(u => 
        u.tenantId === selectedTenantGuid.value || 
        u.guid === selectedTenantGuid.value // Include the manager/tenant themselves
    );
});

// User-Auswahl zurücksetzen, wenn der Mandant gewechselt wird.
watch(selectedTenantGuid, () => {
    selectedUserGuid.value = '';
});

const isFormValid = computed(() => {
  return selectedTenantGuid.value !== '' && selectedUserGuid.value !== '';
});

onMounted(async () => {
  // Alle User laden, um daraus die "Manager" (unsere Pseudo-Tenants) zu filtern.
  await userStore.loadUsers();
  
  // Fallback: Wenn das Backend leer ist, Demo-Daten erzeugen.
  if (userStore.users.length === 0 || userStore.managers.length === 0) {
    console.log('No users found. Initializing demo data...');
    await userStore.initializeDemoData();
  }
});

const handleEnter = () => {
  const tenant = userStore.users.find(u => u.guid === selectedTenantGuid.value);
  const user = userStore.users.find(u => u.guid === selectedUserGuid.value);

  if (tenant && user) {
    userStore.login(user, tenant);
    
    // Routing basierend auf der Rolle (Manager vs. Worker).
    if (user.role?.displayName?.toLowerCase().includes('manager') || user.role?.isAdmin) {
       router.push('/workflow-manager'); 
    } else {
       router.push('/my-work-steps');
    }
  }
};

const handleCreateTenant = async () => {
    if (!newManagerName.value) return;

    try {
        // Manager Rolle suchen oder neu erstellen
        let roles = await roleService.getAll();
        // Check for Admin true OR name Manager
        let managerRole = roles.find(r => r.isAdmin || r.displayName.toLowerCase() === 'manager');
        
        let roleGuid = managerRole?.guid;

        if (!roleGuid) {
             console.log('Creating new Manager role...');
             roleGuid = await roleService.create('Manager', true, 'System Administrator / Tenant');
        }

        // User anlegen
        const guid = await actorService.create(newManagerName.value, roleGuid);
        
        // TenantId auf sich selbst setzen
        try {
            await actorService.setTenantId(guid, guid);
        } catch (ignore) {
             console.warn('SetTenantId failed (ignoring)', ignore);
        }
        
        // UI aktualisieren
        await userStore.loadUsers();
        showCreateTenant.value = false;
        newManagerName.value = '';
    } catch (e: any) {
        console.error('Create Tenant Error:', e);
        const msg = e.response?.data?.message || e.message || 'Unbekannter Fehler';
        alert(`Fehler beim Erstellen des Tenants: ${msg}`);
    }
};

const handleDeleteTenant = async () => {
    if (!selectedTenantGuid.value) return;
    
    const tenant = userStore.users.find(u => u.guid === selectedTenantGuid.value);
    if (!tenant) return;

    if (!confirm(`Möchten Sie den Arbeitsbereich "${tenant.displayName}" wirklich löschen? Alle zugehörigen Daten könnten verloren gehen.`)) {
        return;
    }

    try {
        await actorService.delete(selectedTenantGuid.value);
        selectedTenantGuid.value = '';
        await userStore.loadUsers();
    } catch (e) {
        console.error('Delete Tenant Error:', e);
        alert('Fehler beim Löschen des Tenants.');
    }
};
</script>

<style scoped>
.start-page {
  width: 90%; /* Responsive width */
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem; /* Less side padding on mobile */
  font-family: sans-serif;
  color: #333;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2rem; /* Smaller font on mobile */
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1rem;
  color: #666;
}

.content {
  background: white;
  padding: 1.5rem; /* Less padding */
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

@media (min-width: 768px) {
    .start-page {
        padding: 2rem;
    }
    .header h1 {
        font-size: 2.5rem;
    }
    .subtitle {
        font-size: 1.2rem;
    }
    .content {
        padding: 2rem;
    }
}


.info-section {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #eee;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-weight: bold;
  color: #2c3e50;
}

select {
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.warning {
  color: orange;
}

.btn-primary {
  background-color: #42b983;
  color: white;
  padding: 1rem;
  border: none;
  border-radius: 4px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 1rem;
}

.btn-primary:hover:not(:disabled) {
  background-color: #3aa876;
}

.btn-primary:disabled {
  background-color: #a8d5c2;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error {
  text-align: center;
  color: #e74c3c;
  padding: 2rem;
}

.btn-retry {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  border: 1px solid #e74c3c;
  background: white;
  color: #e74c3c;
  cursor: pointer;
}

/* Modal & New Styles */
.label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.btn-link {
    background: none;
    border: none;
    color: #42b983;
    cursor: pointer;
    font-size: 0.9rem;
    text-decoration: underline;
    padding: 0;
}

.tenant-actions-row {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.2rem;
}

.btn-link-danger {
    background: none;
    border: none;
    color: #e74c3c;
    cursor: pointer;
    font-size: 0.85rem;
    text-decoration: underline;
    padding: 0;
}

.btn-link-danger:hover {
    color: #c0392b;
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
  width: 90%; /* Fluid width */
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.modal-info {
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 1rem;
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

.modal-actions button {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    border: 1px solid #ddd;
    background: white;
    cursor: pointer;
}

.modal-actions .btn-submit {
    background: #42b983;
    color: white;
    border: none;
}
</style>
