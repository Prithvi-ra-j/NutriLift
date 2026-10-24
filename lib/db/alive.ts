import { isNull, type AnyColumn, type SQL } from "drizzle-orm";

export function alive<T extends { deleted_at: AnyColumn }>(table: T): SQL {
  return isNull(table.deleted_at);
}
