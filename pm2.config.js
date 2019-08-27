module.exports = {
  apps : [{
    name: 'cron1',
    script: 'cron/runCronGroup.js',
    args: '1',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '4G'
  }]
};
