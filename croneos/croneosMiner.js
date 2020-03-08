const { Miner } = require('./classes/Miner')
// const { dfuse_provider } = require("./classes/dfuse_provider");

// local use only!
const { polling_provider } = require('./classes/polling_provider')

const options = {
  max_attempts: 3,
  attempt_delay: 1300, // ms
  attempt_early: 100, // ms
  log_error_attempts: true,
  process_initial_state: false
}

new Miner(polling_provider, options)
