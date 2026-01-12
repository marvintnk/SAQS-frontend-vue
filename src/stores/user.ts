import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '@/types/domain';
import { actorService } from '@/services/api/actor';
import { roleService } from '@/services/api/role';

export const useUserStore = defineStore('user', () => {
  const users = ref<User[]>([]);
  const currentUser = ref<User | null>(null);
  const currentTenant = ref<User | null>(null); // Der User, der als "Manager" den Mandanten simuliert.
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const managers = computed(() => {
    // Workaround: Da das Backend keine strikte Tenant-Ressource exportiert,
    // nutzen wir User mit "Manager"-Rolle als Pseudo-Tenants für die Auswahl im UI.
    return users.value.filter(u => 
      u.role?.displayName?.toLowerCase().includes('manager') || u.role?.isAdmin
    );
  });

  const isAuthenticated = computed(() => !!currentUser.value);

  // Actions
  async function loadUsers(tenantId?: string) {
    loading.value = true;
    error.value = null;
    try {
      users.value = await actorService.getAll(tenantId);
    } catch (e) {
      console.error(e);
      error.value = 'Failed to load users';
    } finally {
      loading.value = false;
    }
  }

  async function initializeDemoData() {
    loading.value = true;
    
    try {
      // Stellen sicher, dass die benötigten Rollen existieren
      const roles = await roleService.getAll();
      let managerRole = roles.find(r => (r.displayName && r.displayName.toLowerCase() === 'manager') || r.displayName === 'Administrator');
      
      if (!managerRole) {
        try {
          const guid = await roleService.create('Manager', true, 'System Manager Role');
          managerRole = { guid, displayName: 'Manager', description: 'System Manager Role', isAdmin: true };
        } catch (roleError: any) {
           if (roleError.response && roleError.response.status === 409) {
             console.warn('Manager role already exists (409). Reloading roles to find it.');
             // Catch 409 Conflict: Jemand anderes (oder früherer Run) hat die Rolle schon angelegt.
             // -> Neu laden um die GUID zu bekommen.
             const retryRoles = await roleService.getAll();
             managerRole = retryRoles.find(r => (r.displayName && r.displayName.toLowerCase() === 'manager')) || retryRoles.find(r => r.isAdmin);
           } else {
             throw roleError;
           }
        }
      }

      if (!managerRole) {
        throw new Error('Could not find or create a Manager role.');
      }

      // Check Actors
      // Liste neu laden, um sicherzugehen, dass wir keine unnötigen Doplikate erzeugen.
      const existingUsers = await actorService.getAll();
      const managerUser = existingUsers.find(u => u.displayName === 'BeispielFirma');

      if (!managerUser) {
        // Manager User anlegen (Das ist unser "Mandant")
        const guid = await actorService.create('BeispielFirma', managerRole.guid);
        // TenantId auf sich selbst setzen -> Self-Reference Pattern für Tenant-Root
        await actorService.setTenantId(guid, guid);
      }
      
      // Finalen State laden
      await loadUsers();
      
    } catch (e: any) {
      console.error('Failed to init demo data', e);
      error.value = `Failed to initialize demo data: ${e.message || e}`;
      if (e.response) {
         error.value += ` (Status: ${e.response.status} - ${JSON.stringify(e.response.data)})`;
      }
    } finally {
      loading.value = false;
    }
  }

  function login(user: User, tenant: User) {
    currentUser.value = user;
    currentTenant.value = tenant;
    // Persist if needed, for prototype maybe not strictly required but good practice
    localStorage.setItem('currentUserGuid', user.guid);
    localStorage.setItem('currentTenantGuid', tenant.guid);
  }

  function logout() {
    currentUser.value = null;
    currentTenant.value = null;
    localStorage.removeItem('currentUserGuid');
    localStorage.removeItem('currentTenantGuid');
  }

  async function restoreSession() {
      const userGuid = localStorage.getItem('currentUserGuid');
      const tenantGuid = localStorage.getItem('currentTenantGuid');

      if (!userGuid || !tenantGuid) return false;

      loading.value = true;
      try {
          // Fetch specific objects to verify validity
          const [user, tenant] = await Promise.all([
             actorService.getById(userGuid),
             actorService.getById(tenantGuid)
          ]);

          if (user && tenant) {
             currentUser.value = user;
             currentTenant.value = tenant;
             // Load users context for this tenant
             await loadUsers(tenant.guid);
             return true;
          } else {
             logout(); // Clean up invalid local storage
             return false;
          }
      } catch (e) {
          console.error("Session restore failed", e);
          logout();
          return false;
      } finally {
          loading.value = false;
      }
  }

  return {
    users,
    currentUser,
    currentTenant,
    managers,
    loading,
    error,
    isAuthenticated,
    loadUsers,
    login,
    logout,
    initializeDemoData,
    restoreSession
  };
});
