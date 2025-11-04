-- ============================================
-- SCRIPT D'INITIALISATION COMPLET API-DB
-- ============================================
-- Base de données unifiée pour Asterisk + Backend
-- Contient : Asterisk Realtime + Tables API + Nouvelles fonctionnalités
-- Date: 2025-01-04
-- ============================================

BEGIN;

-- Enable UUID extension for future use
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SECTION 1: VERSIONING
-- ============================================
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- ============================================
-- SECTION 2: MULTI-TENANT CORE
-- ============================================

-- Table tenants avec TOUTES les colonnes
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    company_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    max_endpoints INTEGER DEFAULT 100,
    max_queues INTEGER DEFAULT 50,
    context VARCHAR(50),
    dialplan_config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active);
CREATE INDEX IF NOT EXISTS idx_tenants_contact_email ON tenants(contact_email);
CREATE INDEX IF NOT EXISTS idx_tenants_name ON tenants(name);

-- ============================================
-- SECTION 3: CONTEXTS PAR TENANT
-- ============================================

CREATE TABLE IF NOT EXISTS tenant_contexts (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_primary BOOLEAN DEFAULT false,
    dialplan_config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Un seul contexte principal par tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_contexts_primary
    ON tenant_contexts(tenant_id) WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_tenant_contexts_tenant_id ON tenant_contexts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_contexts_name ON tenant_contexts(name);

-- ============================================
-- SECTION 4: GESTION DES UTILISATEURS API
-- ============================================

CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'TENANT_ADMIN', 'AGENT', 'SUPERVISOR');

CREATE TABLE IF NOT EXISTS app_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'AGENT',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_app_users_tenant_id ON app_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_username ON app_users(username);
CREATE INDEX IF NOT EXISTS idx_app_users_is_active ON app_users(is_active);

-- ============================================
-- SECTION 5: ASTERISK REALTIME - ENUMS
-- ============================================

CREATE TYPE type_values AS ENUM ('friend', 'user', 'peer');
CREATE TYPE sip_transport_values AS ENUM ('udp', 'tcp', 'tls', 'ws', 'wss', 'udp,tcp', 'tcp,udp');
CREATE TYPE sip_dtmfmode_values AS ENUM ('rfc2833', 'info', 'shortinfo', 'inband', 'auto');
CREATE TYPE sip_directmedia_values_v2 AS ENUM ('yes', 'no', 'nonat', 'update', 'outgoing');
CREATE TYPE yes_no_values AS ENUM ('yes', 'no');
CREATE TYPE sip_progressinband_values AS ENUM ('yes', 'no', 'never');
CREATE TYPE sip_session_timers_values AS ENUM ('accept', 'refuse', 'originate');
CREATE TYPE sip_session_refresher_values AS ENUM ('uac', 'uas');
CREATE TYPE sip_callingpres_values AS ENUM ('allowed_not_screened', 'allowed_passed_screen', 'allowed_failed_screen', 'allowed', 'prohib_not_screened', 'prohib_passed_screen', 'prohib_failed_screen', 'prohib');

