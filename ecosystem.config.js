module.exports = {
  apps : [
    {
      name: 'cron1',
      script: 'cron/runCronGroup.js',
      args: '1',
      autorestart: true,
      max_memory_restart: '4G'
    },
    {
      name: 'getBoincWork',
      script: 'cron/runSingleCron.js',
      args: 'getBoincWork',
      max_memory_restart: '4G'
    },
    {
      name: 'getRvnWork',
      script: 'cron/runSingleCron.js',
      args: 'getRvnWork',
      max_memory_restart: '4G'
    }
  ]
}
