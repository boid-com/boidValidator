module.exports = {
  apps : [
    {
      name: 'cronGroup-1',
      script: 'cron/runCronGroup.js',
      args: '1',
      restart_delay: 12000,
      autorestart:false,
      cron_restart:'15 */6 * * *'
    },
    {
      name: 'getBoincWork',
      script: 'cron/runSingleCron.js',
      args: 'getBoincWork',
      restart_delay: 300000,
    },
    {
      name: 'getRvnWork',
      script: 'cron/runSingleCron.js',
      args: 'getRvnWork',
      restart_delay:600000,
    },
    {
      name: 'rpcProxyServer',
      script: 'server/rpcProxy.js',
      args: null,
      restart_delay:0,
    }
  ]
}
