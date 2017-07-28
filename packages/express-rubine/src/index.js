const express = require('express')
const defaults = require('lodash/defaults')
const result = require('lodash/result')

const defaultOptions = {
  viewPermission: (ctx) => new Promise(resolve => resolve(true)),
  collectionName: 'rubine_track',
  schema: [
    {name: 'clientId', from: 'clientInfo.clientId'},
  ],
  pushResponse: (e, data, ctx) => {
    if (e) return ctx.res.json({
      error: e.name, 
      message: e.message
    })
    return ctx.res.json({
      message: 'success'
    })
  },
  viewResponse: (e, data, ctx) => {
    if (e) return ctx.res.json({
      error: e.name, 
      message: e.message
    })
    return ctx.res.json({
      message: 'success', 
      data
    })
  }
}

module.exports = module.exports.default = (options) => {
  const {db, dbversion, viewPermission, schema, collectionName, pushResponse, viewResponse} = options
  defaults(options, defaultOptions)

  const router = express.Router()

  router.use((req, res, next) => {
    let error = null
    if (!db) {
      const error = new TypeError('rubine: db is not a valid database object.')
      return next(error)
    }
    res.locals._rubineCtx = {
      req, res
    }
    next()
  })
  
  router.all('/push', async (req, res, next) => {
    try {
      const trackDb = db.collection(collectionName)
      const {errorInfo, clientInfo, extraInfo} = req.body
      const doc = {}
      schema.forEach(item => {
        try {
          doc[item.name] = result(req.body, item.from)
        } catch(e){
        }
      })
      doc.createTime = new Date()
      await trackDb.insertOne(doc)
      pushResponse(null, doc, res.locals._rubineCtx)
    } catch(e){
      pushResponse(e, null, res.locals._rubineCtx)
    }
  })

  router.all('/view', async (req, res, next) => {
    try {
      const permission = await viewPermission(res.locals._rubineCtx)
      if (!permission) {
        const error = new Error('rubine: current user are not allowed to view error tracks')
        error.name = 'PermissionError'
        return next(error)
      }

      const {filter={}, skip=0, limit=20, sort={createTime: -1}} = req.body

      const trackDb = db.collection(collectionName)
      const data = await trackDb.find(filter).skip(skip).limit(limit).sort(sort).toArray()

      viewResponse(null, data, res.locals._rubineCtx)
    } catch(e){
      viewResponse(e, null, res.locals._rubineCtx)
    }

  })

  return router
}
