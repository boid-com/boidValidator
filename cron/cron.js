const db = require('../db.js')

async function run(jobName){
  let run
  try {
    console.log('starting',jobName)
    const existingJob = await db.gql(`{cronJob(where:{name:"${jobName}"}){name}}`)
    if(!existingJob) await db.gql(`mutation{createCronJob(data:{name:"${jobName}"}){name}}`)
    run = await db.gql(`mutation{createCronRun(data:{job:{connect:{name:"${jobName}"}}}){id createdAt}}`)
    const job = await require('./jobs/'+jobName)()
    const runtime = Date.now() - Date.parse(run.createdAt) 
    const updateRun = await db.gql(`mutation($results:Json $errors:Json){updateCronRun(where:{id:"${run.id}"}
      data:{results:$results errors:$errors runtime:${runtime}})
      {id}}`,job)
    return {updateRun,runtime,job}
  } catch (error) {
    console.error(error)
    if (run){
      await db.gql(`mutation($results:Json $errors:Json){updateCronRun(where:{id:"${run.id}"} 
      data:{results:$results errors:$errors runtime:0})
      {id}}`,{errors:{error:error.message}})
    }
    return{run,error:error.message}
  }
}

module.exports ={run}
