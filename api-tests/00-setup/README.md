# Setup - Authentification JWT

Ce dossier contient les scripts nécessaires pour s'authentifier auprès de l'API.

## Script get-token.sh

Obtient un token JWT pour accéder aux endpoints protégés de l'API.

### Utilisation

```bash
# Utiliser les credentials par défaut
./get-token.sh

# Ou avec des credentials personnalisés
EMAIL="admin@asterisk.local" PASSWORD="Admin@2025" ./get-token.sh
```

### Variables d'environnement

- `API_URL` : URL de l'API (défaut: `http://localhost:3001/api/v1`)
- `EMAIL` : Email de l'utilisateur (défaut: `admin@asterisk.local`)
- `PASSWORD` : Mot de passe (défaut: `Admin@2025`)

### Sortie

Le script exporte le token dans la variable `$TOKEN` et crée un fichier `/tmp/asterisk-api-token.sh` que vous pouvez sourcer dans d'autres scripts.

### Exemple d'utilisation dans un autre script

```bash
#!/bin/bash

# Obtenir le token
source ./00-setup/get-token.sh

# Utiliser le token pour faire des requêtes
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/tenants
```

### Exemple de sourcing

```bash
# Dans votre script
source /tmp/asterisk-api-token.sh

# Maintenant $TOKEN est disponible
echo "Token: $TOKEN"
```

## Credentials par défaut

Les credentials par défaut sont définis dans `api-tests/00-CREDENTIALS.txt` :

- Email: `admin@asterisk.local`
- Password: `Admin@2025`
- Role: `SUPER_ADMIN`
