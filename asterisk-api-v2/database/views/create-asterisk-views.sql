-- =====================================================
-- Asterisk Realtime Database Views
-- =====================================================
-- Purpose: Separate active configuration (for Asterisk)
--          from historical data (for reporting)
--
-- Problem: When records are soft-deleted in PostgreSQL,
--          Asterisk Realtime should NOT see them, but
--          reports/statistics should still have access.
--
-- Solution: Create views that filter deleted_at IS NULL
--          and configure Asterisk to read from views
--          instead of base tables.
--
-- Usage:
--   1. Run migration to add deleted_at columns
--   2. Execute this script: psql -U asterisk_user -d asterisk_db -f create-asterisk-views.sql
--   3. Update extconfig.conf to use *_active views
--   4. Reload Asterisk: asterisk -rx "module reload res_odbc" && asterisk -rx "pjsip reload"
-- =====================================================

-- =====================================================
-- SECTION 1: PJSIP Configuration Views (for Asterisk)
-- =====================================================

-- View: ps_endpoints_active
-- Purpose: Asterisk reads ONLY active (non-deleted) PJSIP endpoints
-- Table: ps_endpoints → ps_endpoints_active
CREATE OR REPLACE VIEW ps_endpoints_active AS
SELECT
  id,
  display_name,
  tenant_id,
  transport,
  aors,
  auth,
  context,
  disallow,
  allow,
  direct_media,
  trust_id_inbound,
  send_pai,
  send_rpid,
  callerid,
  dtmf_mode,
  ice_support,
  mailboxes,
  webrtc,
  use_avpf,
  media_encryption,
  dtls_verify,
  dtls_setup,
  dtls_cert_file,
  dtls_private_key,
  dtls_ca_file,
  rtcp_mux,
  rtp_symmetric,
  force_rport,
  rewrite_contact,
  identify_by,
  bundle,
  timers,
  role_id,
  created_at,
  updated_at
FROM ps_endpoints
WHERE deleted_at IS NULL;

COMMENT ON VIEW ps_endpoints_active IS 'Active PJSIP endpoints for Asterisk Realtime (filters deleted_at IS NULL)';

-- View: ps_auths_active
-- Purpose: Asterisk reads ONLY active authentication configurations
-- Table: ps_auths → ps_auths_active
CREATE OR REPLACE VIEW ps_auths_active AS
SELECT
  id,
  tenant_id,
  auth_type,
  username,
  password,
  md5_cred,
  realm,
  nonce_lifetime,
  created_at,
  updated_at
FROM ps_auths
WHERE deleted_at IS NULL;

COMMENT ON VIEW ps_auths_active IS 'Active PJSIP authentication for Asterisk Realtime (filters deleted_at IS NULL)';

-- View: ps_aors_active
-- Purpose: Asterisk reads ONLY active Address of Records
-- Table: ps_aors → ps_aors_active
CREATE OR REPLACE VIEW ps_aors_active AS
SELECT
  id,
  tenant_id,
  max_contacts,
  remove_existing,
  minimum_expiration,
  maximum_expiration,
  default_expiration,
  qualify_frequency,
  qualify_timeout,
  authenticate_qualify,
  support_path,
  mailboxes,
  created_at,
  updated_at
FROM ps_aors
WHERE deleted_at IS NULL;

COMMENT ON VIEW ps_aors_active IS 'Active PJSIP AORs for Asterisk Realtime (filters deleted_at IS NULL)';

-- =====================================================
-- SECTION 2: Queue Configuration Views (for Asterisk)
-- =====================================================

-- View: queues_active
-- Purpose: Asterisk reads ONLY active queues
-- Table: queues → queues_active
CREATE OR REPLACE VIEW queues_active AS
SELECT
  name,
  tenant_id,
  strategy,
  timeout,
  retry,
  maxlen,
  weight,
  announce_position,
  announce_holdtime,
  musiconhold,
  announce_frequency,
  min_announce_frequency,
  servicelevel,
  joinempty,
  leavewhenempty,
  ringinuse,
  memberdelay,
  wrapuptime,
  autopause,
  periodic_announce,
  periodic_announce_frequency,
  context,
  announce
FROM queues
WHERE deleted_at IS NULL;

COMMENT ON VIEW queues_active IS 'Active queues for Asterisk Realtime (filters deleted_at IS NULL)';

