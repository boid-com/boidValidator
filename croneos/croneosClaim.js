const CONF = require('./miner_config')
const {api,rpc,boidjs} = require('../eosjs')([CONF.permissionPrivateKey])

function parseReward(reward){
  if(!reward) return;
  let [amount_p, sym] = reward.split(' ');
  let precision = amount_p.includes(".") ? amount_p.split('.')[1].length-1 : 0;
  let amount = amount_p.substring(0, amount_p.length - 1);//remove excess decimal
  let res= {}
  res.asset = `${amount} ${sym}`;
  res.can_withdraw = !!Number(amount);
  return res;
}


async function init(){
  try {
    console.log('Querying for croneos profits...')
    const rewards = (await rpc.get_table_rows({
      code:CONF.croneos_contract,
      table:"rewards",
      scope:CONF.miner_account
    })).rows
    for (reward of rewards) {
      console.log('Claiming Profit:',reward)
      const parsed = parseReward(reward.adj_p_balance)
      if (!parsed.can_withdraw || parseFloat(parsed.asset) === 0) return console.log('Nothing to claim') 
      const actions = [
        {
          account: CONF.croneos_contract,
          name: 'withdraw',
          authorization: [
            {
              actor: CONF.miner_account,
              permission: CONF.miner_auth
            }
          ],
          data: {
            amount:parsed.asset,
            miner: CONF.miner_account
          }
        }
      ]
      console.log(actions)
      const result = await api.transact({actions},boidjs.tx.tapos)
      console.log(result)
    }
    // const result = 
  } catch (error) {
    console.error(error.toString())
  }
}

init().catch(console.error)