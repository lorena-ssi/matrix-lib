/* eslint-disable no-undef */
/* eslint-disable no-unused-expressions */
const chai = require('chai')
const Matrix = require('../src/index')
const fs = require('fs')
const util = require('util')

// Configure chai
chai.should()
const expect = chai.expect

// Convert fs.readFile into Promise version of same
const readFile = util.promisify(fs.readFile)

let token = ''
let leaveRoom = ''

describe('Matrix - Lorena API', function () {
  var matrix = new Matrix('https://matrix.caelumlabs.com')
  const matrixUser = '42dd5715a308829e'
  const password = 'nikola'

  it('should register and connect to matrix', async () => {
    expect(await matrix.available(matrixUser)).to.equal(false)
    token = await matrix.connect(matrixUser, password)
    expect(token).to.have.lengthOf.above(10)
  })

  it('should return all matrix events in an array', async () => {
    const events = await matrix.events('')
    expect(events.nextBatch).to.have.lengthOf.above(8)
    expect(events.events).to.exist
  })

  it('should return all matrix rooms', async () => {
    const rooms = await matrix.joinedRooms()
    leaveRoom = rooms[0]
    console.log(rooms)
    expect(rooms).to.exist
    expect(rooms).to.have.lengthOf.above(0)
  })

  it('should Leave a room', async () => {
    await matrix.leaveRoom(leaveRoom)
    // POST /_matrix/client/r0/rooms/%21nkl290a%3Amatrix.org/l
  })


  /* it('should create connection with ' + username2, async () => {
    const name = (Math.floor(Math.random()*9999)).toString()
    console.log("asdfasdf", name)
    const a = await matrix.createConnection(
      username2, // Did to talk to
      'did:lor:lab:', //Did method (ex. 'did:lor:lab:')
      name, // Room name (can be any)
      username2, // User to connect with
      'matrix.caelumlabs.com'// Matrix federation
    )
    console.log("Creating connection:", a)
    tempRoomId = a.room_id
  })

  it('should sendMessage', async () => {
    console.log("Current romm_id", tempRoomId)
    const a  = await matrix.sendMessage(
      tempRoomId, // roomId (in this case from `randomRoomName`)
      'm.text', // type
      'Hello this is a test message...' // body
    )
    console.log("Message sent", a)
  }) */

  it('should extratctDid', () => {
    expect(matrix.extractDid('!asdf:matrix.caelumlabs.com')).to.eql({
      matrixUser: 'asdf',
      matrixFederation: 'matrix.caelumlabs.com'
    })
  })

  it('should upload a file to matrix', async () => {
    // const filename = 'simple'
    // const type = 'text/plain'
    // git push -u origin masterconst file = await readFile('test/assets/simple.txt')
    // const a = await matrix.uploadFile(file, filename, type)
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
})
