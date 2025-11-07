-- ============================================================================
-- Requêtes SQL de vérification - Module TENANTS
-- À exécuter sur le VPS avec PostgreSQL
-- ============================================================================

-- Connexion :
-- PGPASSWORD='ApiSecurePass2025!' psql -h localhost -U api_user -d asterisk_api

-- ============================================================================
-- 1. Vérifier tous les tenants créés
-- ============================================================================

SELECT
    id,
    name,
    domain,
    timezone,
    language,
    "maxAgents",
    "maxQueues",
    "isActive",
    "deletedAt",
    "createdAt",
    "updatedAt"
FROM tenants
ORDER BY id DESC
LIMIT 10;

-- ============================================================================
-- 2. Compter le nombre de tenants actifs
-- ============================================================================

SELECT
    COUNT(*) as total_tenants,
    COUNT(CASE WHEN "isActive" = true THEN 1 END) as active_tenants,
    COUNT(CASE WHEN "isActive" = false THEN 1 END) as inactive_tenants,
    COUNT(CASE WHEN "deletedAt" IS NOT NULL THEN 1 END) as deleted_tenants
FROM tenants;

-- ============================================================================
-- 3. Vérifier le tenant créé lors des tests (derniers tenants)
-- ============================================================================

SELECT
    t.id,
    t.name,
    t.domain,
    t."isActive",
    t."deletedAt",
    COUNT(DISTINCT tc.id) as context_count,
    COUNT(DISTINCT e.id) as endpoint_count,
    COUNT(DISTINCT q.id) as queue_count
FROM tenants t
LEFT JOIN tenant_contexts tc ON t.id = tc."tenantId"
LEFT JOIN ps_endpoints e ON e.id LIKE CONCAT('t', t.id, '_%')
LEFT JOIN queues q ON q.name LIKE CONCAT('t', t.id, '_%')
WHERE t."createdAt" > NOW() - INTERVAL '1 hour'
GROUP BY t.id, t.name, t.domain, t."isActive", t."deletedAt"
ORDER BY t."createdAt" DESC;

-- ============================================================================
-- 4. Vérifier les ressources associées à un tenant spécifique
-- Remplacez {TENANT_ID} par l'ID du tenant que vous venez de créer
-- ============================================================================

\echo 'Pour vérifier un tenant spécifique, remplacez {TENANT_ID} par l''ID réel'

-- SELECT
--     'Tenant' as resource_type,
--     t.name as resource_name,
--     t.id::text as resource_id,
--     t."createdAt" as created
-- FROM tenants t
-- WHERE t.id = {TENANT_ID}
--
-- UNION ALL
--
-- SELECT
--     'Context' as resource_type,
--     tc.name as resource_name,
--     tc.id::text as resource_id,
--     tc."createdAt" as created
-- FROM tenant_contexts tc
-- WHERE tc."tenantId" = {TENANT_ID}
--
-- UNION ALL
--
-- SELECT
--     'Endpoint' as resource_type,
--     e.id as resource_name,
--     e.id::text as resource_id,
--     e.created_at as created
-- FROM ps_endpoints e
-- WHERE e.id LIKE CONCAT('t', {TENANT_ID}, '_%')
--
-- UNION ALL
--
-- SELECT
--     'Queue' as resource_type,
--     q.name as resource_name,
--     q.id::text as resource_id,
--     q.created_at as created
-- FROM queues q
-- WHERE q.name LIKE CONCAT('t', {TENANT_ID}, '_%')
--
-- ORDER BY created DESC;

-- ============================================================================
-- 5. Vérifier les endpoints PJSIP créés pour les tenants
-- ============================================================================

SELECT
    SUBSTRING(id FROM '^t(\d+)_') as tenant_id,
    id as endpoint_id,
    transport,
    aors,
    auth,
    context,
    created_at
FROM ps_endpoints
WHERE id LIKE 't%_%'
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- 6. Vérifier les queues créées pour les tenants
-- ============================================================================

SELECT
    SUBSTRING(name FROM '^t(\d+)_') as tenant_id,
    name as queue_name,
    strategy,
    timeout,
    "maxLen",
    created_at
FROM queues
WHERE name LIKE 't%_%'
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- 7. Statistiques globales par tenant
-- ============================================================================

SELECT
    t.id,
    t.name,
    t."isActive",
    COUNT(DISTINCT tc.id) as contexts,
    COUNT(DISTINCT e.id) as endpoints,
    COUNT(DISTINCT q.id) as queues,
    COUNT(DISTINCT qm.id) as queue_members
FROM tenants t
LEFT JOIN tenant_contexts tc ON t.id = tc."tenantId"
LEFT JOIN ps_endpoints e ON e.id LIKE CONCAT('t', t.id, '_%')
LEFT JOIN queues q ON q.name LIKE CONCAT('t', t.id, '_%')
LEFT JOIN queue_members qm ON qm.queue_name LIKE CONCAT('t', t.id, '_%')
GROUP BY t.id, t.name, t."isActive"
ORDER BY t.id DESC
LIMIT 10;

-- ============================================================================
-- 8. Vérifier les tenants récemment supprimés (soft delete)
-- ============================================================================

SELECT
    id,
    name,
    domain,
    "deletedAt",
    "isActive",
    EXTRACT(EPOCH FROM (NOW() - "deletedAt")) / 60 as minutes_since_deletion
FROM tenants
WHERE "deletedAt" IS NOT NULL
ORDER BY "deletedAt" DESC
LIMIT 10;

-- ============================================================================
-- 9. Vérifier l'intégrité des données (orphelins)
-- ============================================================================

-- Contexts sans tenant
SELECT tc.*
FROM tenant_contexts tc
LEFT JOIN tenants t ON tc."tenantId" = t.id
WHERE t.id IS NULL;

-- Endpoints dont le tenant n'existe plus
SELECT e.id, e.created_at
FROM ps_endpoints e
WHERE e.id LIKE 't%_%'
  AND NOT EXISTS (
    SELECT 1 FROM tenants t
    WHERE e.id LIKE CONCAT('t', t.id, '_%')
  )
ORDER BY e.created_at DESC
LIMIT 10;

-- Queues dont le tenant n'existe plus
SELECT q.name, q.created_at
FROM queues q
WHERE q.name LIKE 't%_%'
  AND NOT EXISTS (
    SELECT 1 FROM tenants t
    WHERE q.name LIKE CONCAT('t', t.id, '_%')
  )
ORDER BY q.created_at DESC
LIMIT 10;

-- ============================================================================
-- 10. Requête de nettoyage (OPTIONNEL - À utiliser avec précaution)
-- ============================================================================

\echo 'ATTENTION : Les requêtes de nettoyage sont commentées pour éviter les suppressions accidentelles'

-- Supprimer les tenants de test créés il y a plus de 24h
-- DELETE FROM tenants
-- WHERE name LIKE '%Test Tenant%'
--   AND "createdAt" < NOW() - INTERVAL '24 hours';

-- ============================================================================
-- FIN DES VÉRIFICATIONS
-- ============================================================================
