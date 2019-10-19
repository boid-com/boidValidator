const { Api, JsonRpc } = require('eosjs')
var env = require('./.env.json')
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig')
const fetch = require('node-fetch')
const { TextEncoder, TextDecoder } = require('util')
var api
var rpc

function rand (min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const endpoints = [
  'https://api.eosnewyork.io',
  'https://eos.greymass.com',
  'https://api.eossweden.org',
  'https://api.eosn.io',
  'https://api.cypherglass.com'
]

function pickEndpoint () {
  return endpoints[rand(0, endpoints.length - 1)]
}

async function getProtocols () {
  try {
    const res = await rpc.get_table_rows({
      json: true,
      code: 'boidcompower',
      scope: 'boidcompower',
      lower_bound: null,
      table: 'protocols',
      limit: 100
    })
    return res.rows
  } catch (error) {
    return undefined
  }
}

async function getAccountDevices (account) {
  const res = await rpc.get_table_rows({
    json: true,
    code: 'boidcompower',
    scope: account,
    table: 'devaccounts',
    limit: 10000
  })
  res.rows = res.rows.map(el => {
    el.owner = account
    return el
  })
  return res.rows
}

async function getAllDevices () {
  let accts = []
  let res = await rpc.get_table_by_scope({
    json: true,
    code: 'boidcompower',
    table: 'devaccounts',
    limit: 10000000,
    // limit: 1,
    lower_bound: 0
  })
  accts = accts.concat(res.rows)
  while (res.more != '' && res.more != false) {
    res = await rpc.get_table_by_scope({
      json: true,
      code: 'boidcompower',
      table: 'devaccounts',
      limit: 10000000,
      // limit: 1,
      lower_bound: res.rows[res.rows.length - 1].scope + 1
    })
    accts = accts.concat(res.rows)
  }
  const acctInfo = []
  for (let i = 0; i < accts.length; i++) {
    const x = await getAccountDevices(accts[i].scope)
    for (let j = 0; j < x.length; j++) {
      j.owner = accts[i].scope
      acctInfo.push(x[j])
    }
  }
  return acctInfo
}

const queries = { getProtocols, getAllDevices, getAccountDevices }

function init (endpoint) {
  const keys = [env.keys.validator]
  if (!endpoint) endpoint = pickEndpoint()
  const signatureProvider = new JsSignatureProvider(keys)
  rpc = new JsonRpc(endpoint, { fetch })
  api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() })
  return { rpc, api, queries }
}

module.exports = init

// init().getStake('johnatboid11')