-- View: queue_members_active
-- Purpose: Asterisk reads ONLY queue members for active queues
-- Table: queue_members → queue_members_active
-- Note: Filters out members whose parent queue is deleted
CREATE OR REPLACE VIEW queue_members_active AS
SELECT
  qm.uniqueid,
  qm.membername,
  qm.queue_name,
  qm.interface,
  qm.penalty,
  qm.paused,
  qm.state_interface,
  qm.wrapuptime
FROM queue_members qm
INNER JOIN queues q ON qm.queue_name = q.name
WHERE qm.deleted_at IS NULL
  AND q.deleted_at IS NULL;

COMMENT ON VIEW queue_members_active IS 'Active queue members for Asterisk Realtime (filters deleted members and deleted queues)';

-- =====================================================
-- SECTION 3: Dialplan Configuration Views (for Asterisk)
-- =====================================================

-- View: extensions_active
-- Purpose: Asterisk reads ONLY active dialplan extensions
-- Table: extensions → extensions_active
CREATE OR REPLACE VIEW extensions_active AS
SELECT
  id,
  tenant_id,
  context,
  exten,
  priority,
  app,
  appdata,
  created_at,
  updated_at
FROM extensions
WHERE deleted_at IS NULL;

COMMENT ON VIEW extensions_active IS 'Active dialplan extensions for Asterisk Realtime (filters deleted_at IS NULL)';

-- =====================================================
-- SECTION 4: SIP Trunk Configuration Views (for Asterisk)
-- =====================================================

-- View: sip_trunks_active
-- Purpose: Wizard config generation reads ONLY active AND enabled trunks
-- Table: sip_trunks → sip_trunks_active
-- Note: Filters both deleted_at AND enabled flag
CREATE OR REPLACE VIEW sip_trunks_active AS
SELECT
  id,
  name,
  tenant_id,
  remote_host,
  username,
  password,
  transport,
  context,
  sends_registrations,
  sends_auth,
  client_uri,
  server_uri,
  retry_interval,
  expiration,
  max_retries,
  forbidden_retry_interval,
  line,
  outbound_proxy,
  support_path,
  destination_type,
  destination_id,
  did_pattern,
  display_name,
  description,
  enabled,
  created_at,
  updated_at
FROM sip_trunks
WHERE deleted_at IS NULL
  AND enabled = true;

COMMENT ON VIEW sip_trunks_active IS 'Active and enabled SIP trunks for wizard config generation (filters deleted_at IS NULL AND enabled = true)';

-- =====================================================
-- SECTION 5: Historical/Reporting Views (for API)
-- =====================================================

-- View: v_cdr_enriched
-- Purpose: CDR with endpoint details INCLUDING deleted endpoints
--          (so reports show historical data even if endpoint was deleted)
CREATE OR REPLACE VIEW v_cdr_enriched AS
SELECT
  c.id,
  c.tenant_id,
  t.name as tenant_name,
  c.calldate,
  c.clid,
  c.src,
  c.dst,
  c.dcontext,
  c.channel,
  c.dstchannel,
  c.lastapp,
  c.lastdata,
  c.duration,
  c.billsec,
  c.disposition,
  c.amaflags,
  c.accountcode,
  c.uniqueid,
  c.linkedid,
  c.peeraccount,
  c.sequence,

  -- Source endpoint info (even if deleted)
  src_ep.display_name as src_endpoint_name,
  src_ep.callerid as src_callerid,
  src_ep.deleted_at as src_endpoint_deleted_at,
  CASE
    WHEN src_ep.deleted_at IS NULL THEN 'active'
    ELSE 'deleted'
  END as src_status,

  -- Destination endpoint info (even if deleted)
  dst_ep.display_name as dst_endpoint_name,
  dst_ep.callerid as dst_callerid,
  dst_ep.deleted_at as dst_endpoint_deleted_at,
  CASE
    WHEN dst_ep.deleted_at IS NULL THEN 'active'
    ELSE 'deleted'
  END as dst_status

FROM cdr c
INNER JOIN tenants t ON c.tenant_id = t.id
LEFT JOIN ps_endpoints src_ep ON c.src = src_ep.id
LEFT JOIN ps_endpoints dst_ep ON c.dst = dst_ep.id;

COMMENT ON VIEW v_cdr_enriched IS 'CDR with endpoint details including deleted endpoints for historical reporting';

