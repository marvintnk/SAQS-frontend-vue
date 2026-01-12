export interface Role {
  guid: string;
  displayName: string;
  description: string | null;
  isAdmin: boolean;
  tenantId?: string;
}

export interface User {
  guid: string;
  displayName: string;
  role: Role | null;
  tenantId?: string;
}

// Das interne Domain-Modell (Clean Architecture).
// Hier nutzen wir konsequent camelCase und TypeScript Enums.
export interface Tenant {
  guid: string;
  displayName: string;
}

export enum AssignmentStatus {
  Planned = 0,
  InProgress = 1,
  Completed = 2
}

export enum Priority {
  ShortTerm = 0,
  MidTerm = 1,
  LongTerm = 2
}

export interface WorkStep {
  guid: string;
  displayName: string;
  description: string | null;
  duration: number;
  sequenceNumber: number;
  assigneeGuid: string | null;
  requiredRoleGuid: string | null;
  priority: Priority;
  status: AssignmentStatus;
  parentObjectiveGuid: string | null;
}

export interface Workflow {
  guid: string;
  displayName: string;
  description: string | null;
  deadlineDate: string;
  tenantId?: string;
}
