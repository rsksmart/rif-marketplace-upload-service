import chai from 'chai'
import colors from 'colors/safe'
import { formatLogMessage } from '../../src/logger'

describe('Logger test', () => {
  it('should log the message as it is', () => {
    const timestamp = Date().toLocaleString()
    const message = formatLogMessage({ level: 'ERROR', message: 'Nasty error is here', timestamp, metadata: { service: 'db' } })
    const expectedMessage = `[ERROR] ${colors.grey(timestamp)} (db): Nasty error is here`
    chai.expect(message).to.be.eql(expectedMessage)
  })

  it('should sanitize invalid log entry', () => {
    const timestamp = Date().toLocaleString()
    const message = formatLogMessage({ level: 'ERROR', message: `Nasty error is here\n[ERROR] ${colors.grey(timestamp)} (user): bad guy logged out`, timestamp, metadata: { service: 'db' } })
    const expectedMessage = `[ERROR] ${colors.grey(timestamp)} (db): Nasty error is here\\n[ERROR] ${colors.grey(timestamp)} (user): bad guy logged out`
    chai.expect(message).to.be.eql(expectedMessage)
  })
})
