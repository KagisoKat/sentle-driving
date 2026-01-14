BEGIN;

-- Store refresh tokens so we can revoke them (logout / compromised tokens)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- We store a HASH of the refresh token, not the token itself.
  -- If DB leaks, attacker can't instantly use refresh tokens.
  token_hash TEXT NOT NULL UNIQUE,

  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup: "all refresh tokens for user"
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
  ON refresh_tokens (user_id);

COMMIT;
