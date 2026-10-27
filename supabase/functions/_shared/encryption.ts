// AES-256-GCM envelope for sensitive files. Keys: DOC_ENCRYPTION_KEYS = {"kid":"<base64 32 bytes>"}, current DOC_ENCRYPTION_KID.
// Key custody (KMS/secret store) and rotation are operational decisions documented in docs/runbooks/keys.md.

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function keyMaterial(kid: string): Uint8Array {
  const keys = JSON.parse(Deno.env.get("DOC_ENCRYPTION_KEYS") ?? "{}") as Record<string, string>;
  const raw = keys[kid];
  if (!raw) throw new Error(`missing key ${kid}`);
  const bytes = unb64(raw);
  if (bytes.length !== 32) throw new Error("key must be 32 bytes");
  return bytes;
}

const importKey = (kid: string) => crypto.subtle.importKey("raw", keyMaterial(kid), "AES-GCM", false, ["encrypt", "decrypt"]);

export async function encrypt(plain: Uint8Array, aad: string): Promise<{ kid: string; iv: string; data: Uint8Array }> {
  const kid = Deno.env.get("DOC_ENCRYPTION_KID") ?? "";
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(aad) }, await importKey(kid), plain));
  return { kid, iv: b64(iv), data };
}

export async function decrypt(data: Uint8Array, kid: string, iv: string, aad: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv), additionalData: new TextEncoder().encode(aad) }, await importKey(kid), data));
}
