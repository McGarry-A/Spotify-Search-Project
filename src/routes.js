const { Router } = require("express")
const appRouter = Router()

const { login, requestTokens, requestNewToken } = require('./controller')

appRouter.get(`/login`, login)
appRouter.get(`/callback`, requestTokens)
appRouter.get(`/refresh_token`, requestNewToken)

appRouter.get(`/`)
appRouter.post(`/`)

appRouter.post(`/album/:uri`)
appRouter.post(`/artist/:id`)

