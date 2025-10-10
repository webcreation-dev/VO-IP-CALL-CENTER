FROM debian:bullseye

# Met à jour les paquets et installe les dépendances nécessaires
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    wget \
    ca-certificates \
    subversion \
    libjansson-dev \
    uuid-dev \
    libxml2-dev \
    libsqlite3-dev \
    pkg-config \
    libpq-dev \
    libedit-dev \
    libncurses-dev \
    sudo \
    curl \
    autoconf \
    libtool \
    && rm -rf /var/lib/apt/lists/*

# Variables d'environnement
ENV ASTERISK_VERSION=18.11.2

# Téléchargement et compilation d'Asterisk
WORKDIR /usr/src
RUN git clone -b ${ASTERISK_VERSION} https://github.com/asterisk/asterisk.git asterisk
WORKDIR /usr/src/asterisk

# Téléchargement des sons de base pour Asterisk
RUN contrib/scripts/get_mp3_source.sh

# Prépare la compilation
RUN ./configure

# Active les modules nécessaires
RUN make menuselect.makeopts
RUN menuselect/menuselect --enable res_config_pgsql menuselect.makeopts

# Compile et installe Asterisk
RUN make -j$(nproc) && make install && make samples && make config

# Crée les répertoires nécessaires
RUN mkdir -p /var/run/asterisk \
    /var/log/asterisk \
    /var/lib/asterisk \
    /var/spool/asterisk

# Donne les permissions appropriées
RUN chown -R asterisk:asterisk /var/run/asterisk \
    /var/log/asterisk \
    /var/lib/asterisk \
    /var/spool/asterisk \
    /etc/asterisk

# Nettoyage
RUN rm -rf /usr/src/asterisk

# Ports exposés
EXPOSE 5038/tcp
EXPOSE 5060/udp
EXPOSE 5060/tcp
EXPOSE 10000-20000/udp

# Script de démarrage
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["/usr/sbin/asterisk", "-f", "-vvv"]