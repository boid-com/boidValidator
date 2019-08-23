const db = require('../db')
const jobList = require('./jobList.json')

async function start(){
  try {
    i = 0
    jobs = []
    for (job of jobList){
    // console.log("Registering Job: "+ job.name + " interval: " + job.interval )
    jobs.push(db.gql(`mutation{
      upsertCronJob(where:{name:"${job.name}"} 
        create:{name:"${job.name}" interval:"${job.interval}"}
        update:{name:"${job.name}" interval:"${job.interval}"}
      ){name}
    }`))
    // console.log(result)
  }
    await Promise.all(jobs)
    console.log('finished registering cron jobs')
  } catch (error) {
    console.error(error.message)
    return error.message
  }

}
module.exports = start
// start()
