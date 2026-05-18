let _db: unknown = undefined;

export function setDbRef(db: unknown): void {
  _db = db;
}

export function getDbRef(): unknown {
  return _db;
}
