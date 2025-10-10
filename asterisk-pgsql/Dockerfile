FROM andrius/asterisk

# Install PostgreSQL ODBC driver
RUN apt-get update && \
    apt-get install -y odbc-postgresql && \
    rm -rf /var/lib/apt/lists/*

# The rest is inherited from the base image

