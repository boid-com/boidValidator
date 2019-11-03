const ax = require('axios')
const sleep = ms => new Promise(res => setTimeout(res, ms))

var i = 0
console.log('Stress testing rpcProxy endpoint...')

async function init () {
  try {
    const result = ax.get('http://localhost:3051/v1/chain/get_info')
    result.catch(err => err.message)
    // console.log(result.status)
    i++
    // console.log(i)
    await sleep(10)
    return init().catch(console.error)
  } catch (error) {
    process.end()
  }
}
init().catch(console.log)
