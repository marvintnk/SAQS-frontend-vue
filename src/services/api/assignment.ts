import { apiClient } from './client';
import type { AssignmentDto } from '@/types/api';
import type { WorkStep } from '@/types/domain';
import { mapAssignmentDtoToWorkStep } from './mappers';

export class AssignmentApiService {
  async getAll(tenantId?: string): Promise<WorkStep[]> {
    const config = tenantId ? { params: { tenantId } } : {};
    const responseIds = await apiClient.get<string[]>('/Assignment/GetAll', config);
    const ids = responseIds.data;
    
    // Fetch details for all assignments
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
    // Mapping frontend model to backend DTO structure expected by Create endpoint
    // Backend will handle SequenceNumber and Priority if not provided or ignored.
    // AssigneeGuid and RequiredRoleGuid are optional in backend, but frontend enforces RequiredRoleGuid.
    const payload = {
      DisplayName: assignment.displayName,
      Description: assignment.description,
      Duration: assignment.duration,
      // SequenceNumber: assignment.sequenceNumber, // Backend handles this
      AssigneeGuid: assignment.assigneeGuid || null, // Should be null on create per user request
      RequiredRoleGuid: assignment.requiredRoleGuid,
      // Priority: assignment.priority, // Backend calculates this
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
