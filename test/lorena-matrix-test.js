const chai = require('chai')
const Matrix = require('../src/index')
const fs = require('fs')
const util = require('util')
const uuidv4 = require('uuid/v4')

// Configure chai
chai.should()
const assert = chai.assert
const expect = chai.expect

// Convert fs.readFile into Promise version of same
const readFile = util.promisify(fs.readFile)

let token = ''
let roomId

describe('Matrix - Lorena API', function () {
  var matrix = new Matrix('https://matrix.caelumlabs.com')
  const matrixUser = uuidv4()
  const password = uuidv4()
  const matrixUser2 = uuidv4()
  const password2 = uuidv4()

  it('should not recognize a nonexistent user as existing', async () => {
    expect(await matrix.available(matrixUser)).to.equal(true)
  })

  it('should register a new user', async () => {
    expect(await matrix.register(matrixUser, password)).to.eq(matrixUser)
    expect(await matrix.register(matrixUser2, password2)).to.eq(matrixUser2)
  })

  it('should recognize a user as already existing', async () => {
    expect(await matrix.available(matrixUser)).to.equal(false)
    expect(await matrix.available(matrixUser2)).to.equal(false)
  })

  it('should not register an already-existing user', async () => {
    try {
      await matrix.register(matrixUser, password)
    } catch (e) {
      e.message.should.eq('Request failed with status code 400')
      return
    }
    assert(false, 'should have failed to register an already existing user')
  })

  it('should connect to matrix', async () => {
    token = await matrix.connect(matrixUser, password)
    expect(token).to.have.lengthOf.above(10)
  })

  it('should return all matrix events in an array', async () => {
    const events = await matrix.events('')
    expect(events.nextBatch).to.have.lengthOf.above(8)
    expect(events.events).to.exist
  })

  it('should create connection with another user', async () => {
    const name = (Math.floor(Math.random() * 9999)).toString()
    const newRoomId = await matrix.createConnection(
      name, // Room name (can be any)
      `@${matrixUser2}:${matrix.serverName}` // User to connect with
    )
    expect(newRoomId).to.not.be.empty
    roomId = newRoomId
  })

  it('should sendMessage', async () => {
    const response = await matrix.sendMessage(
      roomId, // roomId (in this case from `randomRoomName`)
      'm.text', // type
      'Hello this is a test message...' // body
    )
    expect(response).to.be.ok
  })

  it('should extractDid', () => {
    expect(matrix.extractDid('!asdf:matrix.caelumlabs.com')).to.eql({
      matrixUser: 'asdf',
      matrixFederation: 'matrix.caelumlabs.com'
    })
  })

  it('should upload a file to matrix', async () => {
    const filename = 'simple'
    const type = 'text/plain'
    const file = await readFile('test/assets/simple.txt')
    const response = await matrix.uploadFile(file, filename, type)
    expect(response).to.be.ok
  })

  it('should download a file from matrix', async () => {
    // Examples of uploaded files `mxc://<server-name>/<media-id>`
    // 'mxc://matrix.caelumlabs.com/PtvDiuOtxkfgaQzVjEzYCvYo'
    // 'mxc://matrix.caelumlabs.com/FyzwuVzfulmHxluvTANRicMv'
    // 'mxc://matrix.caelumlabs.com/FCVtZVLJbpPMKjBzWusvkHyP'
    const a = await matrix.downloadFile('FCVtZVLJbpPMKjBzWusvkHyP', 'simple')
    const file = await readFile('test/assets/simple.txt', 'utf8')
    expect(a.data).to.eql(file.toString())
  })

  it('should return all matrix rooms', async () => {
    const rooms = await matrix.joinedRooms()
    expect(rooms).to.exist
    expect(rooms).to.have.lengthOf(1)
    expect(rooms[0]).to.eq(roomId)
  })

  it('should leave a room', async () => {
    const response = await matrix.leaveRoom(roomId)
    expect(response).to.be.ok
  })
})