-- View: v_queue_call_stats
-- Purpose: Queue statistics INCLUDING deleted queues (for historical analysis)
CREATE OR REPLACE VIEW v_queue_call_stats AS
SELECT
  q.tenant_id,
  q.name as queue_name,
  q.strategy,
  CASE
    WHEN q.deleted_at IS NULL THEN 'active'
    ELSE 'deleted'
  END as queue_status,
  q.deleted_at as queue_deleted_at,

  -- Call statistics (from CDR)
  COUNT(c.id) as total_calls,
  COUNT(CASE WHEN c.disposition = 'ANSWERED' THEN 1 END) as answered_calls,
  COUNT(CASE WHEN c.disposition IN ('FAILED', 'BUSY', 'NO ANSWER') THEN 1 END) as failed_calls,
  SUM(c.duration) as total_duration_seconds,
  SUM(c.billsec) as total_billsec_seconds,
  AVG(c.billsec) as avg_billsec_seconds,
  MAX(c.calldate) as last_call_date

FROM queues q
LEFT JOIN cdr c ON c.dstchannel LIKE '%Queue:' || q.name || '%'
GROUP BY q.tenant_id, q.name, q.strategy, q.deleted_at;

COMMENT ON VIEW v_queue_call_stats IS 'Queue statistics including deleted queues for historical reporting';

-- View: v_endpoint_activity
-- Purpose: Endpoint activity INCLUDING deleted endpoints
CREATE OR REPLACE VIEW v_endpoint_activity AS
SELECT
  e.id,
  e.display_name,
  e.tenant_id,
  t.name as tenant_name,
  e.context,
  CASE
    WHEN e.deleted_at IS NULL THEN 'active'
    ELSE 'deleted'
  END as status,
  e.created_at,
  e.deleted_at,
  e.deleted_by,
  e.deletion_reason,

  -- Call statistics
  COUNT(DISTINCT CASE WHEN c.src = e.id THEN c.id END) as outbound_calls,
  COUNT(DISTINCT CASE WHEN c.dst = e.id THEN c.id END) as inbound_calls,
  COUNT(DISTINCT c.id) as total_calls,
  SUM(c.duration) as total_call_duration_seconds,
  MAX(c.calldate) as last_call_date

FROM ps_endpoints e
INNER JOIN tenants t ON e.tenant_id = t.id
LEFT JOIN cdr c ON (c.src = e.id OR c.dst = e.id)
GROUP BY e.id, e.display_name, e.tenant_id, t.name, e.context, e.deleted_at, e.deleted_by, e.deletion_reason, e.created_at;

COMMENT ON VIEW v_endpoint_activity IS 'Endpoint activity metrics including deleted endpoints for historical analysis';

-- =====================================================
-- SECTION 6: Audit Trail Views
-- =====================================================

-- View: v_deletion_audit
-- Purpose: Centralized view of all deleted records across tables
CREATE OR REPLACE VIEW v_deletion_audit AS
-- Deleted endpoints
SELECT
  'endpoint' as entity_type,
  e.id as entity_id,
  e.display_name as entity_name,
  e.tenant_id,
  t.name as tenant_name,
  e.created_at,
  e.deleted_at,
  e.deleted_by,
  u.email as deleted_by_email,
  e.deletion_reason
FROM ps_endpoints e
INNER JOIN tenants t ON e.tenant_id = t.id
LEFT JOIN app_users u ON e.deleted_by = u.id
WHERE e.deleted_at IS NOT NULL

UNION ALL

-- Deleted queues
SELECT
  'queue' as entity_type,
  q.name as entity_id,
  q.name as entity_name,
  q.tenant_id,
  t.name as tenant_name,
  NULL as created_at,
  q.deleted_at,
  q.deleted_by,
  u.email as deleted_by_email,
  q.deletion_reason
FROM queues q
INNER JOIN tenants t ON q.tenant_id = t.id
LEFT JOIN app_users u ON q.deleted_by = u.id
WHERE q.deleted_at IS NOT NULL

UNION ALL

-- Deleted extensions
SELECT
  'extension' as entity_type,
  e.id::text as entity_id,
  e.exten || ' (ctx: ' || e.context || ', pri: ' || e.priority || ')' as entity_name,
  e.tenant_id,
  t.name as tenant_name,
  e.created_at,
  e.deleted_at,
  e.deleted_by,
  u.email as deleted_by_email,
  e.deletion_reason
FROM extensions e
INNER JOIN tenants t ON e.tenant_id = t.id
LEFT JOIN app_users u ON e.deleted_by = u.id
WHERE e.deleted_at IS NOT NULL

UNION ALL

