#!/bin/bash
green=`tput setaf 2`
reset=`tput sgr0`
echo "${green}Remove all Validator containers and pruning volumes... ${reset}"
docker-compose down -v --remove-orphans && docker-compose rm -fvs
echo "${green}Starting Docker Containers...${reset}"
docker-compose up -d
echo "${green}Waiting for Prisma to be ready... ${reset}"
sleep 25
echo "${green}Deploying schema to fresh DB... ${reset}"
prisma deploy
echo "${green}Done! The database is ready to be populated. ${reset}"
echo "${green}Run setupDbOptimizations.js to improve db performance.${reset}"