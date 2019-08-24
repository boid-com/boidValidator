const jobGroups = require('./jobGroups.json')
const cron = require('./cron.js')
const logger = require('logging').default('runCronGroup')

async function init(){
  if (process.argv[2]){
    try {
      const jobs = jobGroups.find(el => el.group == process.argv[2]).jobs
      for (job of jobs){
        const result = await cron.run(job).catch(logger.error)
        if (result) logger.info(result)
        else logger.error("there was an error!")
      }
    } catch (error) {
      logger.error(error)
    }
  } else {
    logger.error('Please specify a cron group to run.')
  }

}

init().then(async ()=>{
  logger.info('finished cron cycle:', new Date().toDateString())
})