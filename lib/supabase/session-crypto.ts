import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";
import aesjs from "aes-js";

const V1_PREFIX = "enc:v1:";
const V2_PREFIX = "enc:v2:";
const IV_BYTES = 16;
const MAC_BYTES = 32;
const AUTHENTICATION_CONTEXT = aesjs.utils.utf8.toBytes("nutrilift-supabase-session:v2:");

function encodeBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function concatenate(...values: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(values.reduce((length, value) => length + value.length, 0));
  let offset = 0;
  for (const value of values) {
    result.set(value, offset);
    offset += value.length;
  }
  return result;
}

function assertKeyLength(key: Uint8Array, expectedLength: number): void {
  if (key.length !== expectedLength) {
    throw new Error(`Session encryption key must be ${expectedLength} bytes.`);
  }
}

export function encryptSession(
  value: string,
  encryptionKey: Uint8Array,
  authenticationKey: Uint8Array,
  iv: Uint8Array,
): string {
  assertKeyLength(encryptionKey, 32);
  assertKeyLength(authenticationKey, 32);
  if (iv.length !== IV_BYTES) throw new Error("Session encryption IV must be 16 bytes.");

  const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(iv));
  const ciphertext = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
  const authenticatedData = concatenate(iv, ciphertext);
  const tag = hmac(sha256, authenticationKey, concatenate(AUTHENTICATION_CONTEXT, authenticatedData));
  return V2_PREFIX + encodeBase64(concatenate(authenticatedData, tag));
}

export function decryptSession(
  value: string,
  encryptionKey: Uint8Array,
  authenticationKey: Uint8Array,
): string {
  assertKeyLength(encryptionKey, 32);
  assertKeyLength(authenticationKey, 32);
  if (!value.startsWith(V2_PREFIX)) throw new Error("Unsupported encrypted Supabase session format.");

  const payload = decodeBase64(value.slice(V2_PREFIX.length));
  if (payload.length < IV_BYTES + MAC_BYTES) {
    throw new Error("Encrypted Supabase session is truncated.");
  }

  const authenticatedData = payload.slice(0, -MAC_BYTES);
  const suppliedTag = payload.slice(-MAC_BYTES);
  const expectedTag = hmac(sha256, authenticationKey, concatenate(AUTHENTICATION_CONTEXT, authenticatedData));
  let tagDifference = 0;
  for (let index = 0; index < MAC_BYTES; index += 1) {
    const expectedByte = expectedTag[index];
    const suppliedByte = suppliedTag[index];
    if (expectedByte === undefined || suppliedByte === undefined) {
      throw new Error("Encrypted Supabase session is truncated.");
    }
    tagDifference |= expectedByte ^ suppliedByte;
  }
  if (tagDifference !== 0) throw new Error("Encrypted Supabase session failed authentication.");

  const iv = authenticatedData.slice(0, IV_BYTES);
  const ciphertext = authenticatedData.slice(IV_BYTES);
  const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(iv));
  return aesjs.utils.utf8.fromBytes(cipher.decrypt(ciphertext));
}

export function decryptLegacySession(value: string, encryptionKey: Uint8Array): string {
  assertKeyLength(encryptionKey, 32);
  if (!value.startsWith(V1_PREFIX)) throw new Error("Unsupported legacy Supabase session format.");
  const ciphertext = decodeBase64(value.slice(V1_PREFIX.length));
  const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
  return aesjs.utils.utf8.fromBytes(cipher.decrypt(ciphertext));
}
