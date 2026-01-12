import { apiClient } from './client';
import type { ObjectiveDto } from '@/types/api';
import type { Workflow } from '@/types/domain';
import { mapObjectiveDtoToWorkflow } from './mappers';

// Re-export type if needed, or consumers should import from domain
export type Objective = Workflow;

export class ObjectiveApiService {
  async getAll(tenantId?: string): Promise<Workflow[]> {
    const config = tenantId ? { params: { tenantId } } : {};
    const responseIds = await apiClient.get<string[]>('/Objective/GetAll', config);
    const ids = responseIds.data;
    
    // Wir vertrauen darauf, dass das Backend nur IDs zurückgibt, die zum Tenant gehören.
    // Das Laden der Details muss robust sein, falls zwischen ID-Fetch und Detail-Fetch etwas gelöscht wurde.
    const promises = ids.map(id => this.getById(id));
    const objectives = await Promise.all(promises);
    return objectives.filter((o): o is Workflow => o !== null);
  }

  async getById(guid: string): Promise<Workflow | null> {
    try {
      const response = await apiClient.get<ObjectiveDto>(`/Objective/Get/${guid}`);
      return mapObjectiveDtoToWorkflow(response.data);
    } catch (e) {
      console.error(`Failed to fetch objective ${guid}`, e);
      return null;
    }
  }

  async create(displayName: string, deadlineDate: string, description?: string, tenantId?: string): Promise<string> {
    const response = await apiClient.post<string>('/Objective/Create', {
      DisplayName: displayName,
      Description: description,
      DeadlineDate: deadlineDate,
      TenantId: tenantId
    });
    return response.data;
  }

  async delete(guid: string): Promise<void> {
    await apiClient.delete(`/Objective/Delete/${guid}`);
  }
}

export const objectiveService = new ObjectiveApiService();