-- Deleted SIP trunks
SELECT
  'sip_trunk' as entity_type,
  st.id::text as entity_id,
  COALESCE(st.display_name, st.name) as entity_name,
  st.tenant_id,
  COALESCE(t.name, 'Global') as tenant_name,
  st.created_at,
  st.deleted_at,
  st.deleted_by,
  u.email as deleted_by_email,
  st.deletion_reason
FROM sip_trunks st
LEFT JOIN tenants t ON st.tenant_id = t.id
LEFT JOIN app_users u ON st.deleted_by = u.id
WHERE st.deleted_at IS NOT NULL

ORDER BY deleted_at DESC;

COMMENT ON VIEW v_deletion_audit IS 'Audit trail of all deleted records across all configuration tables';

-- View: v_tenant_overview
-- Purpose: Per-tenant overview with counts of active/deleted resources
CREATE OR REPLACE VIEW v_tenant_overview AS
SELECT
  t.id as tenant_id,
  t.name as tenant_name,
  t.is_active,

  -- Endpoint counts
  COUNT(DISTINCT CASE WHEN e.deleted_at IS NULL THEN e.id END) as active_endpoints,
  COUNT(DISTINCT CASE WHEN e.deleted_at IS NOT NULL THEN e.id END) as deleted_endpoints,

  -- Queue counts
  COUNT(DISTINCT CASE WHEN q.deleted_at IS NULL THEN q.name END) as active_queues,
  COUNT(DISTINCT CASE WHEN q.deleted_at IS NOT NULL THEN q.name END) as deleted_queues,

  -- Extension counts
  COUNT(DISTINCT CASE WHEN ext.deleted_at IS NULL THEN ext.id END) as active_extensions,
  COUNT(DISTINCT CASE WHEN ext.deleted_at IS NOT NULL THEN ext.id END) as deleted_extensions,

  -- Call statistics (last 30 days)
  COUNT(DISTINCT CASE
    WHEN c.calldate >= CURRENT_DATE - INTERVAL '30 days' THEN c.id
  END) as calls_last_30days,

  t.created_at,
  t.updated_at

FROM tenants t
LEFT JOIN ps_endpoints e ON t.id = e.tenant_id
LEFT JOIN queues q ON t.id = q.tenant_id
LEFT JOIN extensions ext ON t.id = ext.tenant_id
LEFT JOIN cdr c ON t.id = c.tenant_id
GROUP BY t.id, t.name, t.is_active, t.created_at, t.updated_at;

COMMENT ON VIEW v_tenant_overview IS 'Per-tenant resource counts and statistics (active vs deleted)';

-- =====================================================
-- SECTION 7: Permissions & Grants
-- =====================================================

-- Grant SELECT on all views to asterisk user
GRANT SELECT ON ps_endpoints_active TO asterisk;
GRANT SELECT ON ps_auths_active TO asterisk;
GRANT SELECT ON ps_aors_active TO asterisk;
GRANT SELECT ON queues_active TO asterisk;
GRANT SELECT ON queue_members_active TO asterisk;
GRANT SELECT ON extensions_active TO asterisk;
GRANT SELECT ON sip_trunks_active TO asterisk;

-- Grant SELECT on reporting views to API user (adjust username as needed)
-- GRANT SELECT ON v_cdr_enriched TO your_api_user;
-- GRANT SELECT ON v_queue_call_stats TO your_api_user;
-- GRANT SELECT ON v_endpoint_activity TO your_api_user;
-- GRANT SELECT ON v_deletion_audit TO your_api_user;
-- GRANT SELECT ON v_tenant_overview TO your_api_user;

-- =====================================================
-- SECTION 8: Verification Queries
-- =====================================================

-- Verify views were created successfully
SELECT
  viewname as view_name,
  viewowner as owner,
  pg_size_pretty(pg_relation_size(schemaname||'.'||viewname)) as size
FROM pg_views
WHERE schemaname = 'public'
  AND viewname LIKE '%_active' OR viewname LIKE 'v_%'
ORDER BY viewname;

-- Test: Count active vs deleted endpoints
SELECT
  COUNT(*) as total_endpoints,
  COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as active_endpoints,
  COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as deleted_endpoints
FROM ps_endpoints;

-- Test: Verify ps_endpoints_active view only shows active records
SELECT COUNT(*) as active_in_view FROM ps_endpoints_active;

COMMENT ON VIEW ps_endpoints_active IS '✅ Active PJSIP endpoints for Asterisk Realtime';
COMMENT ON VIEW v_cdr_enriched IS '✅ CDR with endpoint details for historical reporting';

SELECT '✅ Asterisk views created successfully!' as status;
