#!/bin/bash
green=`tput setaf 2`
reset=`tput sgr0`
echo "${green}Deleting local DB... ${reset}"
docker-compose rm -fvs && docker volume prune --force 
echo "${green}Starting Prisma...${reset}"
docker-compose up -d
echo "${green}Waiting for Prisma to be ready... ${reset}"
sleep 30
echo "${green}Deploying schema to fresh DB... ${reset}"
prisma deploy
echo "${green}Done! The database is ready to be populated. ${reset}"