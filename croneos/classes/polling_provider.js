const CONF = require('../miner_config.json')
const { Base_Stream_Provider } = require('./abstract/Base_Stream_Provider')

const { JsonRpc, RpcError } = require('eosjs')
const fetch = require('node-fetch')
const rpc = new JsonRpc(CONF.rpc_nodes[0], { fetch })

const inFirstOnly = (list1, list2, isUnion = false) => list1.filter((set => a => isUnion === set.has(a.id))(new Set(list2.map(b => b.id))))
const inSecondOnly = (list1, list2) => inFirstOnly(list2, list1)

const filterJob = (job) =>{
  try {
    if (!job || !job.gas_fee) return false
    const fee = job.gas_fee.split(' ')
    const token = fee[1]
    const amount = parseFloat(fee[0])
    // console.log('Fee:',token,amount)
    if (CONF.min_fee[token] > amount) return false
    else return true
  } catch (error) {
    console.error(error.toString())
    return true
  }
}

class polling_provider extends Base_Stream_Provider {
  constructor () {
    super('POLLING')
    this.interval = CONF.job_poll_interval
    this.cronjobs_data = []
    this.main()
  }

  async main () {
    setInterval(() => this.doInterval(), this.interval)
    this.doInterval()
  }

  async getCronjobsTable () {
    const next_key = ''
    let more = true
    let jobs = []
    while (more) {
      const res = await rpc.get_table_rows({
        json: true,
        code: CONF.croneos_contract,
        scope: CONF.scope,
        table: 'cronjobs',
        limit: -1,
        lower_bound: next_key
      }).catch(e => {
        return e.toString()
      })
      if (res && res.rows) {
        jobs = jobs.concat(res.rows)
        more = res.more
      }
    }
    return jobs
  }

  async doInterval () {
    const new_table_data = await this.getCronjobsTable().catch(console.error)
    if (!new_table_data) return doInterval()
    const new_rows = inFirstOnly(new_table_data, this.cronjobs_data).filter(filterJob)
    const old_rows = inSecondOnly(new_table_data, this.cronjobs_data)
    

    // remove old rows
    for (let i = 0; i < old_rows.length; i++) {
      this.remove(old_rows[i])
    }
    // emit new rows
    for (let i = 0; i < new_rows.length; i++) {
      // console.log(new_rows[i])
      this.insert(new_rows[i])
    }

    this.cronjobs_data = new_table_data
  }
}

module.exports = {
  polling_provider
}
