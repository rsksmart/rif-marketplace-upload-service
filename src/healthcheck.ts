import type { Application } from './definitions'
import type { Sequelize } from 'sequelize-typescript'
import { ProviderManager } from './providers'

const HEALTHCHECK_ROUTE = '/healthcheck'
export default function (app: Application): void {
  app.use(HEALTHCHECK_ROUTE, async (req, res) => {
    const sequelize = app.get('sequelize') as Sequelize
    const storage = app.get('storage') as ProviderManager

    try {
      await storage.version()
    } catch (e) {
      res.status(500).send('No Storage connection')
    }

    try {
      await sequelize.authenticate()
    } catch (e) {
      res.status(500).send('No DB connection')
    }

    res.status(204).end()
  })
}
