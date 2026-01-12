import { apiClient } from './client';
import type { AssignmentDto } from '@/types/api';
import type { WorkStep } from '@/types/domain';
import { mapAssignmentDtoToWorkStep } from './mappers';

export class AssignmentApiService {
  async getAll(tenantId?: string): Promise<WorkStep[]> {
    const config = tenantId ? { params: { tenantId } } : {};
    const responseIds = await apiClient.get<string[]>('/Assignment/GetAll', config);
    const ids = responseIds.data;
    
    // Auch hier: N+1 Abfragen, um die Details zu jedem Assignment zu bekommen.
    const promises = ids.map(id => this.getById(id));
    const assignments = await Promise.all(promises);
    return assignments.filter((a): a is WorkStep => a !== null);
  }

  async getById(guid: string): Promise<WorkStep | null> {
    try {
      const response = await apiClient.get<AssignmentDto>(`/Assignment/Get/${guid}`);
      return mapAssignmentDtoToWorkStep(response.data);
    } catch (e) {
      console.error(`Failed to fetch assignment ${guid}`, e);
      return null;
    }
  }

  async create(assignment: Partial<WorkStep> & { parentObjectiveGuid: string }): Promise<string> {
    // Mapping auf das Backend-DTO.
    // SequenceNumber und Priority werden vom Backend berechnet/ignoriert, falls wir sie hier mitschicken,
    // daher lassen wir das Backend die Kontrolle über diese Felder.
    const payload = {
      DisplayName: assignment.displayName,
      Description: assignment.description,
      Duration: assignment.duration,
      // SequenceNumber: assignment.sequenceNumber, // Wird serverseitig handled
      AssigneeGuid: assignment.assigneeGuid || null, // Explizit null setzen bei Erstellung
      RequiredRoleGuid: assignment.requiredRoleGuid,
      // Priority: assignment.priority, 
      Status: assignment.status,
      ParentObjectiveGuid: assignment.parentObjectiveGuid
    };
    const response = await apiClient.post<string>('/Assignment/Create', payload);
    return response.data;
  }

  async delete(guid: string): Promise<void> {
    await apiClient.delete(`/Assignment/Delete/${guid}`);
  }

  async setPriority(guid: string, priority: number): Promise<void> {
    await apiClient.patch('/Assignment/SetPriority', { Guid: guid, priority });
  }

  async setStatus(guid: string, status: number): Promise<void> {
    await apiClient.patch('/Assignment/SetStatus', { Guid: guid, assignmentStatus: status });
  }
}

export const assignmentService = new AssignmentApiService();
