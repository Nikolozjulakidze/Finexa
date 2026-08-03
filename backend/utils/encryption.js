import crypto from "crypto";

const keyHex = process.env.TOKEN_ENCRYPTION_KEY;
if (!keyHex || keyHex.length !== 64) {
  throw new Error(
    "TOKEN_ENCRYPTION_KEY must be set in .env as a 32-byte hex string",
  );
}

const KEY = Buffer.from(keyHex, "hex");
const ALGORITHM = "aes-256-gcm";

export const encrypt = (plaintext) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
};

export const decrypt = (ciphertext) => {
  const [ivHex, tagHex, encryptedHex] = ciphertext.split(":");
  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error("Invalid encrypted token format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted, "utf8") + decipher.final("utf8");
};
