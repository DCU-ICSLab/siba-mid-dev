#!/bin/sh

set -e

MYSQL_HOST="127.0.0.1"
MYSQL_PORT="3306"
MYSQL_USERNAME="user"
MYSQL_PASSWORD="user"

#looping max count
maxcounter=45

#looping check variable
couter=1

while ! mysql --protocol TCP -h "$MYSQL_HOST" -u "$MYSQL_USERNAME" -p"$MYSQL_PASSWORD" -e "show databases;" > /dev/null 2>&1; do
  >&2 echo "mariadb is unavailable - SLEEPING"
  sleep 1
  counter=`expr $counter + 1`
  if [ $counter -gt $maxcounter ]; then
    >&2 echo "waiting maraidb FAILED"
    exit 1
  fi;
done

>&2 echo "mariadb is up - EXECUTING COMMAND"
exec $cmd
