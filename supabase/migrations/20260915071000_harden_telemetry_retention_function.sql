-- Keep the security-definer retention job independent of objects that could be
-- created in an exposed schema.
alter function private.purge_expired_processing_telemetry()
  set search_path = '';
