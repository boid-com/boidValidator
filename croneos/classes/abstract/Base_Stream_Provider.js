var events = require('events')

class Base_Stream_Provider {
  constructor (provider_name) {
    if (this.constructor == Base_Stream_Provider) {
      throw new Error("Can't initiate an abstract class!")
    }
    this.name = provider_name
    this.check_if_provider_has_required_name()
    this.emitter = new events.EventEmitter()
  }

  insert (x) {
    console.log('[stream] received', 'INS'.green, 'operation')
    this.emitter.emit('insert', x)
  }

  remove (x) {
    console.log('[stream] received', 'REM'.red, 'operation')
    this.emitter.emit('remove', x)
  }

  check_if_provider_has_required_name () {
    if (!this.name || typeof this.name !== 'string' || this.name.length < 1) {
      throw new Error("Can't initialize a provider without name! Please pass in a string() name in to the super constructor.")
    } else {
      console.log(`Initialized Stream Provider ${this.name}`)
    }
  }
}

module.exports = {
  Base_Stream_Provider
}
