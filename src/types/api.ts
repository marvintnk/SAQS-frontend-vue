// 1:1 Abbild der C# Backend DTOs.
// Vorsicht: Backend nutzt PascalCase, wir mappen das später auf camelCase für die interne Verwendung.
export interface RoleDto {
  Guid: string;
  DisplayName: string;
  Description: string | null;
  IsAdmin: boolean;
  TenantId?: string;
}

export interface ActorDto {
  Guid: string;
  DisplayName: string;
  Role: RoleDto | null;
  TenantId?: string;
}

export interface ObjectiveDto {
  guid: string;
  displayName: string;
  description: string | null;
  deadlineDate: string;
  tenantId?: string;
}

export interface AssignmentDto {
  guid: string;
  displayName: string;
  description: string | null;
  duration: number;
  sequenceNumber: number;
  assigneeGuid: string | null;
  requiredRoleGuid: string | null;
  priority: number;
  status: number;
  parentObjectiveGuid: string | null;
}
