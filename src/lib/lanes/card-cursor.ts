const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function encodeCardCursor(position: number, id: string): string {
  if (!Number.isFinite(position) || !uuid.test(id)) throw new Error("Invalid card cursor");
  return Buffer.from(JSON.stringify({ position, id })).toString("base64url");
}
export function decodeCardCursor(raw: string): { position: number; id: string } {
  if (raw.length > 256 || !/^[A-Za-z0-9_-]+$/.test(raw)) throw new Error("Invalid card cursor");
  const value = JSON.parse(Buffer.from(raw, "base64url").toString());
  if (!value || typeof value.position !== "number" || !Number.isFinite(value.position) || typeof value.id !== "string" || !uuid.test(value.id)) throw new Error("Invalid card cursor");
  return { position: value.position, id: value.id };
}
