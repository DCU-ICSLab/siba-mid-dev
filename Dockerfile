FROM arm32v7/node:8
MAINTAINER sencom1028@gmail.com

#&& chown -R node:node /home/node/app

#explicit set work dir
RUN mkdir -p /home/node/app/node_modules
WORKDIR /home/node/app


#copy package.json && package-lock.json
COPY package*.json ./

#switch user to node
USER root

#install package, lib when boot start
ADD ./sh-scripts/boot-st.sh /boot-st.sh
RUN chmod +x /boot-st.sh
RUN /boot-st.sh

COPY --chown=node:node . .

EXPOSE 3000

#mariadb healthcheck
ADD ./sh-scripts/healthcheck.sh /healthcheck.sh
RUN chmod +x /healthcheck.sh

CMD /healthcheck.sh && npm start
