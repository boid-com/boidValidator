const jobGroups = require('./jobGroups.json')
const cron = require('./cron.js')
const logger = require('logging').default('runCronGroup')
const ms = require('human-interval')
const sleep = ms => new Promise(res => setTimeout(res, ms))

async function init(){
  var thisGroup = {}
  if (process.argv[2]){
    thisGroup = jobGroups.find(el => el.group == process.argv[2])
    try {
      const jobs = thisGroup.jobs
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
    return thisGroup
  }
  return thisGroup

}

init().then(async (thisGroup)=>{
  logger.info('===========')
  logger.info('finished cron cycle:',thisGroup.group, new Date().toDateString())
  logger.info('jobs in this group:',thisGroup.jobs)
  logger.info('sleeping:',thisGroup.sleep)
  logger.info('===========')
  await sleep(ms(thisGroup.sleep))
})