const db = require('../db')
const jobList = require('./jobGroups.json')

async function start () {
  try {
    i = 0
    AllJobs = []
    for (group of jobList) {
      for (job of group.jobs) {
        AllJobs.push(db.gql(`mutation{
          upsertCronJob(where:{name:"${job.name}"} 
            create:{id:"${job.name}" name:"${job.name}"}
            update:{id:"${job.name}" name:"${job.name}"}
          ){name}
        }`))
        console.log('Registering Job: ' + job + ' group: ' + group.group)
      }
    // console.log(result)
    }
    await Promise.all(AllJobs)
    console.log('finished registering cron jobs')
  } catch (error) {
    console.error(error.message)
    return error.message
  }
}
module.exports = start
// start()
