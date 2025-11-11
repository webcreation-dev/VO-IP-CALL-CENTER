#!/bin/bash

##############################################################################
# Script de vérification automatique IVR
# Usage: ./auto-verify-ivr.sh TENANT_ID
# Vérifie automatiquement la configuration Asterisk pour l'IVR
##############################################################################

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Vérifier le paramètre
if [ -z "$1" ]; then
    echo -e "${RED}❌ ERREUR: TENANT_ID requis${NC}"
    echo "Usage: ./auto-verify-ivr.sh TENANT_ID"
    exit 1
fi

TENANT_ID=$1

# Compteurs de résultats
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Fonction pour vérifier une commande
check() {
    local name="$1"
    local command="$2"
    local expected_pattern="$3"

    ((TOTAL_CHECKS++))

    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Vérification: $name${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Exécuter la commande
    OUTPUT=$(eval "$command" 2>&1)

    # Vérifier le pattern
    if echo "$OUTPUT" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✅ SUCCESS${NC} - $name"
        ((PASSED_CHECKS++))
        if [ ! -z "$OUTPUT" ]; then
            echo -e "${YELLOW}Résultat:${NC}"
            echo "$OUTPUT" | head -10
        fi
    else
        echo -e "${RED}❌ FAILED${NC} - $name"
        ((FAILED_CHECKS++))
        echo -e "${RED}Pattern attendu non trouvé: '$expected_pattern'${NC}"
        if [ ! -z "$OUTPUT" ]; then
            echo -e "${YELLOW}Sortie complète:${NC}"
            echo "$OUTPUT"
        fi
    fi
}

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║   VÉRIFICATION AUTOMATIQUE IVR - TENANT $TENANT_ID"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

##############################################################################
# CHECK 1: Vérifier que Docker Asterisk tourne
##############################################################################
check "Docker Asterisk actif" \
    "docker ps --filter name=asterisk --format '{{.Status}}'" \
    "Up"

##############################################################################
# CHECK 2: Vérifier les queues
##############################################################################
check "Queue 't${TENANT_ID}_sales' existe" \
    "docker exec asterisk asterisk -rx 'queue show' 2>/dev/null" \
    "t${TENANT_ID}_sales"

##############################################################################
# CHECK 3: Vérifier Stasis App IVR
##############################################################################
check "Stasis App 'ivr-app' active" \
    "docker exec asterisk asterisk -rx 'stasis show apps' 2>/dev/null" \
    "ivr-app"

##############################################################################
# CHECK 4: Vérifier le contexte du tenant
##############################################################################
check "Contexte 't${TENANT_ID}_default' existe" \
    "docker exec asterisk asterisk -rx 'dialplan show t${TENANT_ID}_default' 2>/dev/null" \
    "t${TENANT_ID}_default"

##############################################################################
# CHECK 5: Vérifier ARI HTTP
##############################################################################
check "ARI HTTP actif" \
    "docker exec asterisk asterisk -rx 'http show status' 2>/dev/null" \
    "Enabled"

##############################################################################
# CHECK 6: Vérifier transport WSS (WebRTC)
##############################################################################
check "Transport WSS configuré" \
    "docker exec asterisk asterisk -rx 'pjsip show transports' 2>/dev/null" \
    "transport-wss"

##############################################################################
# CHECK 7: Vérifier users ARI
##############################################################################
check "Users ARI configurés" \
    "docker exec asterisk asterisk -rx 'ari show users' 2>/dev/null" \
    "asterisk"

##############################################################################
# CHECK 8: Vérifier API Docker active
##############################################################################
check "API Docker active" \
    "docker ps --filter name=asterisk-api --format '{{.Status}}'" \
    "Up"

##############################################################################
# CHECK 9: Vérifier que l'API répond
##############################################################################
check "API répond sur port 3001" \
    "curl -s http://localhost:3001/api/v1/health || echo 'UNREACHABLE'" \
    "ok"

##############################################################################
# RÉSUMÉ FINAL
##############################################################################
echo ""
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                  RÉSUMÉ VÉRIFICATION                  ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "Total vérifications: $TOTAL_CHECKS"
echo -e "${GREEN}✅ Réussies: $PASSED_CHECKS${NC}"

if [ $FAILED_CHECKS -gt 0 ]; then
    echo -e "${RED}❌ Échouées: $FAILED_CHECKS${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Des problèmes ont été détectés${NC}"
    echo ""
    echo "Actions recommandées:"
    echo "  1. Vérifiez les logs Asterisk: docker logs asterisk"
    echo "  2. Vérifiez les logs API: docker logs asterisk-api-v2"
    echo "  3. Relancez les containers: docker-compose restart"
    echo ""
    exit 1
else
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ TOUTES LES VÉRIFICATIONS SONT PASSÉES ✅  ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════╝${NC}"
    echo ""
    echo "🎉 Votre système IVR est opérationnel!"
    echo ""
    echo "🔍 Prochaines étapes:"
    echo "  1. Créer un endpoint WebRTC:"
    echo "     ./setup-webrtc-endpoint.sh \"TOKEN\" $TENANT_ID 200"
    echo ""
    echo "  2. Enregistrer un softphone avec les credentials"
    echo ""
    echo "  3. Appeler le DID: +33123456789"
    echo ""
    echo "  4. Tester les options IVR (touches 1 et 2)"
    echo ""
    exit 0
fi
