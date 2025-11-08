#!/bin/bash

##############################################################################
# Script: add-context.sh
# Description: Ajoute un contexte dynamiquement dans extensions.conf
# Usage: ./add-context.sh <context_name>
##############################################################################

set -e  # Exit on error

CONTEXT_NAME=$1
EXTENSIONS_CONF="/etc/asterisk/extensions.conf"
LOCK_FILE="/tmp/extensions.lock"

# Validation
if [ -z "$CONTEXT_NAME" ]; then
    echo "ERROR: Context name required" >&2
    echo "Usage: $0 <context_name>" >&2
    exit 1
fi

# Valider le format du nom de contexte (alphanumeric + underscore)
if ! [[ "$CONTEXT_NAME" =~ ^[a-zA-Z0-9_]+$ ]]; then
    echo "ERROR: Invalid context name. Only alphanumeric and underscore allowed" >&2
    exit 1
fi

# Acquérir un lock pour éviter les conflits d'écriture concurrente
(
    flock -x 200 || exit 1

    # Vérifier si le contexte existe déjà
    if grep -q "^\[$CONTEXT_NAME\]" "$EXTENSIONS_CONF" 2>/dev/null; then
        echo "INFO: Context $CONTEXT_NAME already exists in extensions.conf"
        exit 0
    fi

    # Ajouter le contexte à la fin du fichier
    cat >> "$EXTENSIONS_CONF" << EOF

; Auto-generated context for tenant - Added $(date)
[$CONTEXT_NAME]
switch => Realtime
EOF

    echo "SUCCESS: Context $CONTEXT_NAME added to extensions.conf"

) 200>"$LOCK_FILE"

# Recharger le dialplan dans Asterisk
if asterisk -rx "dialplan reload" > /dev/null 2>&1; then
    echo "SUCCESS: Asterisk dialplan reloaded"
else
    echo "WARNING: Failed to reload Asterisk dialplan (Asterisk may not be running)" >&2
fi

exit 0
