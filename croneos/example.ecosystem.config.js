module.exports = {
  apps : [
    {
      name: 'croneosMiner',
      script: 'croneosMiner.js',
      args: '',
      restart_delay: 0,
    },
    {
      name: 'croneosClaim',
      script: 'croneosClaim.js',
      args: '',
      restart_delay: 86400000,
    }
  ]
}
