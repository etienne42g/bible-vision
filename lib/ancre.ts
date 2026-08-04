export function withoutSentImport<T extends { externalId: string }>(
  imports: T[],
  externalId: string,
) {
  return imports.filter((item) => item.externalId !== externalId);
}
