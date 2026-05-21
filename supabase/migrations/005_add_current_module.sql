-- Migration: Add current_module to chat_sessions for modular training flow
-- This enables the 3-module training system: Bedarfsermittlung, Präsentation, Einwandbehandlung

ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS current_module INTEGER DEFAULT 1 CHECK (current_module BETWEEN 1 AND 3);
-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_sessions_current_module ON chat_sessions(current_module);
-- Update existing sessions to module 1 if they don't have a value
UPDATE chat_sessions
SET current_module = 1
WHERE current_module IS NULL;
-- Add comment for documentation
COMMENT ON COLUMN chat_sessions.current_module IS 'Current training module: 1=Bedarfsermittlung, 2=Präsentation, 3=Einwandbehandlung';
