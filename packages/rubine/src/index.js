import UAParser from 'ua-parser-js'
import Fetch from '@shared/fetch'
import uuid from 'uuid'

const parser = new UAParser()
const result = parser.getResult()

const getClientId = () => {
  if (!localStorage.__RUBINE_CLIENT_ID || !(localStorage.__RUBINE_CLIENT_ID.length === 36)) {
    localStorage.__RUBINE_CLIENT_ID = uuid.v1()
  }
  return localStorage.__RUBINE_CLIENT_ID
}

const clientInfo = {
  clientId: getClientId(),
  OS: result.os.name,
  OSVersion: result.os.version,
  Browser: result.browser.name,
  BrowserVersion: result.browser.version,
  DeviceType: result.device.type,
  DeviceMode: result.device.model,
  DeviceVendor: result.device.vendor,
  Engine: result.engine.name,
  EngineVersion: result.engine.version,
  CPU: result.cpu.architecture,
  UA: result.ua,
}

class Rubine {
  constructor (options={}) {
    this._options = options
    global.onerror = (error, url, lineNumber, columnNumber, errorObject) => {
      this.logError(errorObject, `${url}:${lineNumber}:${columnNumber}`)
    }
  }

  _count = 0

  config = (options) => {
    Object.assign(this._options, options)
  }

  getClientInfo = () => clientInfo

  logError = (errorObject, url) => {
    const {enableConsole} = this._options
    this._count ++
    const time = new Date()
    if (enableConsole) {
      console.warn('======= rubine new error ======')
      console.warn('url: ', url)
      console.warn('name: ', errorObject.name)
      console.warn('message: ', errorObject.message)
      console.warn("stack: ", errorObject.stack)
      console.warn("time: ", time)
      console.warn("count: ", this._count)
    }
    this.push({
      url,
      name: errorObject.name,
      message: errorObject.message,
      stack: errorObject.stack,
      time: time,
      count: this._count
    })
    if (enableConsole) console.warn('======== rubine end ===========')
  }

  push = async (errorInfo) => {
    const {trackServerUrl, getExtraInfo} = this._options
    const params = {
      errorInfo,
      clientInfo,
      extraInfo: getExtraInfo()
    }
    console.log(params)
    if (!trackServerUrl) return console.warn('rubine not configured, please use `rubine.config()`')
    const result = await new Fetch(trackServerUrl, params).post()
    if (result.error) return console.warn('track server unreachable')
    console.warn('error infomation send to track server success')
  }
}


const options = Object.assign({}, {
  getExtraInfo: () => ({}),
  enableConsole: true
}, global.__RUBINE_OPTIONS)

module.exports = module.exports.default = new Rubine(options)