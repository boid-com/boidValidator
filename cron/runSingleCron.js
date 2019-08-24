const cron = require('./cron.js')
const db = require('../db.js')
const logger = require('logging').default('runSingleCron')

async function init(){
  try {
    logger.info('running...',process.argv[2])
    cron.run(process.argv[2])
  } catch (error) {
    console.log(error)
    await require('./registerCronJobs')()
    init()
  }
}

init().catch(console.log)
