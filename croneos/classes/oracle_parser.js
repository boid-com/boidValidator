const CONF = require('../miner_config.json')
const { TextEncoder, TextDecoder } = require('util')
const fetch = require('node-fetch')
var jp = require('jsonpath')

class oracle_parser {
  constructor (eosapi) {
    console.log('Oracle parser initialized')
    this.api = eosapi
  }

  async get (oracle_conf) {
    // oracle_conf = {
    //     oracle_srcs: table_delta_insertion.oracle_srcs,
    //     account: table_delta_insertion.actions[0].account,
    //     name: table_delta_insertion.actions[0].name
    //   }
    const source_index = 0
    console.log('[oracle]'.green, oracle_conf.oracle_srcs[source_index].api_url)

    let res = this.checkResponseStatus(await fetch(oracle_conf.oracle_srcs[source_index].api_url))
    if (res === false) return
    res = await res.json()

    if (oracle_conf.oracle_srcs[source_index].json_path != '') {
      res = jp.query(res, oracle_conf.oracle_srcs[source_index].json_path)
    }

    if (res.length == 0) {
      res = ''
    } else if (res.length == 1) {
      res = res[0]
    }

    // cast data based on abi and then serialize.
    const fields = await this.getActionFields(oracle_conf.account, oracle_conf.name)

    // TODO better type casting
    let data = {}
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i]
      // console.log(field)
      switch (field.name) {
        case 'executer':
          data.executer = CONF.miner_account
          break
        case 'response':
          data.response = this.castType(field.type, res)
          break

        default:
          break
      }
    }
    // end todo
    const dummy_data = await this.deserializeActionData(oracle_conf.account, oracle_conf.name, oracle_conf.dummy_data)

    data = Object.assign(dummy_data, data)

    console.log(data)

    const serialized_data = await this.serializeActionData(oracle_conf.account, oracle_conf.name, data)
    return serialized_data
  }

  async serializeActionData (account, name, data) {
    try {
      const contract = await this.api.getContract(account)
      const hex = this.api.Serialize.serializeActionData(
        contract,
        account,
        name,
        data,
        new TextEncoder(),
        new TextDecoder()
      )
      return hex
    } catch (e) {
      console.log(e)
      return false
    }
  }

  async deserializeActionData (account, name, data) {
    try {
      const contract = await this.api.getContract(account)
      const deserialized_data = this.api.Serialize.deserializeActionData(
        contract,
        account,
        name,
        data,
        new TextEncoder(),
        new TextDecoder()
      )
      return deserialized_data
    } catch (e) {
      console.log(e)
      return false
    }
  }

  async getActionFields (account, name) {
    try {
      const abi = await this.api.getAbi(account)// will be cached by eosjs
      // console.log(abi)
      const { type } = abi.actions.find(aa => aa.name == name)
      // console.log(type)
      const struct = abi.structs.find(st => st.name == name || st.name == type)
      if (struct) {
        return struct.fields
      } else {
        console.log(`fields not found for ${name}`.red)
      }
    } catch (e) {
      console.log(e)
      return false
    }
  }

  checkResponseStatus (res) {
    if (res.ok) { // res.status >= 200 && res.status < 300
      return res
    } else {
      console.log(`${res.statusText}`.red)
      return false
    }
  }

  castType (type, value) {
    // this should be more advanced to also allow vector of primitive types and complex structs
    const floats = ['float32', 'float64', 'float128']
    const ints = ['uint8', 'int8', 'uint16', 'int16', 'uint32', 'uint64', 'int64', 'int32', 'varuint32', 'varint32', 'uint128', 'int128']
    // const other = ['bytes', 'name', 'time_point', 'time_point_sec', 'block_timestamp_type', 'symbol_code', 'symbol', 'asset', 'checksum160', 'checksum256', 'checksum512', 'public_key', 'private_key', 'signature', 'extended_asset']

    if (ints.includes(type)) {
      return Number(value)
    }
    if (floats.includes(type)) {
      return parseFloat(value)
    }
    if (type == 'bool') {
      return Boolean(value)
    }
    if (type == 'string') {
      return String(value)
    }
    // type not handled so return value as it is
    return value
  }
}

module.exports = {
  oracle_parser
}
