const getBoincWork = require('./getBoincWork')
const getRvnData = require('./getRvnWork')
const reflect = p => p.then(v => ({v, status: "fulfilled" }),e => ({e, status: "rejected" }))

async function init(){
  try {
    const results = await Promise.all([reflect(getBoincWork()),reflect(getRvnData())])
    console.log('Finished getWorkAsync')
    return {results:{boincData:results[0],rvnData:results[1]}}
  } catch (error) {
    return {errors:[error]}
  }
}

if (process.argv[2] === 'dev') init().catch(console.log)
module.exports = init