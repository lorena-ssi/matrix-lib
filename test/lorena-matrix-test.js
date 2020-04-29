const chai = require('chai')
const Matrix = require('../src/index')
const fs = require('fs')
const util = require('util')
const uuidv4 = require('uuid/v4')

// Configure chai
chai.should()
const assert = chai.assert
const expect = chai.expect
chai.use(require('chai-as-promised'))

// Convert fs.readFile into Promise version of same
const readFile = util.promisify(fs.readFile)

const matrixServer = 'labdev.matrix.lorena.tech'
const matrixURL = `https://${matrixServer}`

let token = ''
let roomId

describe('Matrix - Lorena API', function () {
  const matrix = new Matrix(matrixURL)
  const matrixUser = uuidv4()
  const password = uuidv4()
  const matrixUser2 = uuidv4()
  const password2 = uuidv4()
  let mediaId

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

  it('should not connect to matrix with the incorrect password', async () => {
    await expect(matrix.connect(matrixUser, matrixUser)).to.be.rejectedWith(Error)
  })

  it('should connect to matrix', async () => {
    token = await matrix.connect(matrixUser, password)
    expect(token).to.have.lengthOf.above(10)
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

  it('should fail to create connection when not logged in', async () => {
    const matrix = new Matrix(matrixURL)
    await expect(matrix.createConnection('bogus', `@${matrixUser2}:${matrix.serverName}`)).to.be.rejectedWith(Error)
  })

  it('should sendMessage', async () => {
    const response = await matrix.sendMessage(
      roomId, // roomId (in this case from `randomRoomName`)
      'm.text', // type
      'Hello this is a test message...' // body
    )
    expect(response).to.be.ok
  })

  it('should fail to sendMessage without a roomId', async () => {
    await expect(matrix.sendMessage(
      '', // roomId blank
      'm.text', // type
      'Hello this is a test message...' // body
    )).to.be.rejectedWith(Error)
  })

  it('should fail to send message if not connected', async () => {
    const matrix = new Matrix(matrixURL)
    await expect(matrix.sendMessage(roomId, 'm.text', 'hello')).to.be.rejectedWith(Error)
  })

  it('should return all matrix events in an array', async () => {
    const events = await matrix.events('')
    expect(events.nextBatch).to.have.lengthOf.above(8)
    expect(events.events).to.exist
  })

  it('should return all matrix events in an array with filter', async () => {
    const events = await matrix.events('', { room: { timeline: { limit: 100 } } })
    expect(events.nextBatch).to.have.lengthOf.above(8)
    expect(events.events).to.exist
  })

  it('should fail to get events if not connected', async () => {
    const matrix = new Matrix(matrixURL)
    await expect(matrix.events('')).to.be.rejectedWith(Error)
  })

  it('should get all events for the other user for incoming invitations', async () => {
    const matrix = new Matrix(matrixURL)
    const events = await matrix.connect(matrixUser2, password2)
    expect(events).to.exist
  })

  it('should extractDid', () => {
    expect(matrix.extractDid(`!asdf:${matrixServer}`)).to.eql({
      matrixUser: 'asdf',
      matrixFederation: matrixServer
    })
  })

  it('should upload a file to matrix', async () => {
    const filename = 'simple'
    const type = 'text/plain'
    const file = await readFile('test/assets/simple.txt')
    const response = await matrix.uploadFile(file, filename, type)
    expect(response).to.be.ok
    const uriParts = response.data.content_uri.split('/')
    mediaId = uriParts[uriParts.length - 1]
    expect(mediaId).to.not.be.empty
  })

  it('should fail to upload file if not connected', async () => {
    const matrix = new Matrix(matrixURL)
    await expect(matrix.uploadFile('file')).to.be.rejectedWith(Error)
  })

  it('should download a file from matrix', async () => {
    // Examples of uploaded files `mxc://<server-name>/<media-id>`
    // `mxc://${matrixServer}/PtvDiuOtxkfgaQzVjEzYCvYo`
    // `mxc://${matrixServer}/FyzwuVzfulmHxluvTANRicMv`
    // `mxc://${matrixServer}/FCVtZVLJbpPMKjBzWusvkHyP`
    const a = await matrix.downloadFile(mediaId, 'simple')
    const file = await readFile('test/assets/simple.txt', 'utf8')
    expect(a.data).to.eql(file.toString())
  })

  it('should fail to download a nonexistent file from matrix', async () => {
    await expect(matrix.downloadFile('d3aDbeEfPiE4SaLe', 'simple')).to.be.rejectedWith(Error)
  })

  it('should return all matrix rooms', async () => {
    const rooms = await matrix.joinedRooms()
    expect(rooms).to.exist
    expect(rooms).to.have.lengthOf(1)
    expect(rooms[0]).to.eq(roomId)
  })

  it('should fail to return rooms if not connected', async () => {
    const matrix = new Matrix(matrixURL)
    await expect(matrix.joinedRooms()).to.be.rejectedWith(Error)
  })

  it('should leave a room', async () => {
    const response = await matrix.leaveRoom(roomId)
    expect(response).to.be.ok
  })

  it('should get an error when attempting to leave a room twice', async () => {
    await expect(matrix.leaveRoom(roomId)).to.be.rejectedWith(Error)
  })
})
