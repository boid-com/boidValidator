# boidValidator
This is the backend code that Boid Validator nodes can run to reach consensus on Boid Power contributions. During the alpha the Validators are only responsible for retreiving parsing and reporting Boid Power ratings for Boid Devices on the Boid Network. Over time the responsibilities of Boid Validator nodes will expand to include other responsibilities.

## Validator Alpha
During the Alpha phase the Boid Validator program is invite-only. Learn more about how to join [here](https://community.boid.com/t/boid-economic-proposal/87). Eventually any person or group will be able to stake BOID and participate as a validator node and receive part of the validator rewards pool. 
## Getting Started
**OS**

This software can run on any OS that supports Docker and Nodejs. Currently it has only been tested on MacOS and Ubuntu 18. Ubuntu is recommended for compatibility and reliability. These instructions are for Ubuntu.

**Install Prerequsites**

[Nodejs](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-18-04)
```
sudo apt update -y
curl -sL https://deb.nodesource.com/setup_10.x -o nodesource_setup.sh
sudo bash nodesource_setup.sh
sudo apt install nodejs build-essential -y
```
[Docker](https://docs.docker.com/install/) &
[Compose](https://docs.docker.com/compose/install/)

Quick install:
```
sudo wget -qO- https://get.docker.com/ | sh
sudo curl -L "https://github.com/docker/compose/releases/download/1.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

Prisma
```
npm i -g prisma
```
PM2
```
npm i -g pm2
```

**Initial Setup**

Clone this repository and enter the directory
```
git clone git@github.com:Boid-John/boidValidator.git
cd boidValidator
```
Install NPM dependencies
```
npm i
```
Setup Docker Containers
```
docker-compose up -d
```




