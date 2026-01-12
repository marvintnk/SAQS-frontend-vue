import { apiClient } from './client';
import { mapActorToUser } from './mappers';
import type { User } from '@/types/domain';
import type { ActorDto } from '@/types/api';

export class ActorApiService {
  async getAll(tenantId?: string): Promise<User[]> {
    // Wir holen zuerst nur die IDs, da der Backend-Endpoint keine vollständigen Objekte liefert.
    const config = tenantId ? { params: { tenantId } } : {};
    const responseIds = await apiClient.get<string[]>('/Actor/GetAll', config);
    const ids = responseIds.data;

    // Workaround für fehlenden Bulk-Endpoint: Details parallel abfragen.
    // Falls das Performance-Probleme macht, müssen wir im Backend einen besseren Endpoint anfragen.
    const userPromises = ids.map(id => this.getById(id));
    const users = await Promise.all(userPromises);
    
    // Fehlerhafte Aufrufe (null) rausfiltern, damit die UI stabil bleibt.
    return users.filter((u): u is User => u !== null);
  }

  async getById(guid: string): Promise<User | null> {
    try {
      const response = await apiClient.get<ActorDto>(`/Actor/Get/${guid}`);
      return mapActorToUser(response.data);
    } catch (e) {
      console.error(`Failed to fetch actor ${guid}`, e);
      return null;
    }
  }

  async create(displayName: string, roleGuid?: string, tenantId?: string): Promise<string> {
    const response = await apiClient.post<string>('/Actor/Create', {
      DisplayName: displayName,
      RoleGuid: roleGuid,
      TenantId: tenantId
    });
    return response.data;
  }

  async delete(guid: string): Promise<void> {
    await apiClient.delete(`/Actor/Delete/${guid}`);
  }

  async setTenantId(guid: string, tenantId: string): Promise<void> {
    await apiClient.patch('/Actor/SetTenantId', {
      Guid: guid,
      TenantId: tenantId
    });
  }
}

export const actorService = new ActorApiService();
