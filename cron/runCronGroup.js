const jobGroups = require('./jobGroups.json')
const cron = require('./cron.js')
const logger = require('logging').default('runCronGroup')
const ms = require('human-interval')
const sleep = ms => new Promise(res => setTimeout(res, ms))
function time (millis) {
  var minutes = Math.floor(millis / 60000)
  var seconds = ((millis % 60000) / 1000).toFixed(0)
  return minutes + ':' + (seconds < 10 ? '0' : '') + seconds
}
async function init () {
  var thisGroup = {}
  const startTime = Date.now()

  if (process.argv[2]) {
    try {
      thisGroup = jobGroups.find(el => el.group == process.argv[2])
      const jobs = thisGroup.jobs
      logger.info('===========')
      logger.info('Starting cron cycle:', thisGroup.group, new Date().toLocaleString())
      logger.info('jobs in this group:', thisGroup.jobs)
      logger.info('===========')
      for (job of jobs) {
        const result = await cron.run(job).catch(logger.error)
        if (result) logger.info(result)
        else logger.error('there was an error!')
      }
    } catch (error) {
      logger.error(error)
    }
  } else {
    logger.error('Please specify a cron group to run.')
    return thisGroup
  }
  const finishTime = Date.now()
  const runTime = finishTime - startTime
  logger.info('===========')
  logger.info('finished cron cycle:', thisGroup.group, new Date().toLocaleString())
  logger.info('Group Runtime:', time(runTime))
  logger.info('===========')
  await sleep(ms(thisGroup.sleep))
}

init().then(async (thisGroup, startTime) => {

}).catch(logger.error)
