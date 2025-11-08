FROM andrius/asterisk

# Switch to root to install packages
USER root

# Install PostgreSQL ODBC driver with specific version to avoid memory corruption
RUN apt-get update && \
    apt-get install -y odbc-postgresql unixodbc unixodbc-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copier le script d'initialisation
COPY asterisk-init.sh /usr/local/bin/asterisk-init.sh
RUN chmod +x /usr/local/bin/asterisk-init.sh

# Copier les scripts de gestion dynamique des contextes
COPY scripts/add-context.sh /usr/local/bin/add-context.sh
COPY scripts/remove-context.sh /usr/local/bin/remove-context.sh
RUN chmod +x /usr/local/bin/add-context.sh /usr/local/bin/remove-context.sh

# Créer les répertoires et définir les permissions
RUN mkdir -p /var/lib/asterisk/moh \
    /var/lib/asterisk/sounds/custom \
    /var/spool/asterisk/monitor && \
    chown -R asterisk:asterisk /var/lib/asterisk/moh \
    /var/lib/asterisk/sounds/custom \
    /var/spool/asterisk/monitor && \
    chmod 755 /var/lib/asterisk/moh \
    /var/lib/asterisk/sounds/custom \
    /var/spool/asterisk/monitor

# Switch back to the asterisk user (if the base image uses one)
USER asterisk

# The rest is inherited from the base image