-- PJSIP ENUMS
CREATE TYPE yesno_values AS ENUM ('yes', 'no');
CREATE TYPE pjsip_connected_line_method_values AS ENUM ('invite', 'reinvite', 'update');
CREATE TYPE pjsip_direct_media_glare_mitigation_values AS ENUM ('none', 'outgoing', 'incoming');
CREATE TYPE pjsip_dtmf_mode_values_v3 AS ENUM ('rfc4733', 'inband', 'info', 'auto', 'auto_info');
CREATE TYPE pjsip_timer_values AS ENUM ('forced', 'no', 'required', 'yes');
CREATE TYPE pjsip_cid_privacy_values AS ENUM ('allowed_not_screened', 'allowed_passed_screened', 'allowed_failed_screened', 'allowed', 'prohib_not_screened', 'prohib_passed_screened', 'prohib_failed_screened', 'prohib', 'unavailable');
CREATE TYPE pjsip_100rel_values AS ENUM ('no', 'required', 'yes');
CREATE TYPE pjsip_media_encryption_values AS ENUM ('no', 'sdes', 'dtls');
CREATE TYPE pjsip_t38udptl_ec_values AS ENUM ('none', 'fec', 'redundancy');
CREATE TYPE pjsip_dtls_setup_values AS ENUM ('active', 'passive', 'actpass');
CREATE TYPE pjsip_auth_type_values_v2 AS ENUM ('md5', 'userpass', 'google_oauth');
CREATE TYPE pjsip_redirect_method_values AS ENUM ('user', 'uri_core', 'uri_pjsip');
CREATE TYPE pjsip_transport_method_values AS ENUM ('default', 'unspecified', 'tlsv1', 'sslv2', 'sslv3', 'sslv23');
CREATE TYPE pjsip_transport_protocol_values_v2 AS ENUM ('udp', 'tcp', 'tls', 'ws', 'wss', 'flow');
CREATE TYPE ast_bool_values AS ENUM ('0', '1', 'off', 'on', 'false', 'true', 'no', 'yes');
CREATE TYPE sha_hash_values AS ENUM ('SHA-1', 'SHA-256');
CREATE TYPE pjsip_taskprocessor_overload_trigger_values AS ENUM ('none', 'global', 'pjsip_only');

-- Queue ENUMS
CREATE TYPE queue_autopause_values AS ENUM ('yes', 'no', 'all');
CREATE TYPE queue_strategy_values AS ENUM ('ringall', 'leastrecent', 'fewestcalls', 'random', 'rrmemory', 'linear', 'wrandom', 'rrordered');

-- MOH ENUMS
CREATE TYPE moh_mode_values AS ENUM ('custom', 'files', 'mp3nb', 'quietmp3nb', 'quietmp3', 'playlist');

-- IAX ENUMS
CREATE TYPE iax_requirecalltoken_values AS ENUM ('yes', 'no', 'auto');
CREATE TYPE iax_encryption_values AS ENUM ('yes', 'no', 'aes128');
CREATE TYPE iax_transfer_values AS ENUM ('yes', 'no', 'mediaonly');

-- ============================================
-- SECTION 6: ASTERISK PJSIP REALTIME
-- ============================================

