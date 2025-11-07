-- Vérifications SQL - Module CONTEXTS

-- 1. Liste tous les contexts
SELECT id, "tenantId", name, description, "isPrimary", "createdAt"
FROM tenant_contexts
ORDER BY id DESC
LIMIT 20;

-- 2. Contexts par tenant
SELECT
    t.id as tenant_id,
    t.name as tenant_name,
    COUNT(tc.id) as context_count
FROM tenants t
LEFT JOIN tenant_contexts tc ON t.id = tc."tenantId"
GROUP BY t.id, t.name
ORDER BY t.id DESC;

-- 3. Vérifier les contexts créés récemment
SELECT * FROM tenant_contexts
WHERE "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC;
