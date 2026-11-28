-- Additive migration: store AES-256-GCM wrapped site secret key for stateless sealedResult sealing
ALTER TABLE "Site" ADD COLUMN IF NOT EXISTS "encryptedSecretKey" TEXT;
