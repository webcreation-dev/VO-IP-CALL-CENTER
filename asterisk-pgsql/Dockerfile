FROM andrius/asterisk

# Switch to root to install packages
USER root

# Install PostgreSQL ODBC driver and build dependencies for codecs
RUN apt-get update && \
    apt-get install -y odbc-postgresql build-essential uuid-dev libjansson-dev libxml2-dev libsqlite3-dev wget subversion

# Download, compile, and install Asterisk codecs (including Opus)
RUN cd /usr/src && \
    wget -O - https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-22-current.tar.gz | tar xz && \
    cd asterisk-22.*/ && \
    ./contrib/scripts/get_mp3_source.sh && \
    ./configure && \
    make menuselect.makeopts && \
    menuselect/menuselect --enable format_opus menuselect.makeopts && \
    make && \
    make install

# Clean up build files
RUN rm -rf /usr/src/asterisk*

# Switch back to the asterisk user (if the base image uses one)
USER asterisk

# The rest is inherited from the base image

