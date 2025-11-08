#!/bin/bash

##############################################################################
# Script: remove-context.sh
# Description: Supprime un contexte dynamiquement de extensions.conf
# Usage: ./remove-context.sh <context_name>
##############################################################################

set -e  # Exit on error

CONTEXT_NAME=$1
EXTENSIONS_CONF="/etc/asterisk/extensions.conf"
LOCK_FILE="/tmp/extensions.lock"
TEMP_FILE="/tmp/extensions.conf.tmp"

# Validation
if [ -z "$CONTEXT_NAME" ]; then
    echo "ERROR: Context name required" >&2
    echo "Usage: $0 <context_name>" >&2
    exit 1
fi

# Valider le format du nom de contexte
if ! [[ "$CONTEXT_NAME" =~ ^[a-zA-Z0-9_]+$ ]]; then
    echo "ERROR: Invalid context name. Only alphanumeric and underscore allowed" >&2
    exit 1
fi

# Acquérir un lock pour éviter les conflits d'écriture concurrente
(
    flock -x 200 || exit 1

    # Vérifier si le contexte existe
    if ! grep -q "^\[$CONTEXT_NAME\]" "$EXTENSIONS_CONF" 2>/dev/null; then
        echo "INFO: Context $CONTEXT_NAME not found in extensions.conf"
        exit 0
    fi

    # Supprimer le contexte et ses lignes
    # Méthode simple: supprimer le commentaire auto-generated, le [context] et la ligne switch
    sed -e "/^; Auto-generated context.*$/d" \
        -e "/^\[$CONTEXT_NAME\]$/d" \
        -e "/^\[$CONTEXT_NAME\]$/,/^switch => Realtime$/d" \
        "$EXTENSIONS_CONF" | grep -v "^$" | cat -s > "$TEMP_FILE" || true

    # Ajouter un newline à la fin si nécessaire
    echo "" >> "$TEMP_FILE"

    # Remplacer le fichier original
    mv "$TEMP_FILE" "$EXTENSIONS_CONF"

    echo "SUCCESS: Context $CONTEXT_NAME removed from extensions.conf"

) 200>"$LOCK_FILE"

# Recharger le dialplan dans Asterisk
if asterisk -rx "dialplan reload" > /dev/null 2>&1; then
    echo "SUCCESS: Asterisk dialplan reloaded"
else
    echo "WARNING: Failed to reload Asterisk dialplan (Asterisk may not be running)" >&2
fi

exit 0
