function pgCode(err: unknown): string | undefined {
  return typeof err === "object" && err !== null && "code" in err
    ? (err as { code: string }).code
    : undefined;
}

/** Code Postgres : violation de clé étrangère */
export function isForeignKeyViolation(err: unknown): boolean {
  return pgCode(err) === "23503";
}

/** Code Postgres : violation NOT NULL */
export function isNotNullViolation(err: unknown): boolean {
  return pgCode(err) === "23502";
}
