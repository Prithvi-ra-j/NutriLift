import aesjs from "aes-js";
import {
  decryptLegacySession,
  decryptSession,
  encryptSession,
} from "../session-crypto";

const encryptionKey = new Uint8Array(32).fill(7);
const authenticationKey = new Uint8Array(32).fill(11);

function encryptLegacy(value: string): string {
  const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
  const ciphertext = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
  return `enc:v1:${btoa(String.fromCharCode(...ciphertext))}`;
}

describe("Supabase session encryption", () => {
  it("round-trips authenticated ciphertext and uses a unique IV per write", () => {
    const firstIv = new Uint8Array(16).fill(1);
    const secondIv = new Uint8Array(16).fill(2);

    const first = encryptSession("session-secret", encryptionKey, authenticationKey, firstIv);
    const second = encryptSession("session-secret", encryptionKey, authenticationKey, secondIv);

    expect(first).not.toBe(second);
    expect(decryptSession(first, encryptionKey, authenticationKey)).toBe("session-secret");
    expect(decryptSession(second, encryptionKey, authenticationKey)).toBe("session-secret");
  });

  it("rejects modified ciphertext and an incorrect authentication key", () => {
    const encrypted = encryptSession(
      "session-secret",
      encryptionKey,
      authenticationKey,
      new Uint8Array(16).fill(3),
    );
    const payload = encrypted.slice("enc:v2:".length);
    const bytes = Uint8Array.from(atob(payload), (character) => character.charCodeAt(0));
    bytes[16] ^= 1;
    const tampered = `enc:v2:${btoa(String.fromCharCode(...bytes))}`;

    expect(() => decryptSession(tampered, encryptionKey, authenticationKey)).toThrow(
      /failed authentication/,
    );
    expect(() => decryptSession(encrypted, encryptionKey, new Uint8Array(32).fill(12))).toThrow(
      /failed authentication/,
    );
  });

  it("decrypts sessions written by the previous fixed-counter format", () => {
    const legacy = encryptLegacy("legacy-session");

    expect(decryptLegacySession(legacy, encryptionKey)).toBe("legacy-session");
  });
});
