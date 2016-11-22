#!/bin/bash

## Set to non-interactive
export DEBIAN_FRONTEND=noninteractive

## Get latest NodeJS Version
echo "> Adding node debian source to box..."
curl -sL https://deb.nodesource.com/setup_4.x | bash -
echo "> Installing nodejs and mysql server..."
apt-get install -q -y nodejs

## Prepare mocha for test
echo "> Installing mocha and istanbul..."
npm install -g -q mocha istanbul

## Prepare directory for test
echo "> Installing local dependencies..."
cd /vagrant
npm install -q --only=dev 

echo "> Done. Now you can vagrant ssh to access the box and run \
npm test in /vagrant folder."
