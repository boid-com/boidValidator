# Croneos
Your validator can grab jobs and run them. You will receive payment in the form of gas fees. You can run croneos in parallel with the other boid validator tasks.

# Setup
Copy the example config to customize your own.
```
cd croneos
cp ./example.miner_config.json ./miner_config.json
cp ./example.ecosystem.config ./ecosystem.config

```
Modify the config file by filling in your private key, account name and permission. You can use the same account/permissions as your validator or it could be a different account.

You can also customize your minimum gas fee and interval parameters.

**min_cpu_us** is the minium (in microseconds) amount of CPU you would like to maintain on the account. If your available CPU dips below this number then the miner will pause and wait for CPU to be restored. This is a good option to ensure that you retain enough CPU to make power reports.

```
pm2 start
```
This will start the croneos miner and reward claim jobs. By default the claim job will run once per day to claim your gas fee rewards.
