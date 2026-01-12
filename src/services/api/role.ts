import { apiClient } from './client';
import type { RoleDto } from '@/types/api';
import { mapRoleDtoToRole } from './mappers';
import type { Role } from '@/types/domain';

export class RoleApiService {
  async getAll(tenantId?: string): Promise<Role[]> {
    const config = tenantId ? { params: { tenantId } } : {};
    const responseIds = await apiClient.get<string[]>('/Role/GetAll', config);
    const ids = responseIds.data;
    
    // Gleiches Schema wie überall: IDs holen, dann Details parallel auflösen.
    // Nicht schön für die Performance, aber aktuell notwendig API-seitig.
    const rolePromises = ids.map(id => this.getById(id));
    const roles = await Promise.all(rolePromises);

    return roles.filter((r): r is Role => r !== null);
  }

  async getById(guid: string): Promise<Role | null> {
    try {
      const response = await apiClient.get<RoleDto>(`/Role/Get/${guid}`);
      return mapRoleDtoToRole(response.data);
    } catch (e) {
      console.error(`Failed to fetch role ${guid}`, e);
      return null;
    }
  }

  async create(displayName: string, isAdmin: boolean, description?: string, tenantId?: string): Promise<string> {
    const response = await apiClient.post<string>('/Role/Create', {
      DisplayName: displayName,
      IsAdmin: isAdmin,
      Description: description,
      TenantId: tenantId
    });
    return response.data;
  }

  async delete(guid: string): Promise<void> {
    await apiClient.delete(`/Role/Delete/${guid}`);
  }
}

export const roleService = new RoleApiService();
