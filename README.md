# boidValidator
This is the backend code that Boid Validator nodes can run to reach consensus on Boid Power contributions. During the alpha the Validators are only responsible for retrieving parsing and reporting Boid Power ratings for Boid Devices on the Boid Network. Over time the responsibilities of Boid Validator nodes will expand to include other responsibilities.

## Validator Alpha
During the Alpha phase the Boid Validator program is invite-only. Learn more about how to join [here](https://community.boid.com/t/boid-economic-proposal/87). Eventually any person or group will be able to stake BOID and participate as a validator node and receive part of the validator rewards pool. 
## Getting Started
**OS**

This software can run on any OS that supports Docker and Nodejs. Currently it has only been tested on MacOS and Ubuntu 18. Ubuntu is recommended for compatibility and reliability. These instructions are for Ubuntu.

**Install Prerequisites**

[Nodejs](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-18-04)
```
sudo apt update -y
curl -sL https://deb.nodesource.com/setup_10.x -o nodesource_setup.sh
sudo bash nodesource_setup.sh
sudo apt install nodejs build-essential -y
```
[Docker](https://docs.docker.com/install/) &
[Compose](https://docs.docker.com/compose/install/)
```
sudo wget -qO- https://get.docker.com/ | sh
sudo curl -L "https://github.com/docker/compose/releases/download/1.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

Network time protocol is essential for accurate validation
```
sudo apt install ntp
```

Prisma & PM2
```
sudo npm i -g prisma pm2
```

**Initial Setup**

Clone this repository and enter the directory
```
git clone https://github.com/Boid-John/boidValidator.git
cd boidValidator
```
Install NPM dependencies
```
npm i
```
Setup the docker-compose file
```
cp ./util/example.docker-compose.yml ./docker-compose.yml 
```
Setup Docker Containers
```
docker-compose up -d
```
Deploy Prisma Schema: This prepares the database to store validator data.
```
prisma deploy
```
Prepare the .env.json and ecosystem.config.js files.
```
cp ./util/example.ecosystem.config.js ./ecosystem.config.js
cp ./util/example.env.json .env.json
```
Modify the .env.json file using any text editor. The changes you want to make are:
- Provide your validator EOS account name, key, and permission name. Do not use your active or owner permission. Register a special permission on the EOS account that will be uses for validation. Follow these [instructions](https://docs.google.com/document/d/1FQTHG-oEiWirHrzuTf8BRf2OJPdLCrVbVDmfB8YQwiU/edit).
- Enter the wcg api key: will be provided in the private telegram group


Setup pm2 to run the cron tasks continuously.
```
pm2 start
```
View the tasks progress (ctrl-c to exit)
```
pm2 logs
```
Save the task so it will automatically start on a reboot
```
pm2 save
sudo pm2 startup
```

PM2 will now daemonize the tasks and run it in the background. When the task crashes or finishes running, PM2 will automatically restart it. So long as your tasks are running without any major errors, your node should easily be able to download data and make accurate Boid Power reports multiple times each round. 
 
## Reference

### jobgroups.json
This Json is an array of groups. The jobs are in the /cron/jobs folder. Jobs in a group are run sequentially, but you can run multiple groups in parallel to customize and optimize your validator node jobs.


### Setup Croneos
View the readme in the croneos folder for more instructions.

### Performance tweaks


**postgres DB improvements:**

Setup indexes to improve query speed. 
```
node ./util/setupDbOptimizations.js
```


### Utility functions

Sometimes during testing you want to easily reset your database. I have included a simple script to do this. This will remove all data from your local database and reset it just like new. 

```
sudo sh ./util/resetAll.sh
```


### Join the Validators community
https://community.boid.com/c/validators
