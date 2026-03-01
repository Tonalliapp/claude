export function tenantRoom(tenantId: string): string {
  return `tenant:${tenantId}`;
}

export function kitchenRoom(tenantId: string): string {
  return `tenant:${tenantId}:kitchen`;
}

export function tableRoom(tenantId: string, tableId: string): string {
  return `table:${tenantId}:${tableId}`;
}
