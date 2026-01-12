import type { ActorDto, RoleDto, ObjectiveDto, AssignmentDto } from '@/types/api';
import type { User, Role, Workflow, WorkStep } from '@/types/domain';

export function mapRoleDtoToRole(dto: RoleDto): Role {
  const d = dto as any;
  return {
    guid: d.guid || d.Guid,
    displayName: d.displayName || d.DisplayName || 'Unknown',
    description: d.description || d.Description,
    isAdmin: d.isAdmin || d.IsAdmin || false,
    tenantId: d.tenantId || d.TenantId,
  };
}

export function mapActorToUser(dto: ActorDto): User {
  const d = dto as any;
  return {
    guid: d.guid || d.Guid,
    displayName: d.displayName || d.DisplayName || 'Unknown',
    role: d.role || d.Role ? mapRoleDtoToRole(d.role || d.Role) : null,
    tenantId: d.tenantId || d.TenantId,
  };
}

export function mapObjectiveDtoToWorkflow(dto: ObjectiveDto): Workflow {
  const d = dto as any;
  return {
    guid: d.guid || d.Guid,
    displayName: d.displayName || d.DisplayName || 'Unknown',
    description: d.description || d.Description,
    deadlineDate: d.deadlineDate || d.DeadlineDate,
    tenantId: d.tenantId || d.TenantId,
  };
}

export function mapAssignmentDtoToWorkStep(dto: AssignmentDto): WorkStep {
  const d = dto as any;
  return {
    guid: d.guid || d.Guid,
    displayName: d.displayName || d.DisplayName || 'Unknown',
    description: d.description || d.Description,
    duration: d.duration || d.Duration || 0,
    sequenceNumber: d.sequenceNumber || d.SequenceNumber || 0,
    assigneeGuid: d.assigneeGuid || d.AssigneeGuid,
    requiredRoleGuid: d.requiredRoleGuid || d.RequiredRoleGuid,
    priority: d.priority || d.Priority || 0,
    status: d.status || d.Status || 0,
    parentObjectiveGuid: d.parentObjectiveGuid || d.ParentObjectiveGuid,
  };
}
