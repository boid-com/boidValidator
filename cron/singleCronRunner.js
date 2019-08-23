const cron = require('./cron.js')
const db = require('../db.js')

async function init(){
  try {
    console.log('running...')
    cron.run(process.argv[2])
  } catch (error) {
    console.log(error)
    await require('./setupCronJobs')()
    init()
  }
}

init().catch(console.log)
