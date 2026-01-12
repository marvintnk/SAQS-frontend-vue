import { apiClient } from './client';
import { mapActorToUser } from './mappers';
import type { User } from '@/types/domain';
import type { ActorDto } from '@/types/api';

export class ActorApiService {
  async getAll(tenantId?: string): Promise<User[]> {
    // 1. Get all IDs
    const config = tenantId ? { params: { tenantId } } : {};
    const responseIds = await apiClient.get<string[]>('/Actor/GetAll', config);
    const ids = responseIds.data;

    // 2. Fetch details for each ID (Backend N+1 issue noted in docs)
    // Using Promise.all to fetch in parallel
    const userPromises = ids.map(id => this.getById(id));
    const users = await Promise.all(userPromises);
    
    // Filter out nulls if any fetch failed
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