-- Table ps_endpoints avec colonnes supplémentaires
CREATE TABLE IF NOT EXISTS ps_endpoints (
    id VARCHAR(40) NOT NULL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    display_name VARCHAR(40),
    transport VARCHAR(40),
    aors VARCHAR(200),
    auth VARCHAR(40),
    context VARCHAR(40),
    disallow VARCHAR(200),
    allow VARCHAR(200),
    direct_media yesno_values,
    connected_line_method pjsip_connected_line_method_values,
    direct_media_method pjsip_connected_line_method_values,
    direct_media_glare_mitigation pjsip_direct_media_glare_mitigation_values,
    disable_direct_media_on_nat yesno_values,
    dtmf_mode pjsip_dtmf_mode_values_v3,
    external_media_address VARCHAR(40),
    force_rport yesno_values,
    ice_support yesno_values,
    identify_by VARCHAR(80),
    mailboxes VARCHAR(40),
    moh_suggest VARCHAR(40),
    outbound_auth VARCHAR(40),
    outbound_proxy VARCHAR(40),
    rewrite_contact yesno_values,
    rtp_ipv6 yesno_values,
    rtp_symmetric yesno_values,
    send_diversion yesno_values,
    send_pai yesno_values,
    send_rpid yesno_values,
    timers_min_se INTEGER,
    timers pjsip_timer_values,
    timers_sess_expires INTEGER,
    callerid VARCHAR(40),
    callerid_privacy pjsip_cid_privacy_values,
    callerid_tag VARCHAR(40),
    "100rel" pjsip_100rel_values,
    aggregate_mwi yesno_values,
    trust_id_inbound yesno_values,
    trust_id_outbound yesno_values,
    use_ptime yesno_values,
    use_avpf yesno_values,
    media_encryption pjsip_media_encryption_values,
    inband_progress yesno_values,
    call_group VARCHAR(40),
    pickup_group VARCHAR(40),
    named_call_group VARCHAR(40),
    named_pickup_group VARCHAR(40),
    device_state_busy_at INTEGER,
    fax_detect yesno_values,
    t38_udptl yesno_values,
    t38_udptl_ec pjsip_t38udptl_ec_values,
    t38_udptl_maxdatagram INTEGER,
    t38_udptl_nat yesno_values,
    t38_udptl_ipv6 yesno_values,
    tone_zone VARCHAR(40),
    language VARCHAR(40),
    one_touch_recording yesno_values,
    record_on_feature VARCHAR(40),
    record_off_feature VARCHAR(40),
    rtp_engine VARCHAR(40),
    allow_transfer yesno_values,
    allow_subscribe yesno_values,
    sdp_owner VARCHAR(40),
    sdp_session VARCHAR(40),
    tos_audio VARCHAR(10),
    tos_video VARCHAR(10),
    cos_audio INTEGER,
    cos_video INTEGER,
    sub_min_expiry INTEGER,
    from_domain VARCHAR(40),
    from_user VARCHAR(40),
    mwi_from_user VARCHAR(40),
    dtls_verify VARCHAR(40),
    dtls_rekey VARCHAR(40),
    dtls_cert_file VARCHAR(200),
    dtls_private_key VARCHAR(200),
    dtls_cipher VARCHAR(200),
    dtls_ca_file VARCHAR(200),
    dtls_ca_path VARCHAR(200),
    dtls_setup pjsip_dtls_setup_values,
    srtp_tag_32 yesno_values,
    media_address VARCHAR(40),
    redirect_method pjsip_redirect_method_values,
    set_var TEXT,
    message_context VARCHAR(40),
    accountcode VARCHAR(80),
    user_eq_phone yesno_values,
    moh_passthrough yesno_values,
    media_encryption_optimistic yesno_values,
    rpid_immediate yesno_values,
    g726_non_standard yesno_values,
    rtp_keepalive INTEGER,
    rtp_timeout INTEGER,
    rtp_timeout_hold INTEGER,
    bind_rtp_to_media_address yesno_values,
    voicemail_extension VARCHAR(40),
    mwi_subscribe_replaces_unsolicited ast_bool_values,
    deny VARCHAR(95),
    permit VARCHAR(95),
    acl VARCHAR(40),
    contact_deny VARCHAR(95),
    contact_permit VARCHAR(95),
    contact_acl VARCHAR(40),
    subscribe_context VARCHAR(40),
    fax_detect_timeout INTEGER,
    contact_user VARCHAR(80),
    preferred_codec_only yesno_values,
    asymmetric_rtp_codec yesno_values,
    rtcp_mux yesno_values,
    allow_overlap yesno_values,
    refer_blind_progress yesno_values,
    notify_early_inuse_ringing yesno_values,
    max_audio_streams INTEGER,
    max_video_streams INTEGER,
    webrtc yesno_values,
    dtls_fingerprint sha_hash_values,
    incoming_mwi_mailbox VARCHAR(40),
    bundle yesno_values,
    dtls_auto_generate_cert yesno_values,
    follow_early_media_fork yesno_values,
    accept_multiple_sdp_answers yesno_values,
    suppress_q850_reason_headers yesno_values,
    trust_connected_line ast_bool_values,
    send_connected_line ast_bool_values,
    ignore_183_without_sdp ast_bool_values,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ps_endpoints_id ON ps_endpoints(id);
CREATE INDEX IF NOT EXISTS idx_ps_endpoints_tenant_id ON ps_endpoints(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ps_endpoints_display_name ON ps_endpoints(display_name);

-- Table ps_auths avec timestamps
CREATE TABLE IF NOT EXISTS ps_auths (
    id VARCHAR(40) NOT NULL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    auth_type pjsip_auth_type_values_v2,
    nonce_lifetime INTEGER,
    md5_cred VARCHAR(40),
    password VARCHAR(80),
    realm VARCHAR(40),
    username VARCHAR(40),
    refresh_token VARCHAR(255),
    oauth_clientid VARCHAR(255),
    oauth_secret VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ps_auths_id ON ps_auths(id);
CREATE INDEX IF NOT EXISTS idx_ps_auths_tenant_id ON ps_auths(tenant_id);

-- Table ps_aors avec timestamps
CREATE TABLE IF NOT EXISTS ps_aors (
    id VARCHAR(40) NOT NULL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    contact VARCHAR(255),
    default_expiration INTEGER,
    mailboxes VARCHAR(80),
    max_contacts INTEGER,
    minimum_expiration INTEGER,
    remove_existing yesno_values,
    qualify_frequency INTEGER,
    authenticate_qualify yesno_values,
    maximum_expiration INTEGER,
    outbound_proxy VARCHAR(40),
    support_path yesno_values,
    qualify_timeout FLOAT,
    voicemail_extension VARCHAR(40),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ps_aors_id ON ps_aors(id);
CREATE INDEX IF NOT EXISTS idx_ps_aors_tenant_id ON ps_aors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ps_aors_qualifyfreq_contact ON ps_aors(qualify_frequency, contact);

-- ============================================
-- SECTION 7: ASTERISK DIALPLAN REALTIME
-- ============================================

CREATE TABLE IF NOT EXISTS extensions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    context VARCHAR(40) NOT NULL,
    exten VARCHAR(40) NOT NULL,
    priority INTEGER NOT NULL,
    app VARCHAR(40) NOT NULL,
    appdata VARCHAR(256) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, context, exten, priority)
);

CREATE INDEX IF NOT EXISTS idx_extensions_tenant_id ON extensions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_extensions_context ON extensions(context);

-- ============================================
-- SECTION 8: ASTERISK QUEUES REALTIME
-- ============================================

CREATE TABLE IF NOT EXISTS queues (
    name VARCHAR(128) NOT NULL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    musiconhold VARCHAR(128),
    announce VARCHAR(128),
    context VARCHAR(128),
    timeout INTEGER,
    ringinuse yesno_values,
    setinterfacevar yesno_values,
    setqueuevar yesno_values,
    setqueueentryvar yesno_values,
    monitor_format VARCHAR(8),
    membermacro VARCHAR(512),
    membergosub VARCHAR(512),
    queue_youarenext VARCHAR(128),
    queue_thereare VARCHAR(128),
    queue_callswaiting VARCHAR(128),
    queue_quantity1 VARCHAR(128),
    queue_quantity2 VARCHAR(128),
    queue_holdtime VARCHAR(128),
    queue_minutes VARCHAR(128),
    queue_minute VARCHAR(128),
    queue_seconds VARCHAR(128),
    queue_thankyou VARCHAR(128),
    queue_callerannounce VARCHAR(128),
    queue_reporthold VARCHAR(128),
    announce_frequency INTEGER,
    announce_to_first_user yesno_values,
    min_announce_frequency INTEGER,
    announce_round_seconds INTEGER,
    announce_holdtime VARCHAR(128),
    announce_position VARCHAR(128),
    announce_position_limit INTEGER,
    periodic_announce VARCHAR(50),
    periodic_announce_frequency INTEGER,
    relative_periodic_announce yesno_values,
    random_periodic_announce yesno_values,
    retry INTEGER,
    wrapuptime INTEGER,
    penaltymemberslimit INTEGER,
    autofill yesno_values,
    monitor_type VARCHAR(128),
    autopause queue_autopause_values,
    autopausedelay INTEGER,
    autopausebusy yesno_values,
    autopauseunavail yesno_values,
    maxlen INTEGER,
    servicelevel INTEGER,
    strategy queue_strategy_values,
    joinempty VARCHAR(128),
    leavewhenempty VARCHAR(128),
    reportholdtime yesno_values,
    memberdelay INTEGER,
    weight INTEGER,
    timeoutrestart yesno_values,
    defaultrule VARCHAR(128),
    timeoutpriority VARCHAR(128)
);

CREATE INDEX IF NOT EXISTS idx_queues_tenant_id ON queues(tenant_id);

CREATE TABLE IF NOT EXISTS queue_members (
    uniqueid BIGSERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    queue_name VARCHAR(80) NOT NULL,
    interface VARCHAR(80) NOT NULL,
    membername VARCHAR(80),
    state_interface VARCHAR(80),
    penalty INTEGER,
    paused INTEGER,
    wrapuptime INTEGER,
    UNIQUE (queue_name, interface)
);

CREATE INDEX IF NOT EXISTS idx_queue_members_tenant_id ON queue_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_queue_members_queue_name ON queue_members(queue_name);

-- ============================================
-- SECTION 9: CDR (Call Detail Records)
-- ============================================

CREATE TABLE IF NOT EXISTS cdr (
    id BIGSERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    accountcode VARCHAR(80),
    src VARCHAR(80),
    dst VARCHAR(80),
    dcontext VARCHAR(80),
    clid VARCHAR(80),
    channel VARCHAR(80),
    dstchannel VARCHAR(80),
    lastapp VARCHAR(80),
    lastdata VARCHAR(80),
    calldate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    answerdate TIMESTAMP WITH TIME ZONE,
    enddate TIMESTAMP WITH TIME ZONE,
    duration INTEGER DEFAULT 0,
    billsec INTEGER DEFAULT 0,
    disposition VARCHAR(45),
    amaflags VARCHAR(45),
    uniqueid VARCHAR(150),
    userfield VARCHAR(255),
    peeraccount VARCHAR(80),
    linkedid VARCHAR(150),
    sequence INTEGER
);

CREATE INDEX IF NOT EXISTS idx_cdr_tenant_id ON cdr(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cdr_calldate ON cdr(calldate);
CREATE INDEX IF NOT EXISTS idx_cdr_uniqueid ON cdr(uniqueid);
CREATE INDEX IF NOT EXISTS idx_cdr_tenant_calldate ON cdr(tenant_id, calldate);

-- ============================================
-- SECTION 10: SYSTÈME IVR
-- ============================================

CREATE TABLE IF NOT EXISTS ivr_menus (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    welcome_sound VARCHAR(255) NOT NULL,
    invalid_sound VARCHAR(255),
    timeout_sound VARCHAR(255),
    timeout INTEGER DEFAULT 5,
    max_retries INTEGER DEFAULT 3,
    max_digits INTEGER DEFAULT 1,
    timeout_action JSONB NOT NULL,
    invalid_action JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ivr_menus_tenant_id ON ivr_menus(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ivr_menus_name ON ivr_menus(name);

CREATE TABLE IF NOT EXISTS ivr_options (
    id SERIAL PRIMARY KEY,
    menu_id INTEGER NOT NULL REFERENCES ivr_menus(id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    digit VARCHAR(1) NOT NULL,
    action JSONB NOT NULL,
    description VARCHAR(255),
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ivr_options_menu_id ON ivr_options(menu_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ivr_options_menu_digit
    ON ivr_options(menu_id, digit) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS ivr_conditions (
    id SERIAL PRIMARY KEY,
    menu_id INTEGER NOT NULL REFERENCES ivr_menus(id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    condition_type VARCHAR(50) NOT NULL,
    condition_config JSONB NOT NULL,
    action JSONB NOT NULL,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ivr_conditions_menu_id ON ivr_conditions(menu_id);

CREATE TABLE IF NOT EXISTS ivr_did_mappings (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    did VARCHAR(50) NOT NULL,
    menu_id INTEGER NOT NULL REFERENCES ivr_menus(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ivr_did_mappings_tenant_did
    ON ivr_did_mappings(tenant_id, did);
CREATE INDEX IF NOT EXISTS idx_ivr_did_mappings_menu_id ON ivr_did_mappings(menu_id);

CREATE TABLE IF NOT EXISTS ivr_audio_files (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500) NOT NULL,
    format VARCHAR(10) NOT NULL,
    duration FLOAT DEFAULT 0,
    language VARCHAR(10),
    filesize BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ivr_audio_files_tenant_id ON ivr_audio_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ivr_audio_files_language ON ivr_audio_files(language);

-- ============================================
-- SECTION 11: TRIGGERS AUTO-UPDATE
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour toutes les tables avec updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_contexts_updated_at BEFORE UPDATE ON tenant_contexts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_users_updated_at BEFORE UPDATE ON app_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ps_endpoints_updated_at BEFORE UPDATE ON ps_endpoints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ps_auths_updated_at BEFORE UPDATE ON ps_auths
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ps_aors_updated_at BEFORE UPDATE ON ps_aors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_extensions_updated_at BEFORE UPDATE ON extensions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ivr_menus_updated_at BEFORE UPDATE ON ivr_menus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SECTION 12: AUTRES TABLES ASTERISK (LEGACY)
-- ============================================

-- Tables ps_* supplémentaires (transport, contacts, etc.)
CREATE TABLE IF NOT EXISTS ps_contacts (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    uri VARCHAR(511),
    expiration_time BIGINT,
    qualify_frequency INTEGER,
    outbound_proxy VARCHAR(40),
    path TEXT,
    user_agent VARCHAR(255),
    qualify_timeout FLOAT,
    reg_server VARCHAR(20),
    authenticate_qualify yesno_values,
    via_addr VARCHAR(40),
    via_port INTEGER,
    call_id VARCHAR(255),
    endpoint VARCHAR(40),
    prune_on_boot yesno_values,
    UNIQUE (id, reg_server)
);

CREATE INDEX IF NOT EXISTS idx_ps_contacts_id ON ps_contacts(id);
CREATE INDEX IF NOT EXISTS idx_ps_contacts_qualifyfreq_exp ON ps_contacts(qualify_frequency, expiration_time);

CREATE TABLE IF NOT EXISTS ps_transports (
    id VARCHAR(40) NOT NULL PRIMARY KEY,
    async_operations INTEGER,
    bind VARCHAR(40),
    ca_list_file VARCHAR(200),
    cert_file VARCHAR(200),
    cipher VARCHAR(200),
    domain VARCHAR(40),
    external_media_address VARCHAR(40),
    external_signaling_address VARCHAR(40),
    external_signaling_port INTEGER,
    method pjsip_transport_method_values,
    local_net VARCHAR(40),
    password VARCHAR(40),
    priv_key_file VARCHAR(200),
    protocol pjsip_transport_protocol_values_v2,
    require_client_cert yesno_values,
    verify_client yesno_values,
    verify_server yesno_values,
    tos VARCHAR(10),
    cos INTEGER,
    allow_reload yesno_values,
    symmetric_transport yesno_values
);

CREATE INDEX IF NOT EXISTS idx_ps_transports_id ON ps_transports(id);

-- ============================================
-- SECTION 13: DONNÉES INITIALES
-- ============================================

-- Insérer version alembic
INSERT INTO alembic_version (version_num) VALUES ('unified_api_db_v1')
    ON CONFLICT (version_num) DO NOTHING;

-- Créer un utilisateur super admin par défaut (mot de passe: Admin123!)
-- Hash bcrypt de "Admin123!"
INSERT INTO app_users (username, email, password_hash, role, first_name, last_name, is_active)
VALUES (
    'admin',
    'admin@asterisk.local',
    '$2b$10$rGKqN3K8tCZXhYQXqJXPvuKN.jLZ7YN8XqH8Vl5xN3Y8K7L9M1Z2O',
    'SUPER_ADMIN',
    'System',
    'Administrator',
    true
) ON CONFLICT (username) DO NOTHING;

COMMIT;

-- ============================================
-- FIN DU SCRIPT D'INITIALISATION
-- ============================================
