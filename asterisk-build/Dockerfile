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

# Téléchargement des sons de base pour Asterisk (optionnel mais recommandé)
RUN contrib/scripts/get_mp3_source.sh

# Prépare la compilation
RUN ./configure

# Active le module res_config_pgsql
RUN make menuselect.makeopts
RUN menuselect/menuselect --enable res_config_pgsql menuselect.makeopts

# Compile et installe Asterisk
RUN make -j$(nproc) && make install && make samples && make config

# Nettoyage
RUN rm -rf /usr/src/asterisk

# Ports exposés
EXPOSE 5038/tcp
EXPOSE 5060/udp
EXPOSE 5060/tcp
EXPOSE 10000-20000/udp

# Lance Asterisk en mode foreground
CMD ["/usr/sbin/asterisk", "-f", "-vvv"]