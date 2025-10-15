FROM andrius/asterisk

# Switch to root to install packages
USER root

# Install PostgreSQL ODBC driver and Opus codec translator
RUN apt-get update && \
    apt-get install -y odbc-postgresql asterisk-modules && \
    rm -rf /var/lib/apt/lists/*

# Switch back to the asterisk user (if the base image uses one)
USER asterisk

# The rest is inherited from the base image

