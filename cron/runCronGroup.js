const jobGroups = require('./jobGroups.json')
const cron = require('./cron.js')
async function init(){
  if (process.argv[2]){
    try {
      const jobs = jobGroups.find(el => el.group == process.argv[2]).jobs
      for (job of jobs){
        const result = await cron.run(job).catch(console.log)
        if (result) console.log(result)
        else console.log("there was an error!")
      }
    } catch (error) {
      console.error(error)
    }
  } else {
    console.error('Please specify a cron group to run.')
  }

}

init().then(async ()=>{
  console.log('finished cron cycle:', new Date().toDateString())
})