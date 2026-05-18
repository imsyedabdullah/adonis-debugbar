let dbRef: unknown;

export function setDbRef(db: unknown): void {
  dbRef = db;
}

export function getDbRef(): unknown {
  return dbRef;
}
