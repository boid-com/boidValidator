const { Api, JsonRpc } = require('eosjs')
var env = require('./.env.json')
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig')
const fetch = require('node-fetch')
const { TextEncoder, TextDecoder } = require('util')
var api
var rpc

function init (keys,endpoint) {
  if (!keys) keys = [env.validator.key]
  if (!endpoint) endpoint = env.eosRPCEndpoint
  const signatureProvider = new JsSignatureProvider(keys)
  rpc = new JsonRpc(endpoint, { fetch })
  api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() })
  return { rpc, api }
}

module.exports = init

// init().getStake('johnatboid11')
