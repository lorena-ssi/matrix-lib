const axios = require('axios')
const fs = require('fs')
const axiosRetry = require('axios-retry')

// Retry with step-back to solve rate limiting problem
axiosRetry(axios, {
  retries: 5,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (e) => {
    if (e.response.status === 429) {
      debug('retrying due to rate limiting', e)
      return true
    } else {
      return false
    }
  }
})

// Debug
const debug = require('debug')('did:debug:matrix')
const error = require('debug')('did:error:matrix')

/**
 * Javascript Class to interact with Matrix.
 */
module.exports = class Matrix {
  /**
   * @param {string} homeserver Matrix homeserver for this connection
   */
  constructor (homeserver) {
    this.serverName = homeserver.split('//')[1]
    this.api = homeserver + '/_matrix/client/r0/'
    this.media = homeserver + '/_matrix/media/r0/'
    this.connection = {}
    this.txnId = 1
    this.matrixUser = ''
  }

  /**
   * Connects to a matrix server.
   *
   * @param {string} username Matrix username
   * @param {string} password Matrix password
   * @returns {Promise} Return a promise with the connection when it's done.
   */
  async connect (username, password) {
    return new Promise((resolve, reject) => {
      axios.get(this.api + 'login')
        .then(async () => {
          const result = await axios.post(this.api + 'login', {
            type: 'm.login.password',
            user: username,
            password: password
          })
          this.connection = result.data
          this.matrixUser = '@' + username + ':' + this.serverName
          resolve(result.data.access_token)
        })
        .catch((e) => {
          error(e)
          reject(e)
        })
    })
  }

  /**
   * Register user
   *
   * @param {string} username Matrix username
   * @param {string} password Matrix password
   * @returns {Promise} username (if successful)
   */
  async register (username, password) {
    return new Promise((resolve, reject) => {
      axios.post(this.api + 'register', {
        auth: { type: 'm.login.dummy' },
        username: username,
        password: password
      })
        .then(async (res) => {
          resolve(username)
        })
        .catch((e) => {
          error(e)
          reject(e)
        })
    })
  }

  /**
   * Listen to events.
   *
   * @param {string} nextBatch next batch of events to be asked to the matrix server.
   * @param {object} filter a valid filter object ex: {"room":{"timeline":{"limit":100}}}
   * @returns {Promise} Return a promise with the Name of the user.
   */
  async events (nextBatch, filter) {
    return new Promise((resolve, reject) => {
      const apiCall = this.api +
        'sync?timeout=20000' +
        (filter ? '&filter=' + JSON.stringify(filter) : '&filter={}') +
        '&access_token=' + this.connection.access_token +
        (nextBatch === '' ? '' : '&since=' + nextBatch)

      // Sync with the server
      axios.get(apiCall).then(async (res) => {
        // incoming invitations.
        let events = this.getIncomingInvitations(res.data.rooms.invite)

        // Accepted invitations
        events = events.concat(this.getUpdatedInvitations(res.data.rooms.join))

        // Get Messages
        events = events.concat(this.getMessages(res.data.rooms.join))

        resolve({ nextBatch: res.data.next_batch, events })
      })
        .catch((e) => {
          error(e)
          reject(e)
        })
    })
  }

  /**
   * Checks if the username is available
   *
   * @param {string} username to check
   * @returns {Promise} of true if username is available
   */
  async available (username) {
    return new Promise((resolve, reject) => {
      axios.get(this.api + 'register/available?username=' + username)
        .then(async (res) => {
          resolve(true)
        })
        .catch(() => {
          resolve(false)
        })
    })
  }

  /**
   * Returns an array of rooms where the user is currently a member
   *
   * @returns {Promise} array of rooms currently joined
   */
  async joinedRooms () {
    return new Promise((resolve, reject) => {
      axios.get(this.api + 'joined_rooms?access_token=' + this.connection.access_token)
        .then(async (res) => {
          resolve(res.data.joined_rooms)
        })
        .catch((e) => {
          error(e)
          reject(e)
        })
    })
  }

  /**
   * Leave the specified room
   *
   * @param {string} roomId Room to leave
   * @returns {Promise} of true if success
   */
  async leaveRoom (roomId) {
    return new Promise((resolve, reject) => {
      axios.post(this.api + 'rooms/' + escape(roomId) + '/leave?access_token=' + this.connection.access_token)
        .then((res) => {
          return axios.post(this.api + 'rooms/' + escape(roomId) + '/forget?access_token=' + this.connection.access_token)
        })
        .then((res) => {
          resolve(res)
        })
        .catch((e) => {
          error(e)
          reject(e)
        })
    })
  }

  /**
   * Opens a connection to another user.
   *
   * @param {string} roomName Name of new room to create
   * @param {string} userId User name to connect to (in format @username:home.server)
   * @returns {Promise} Return a promise with the string roomId (in format !random:home.server)
   */
  createConnection (roomName, userId) {
    let roomId = ''
    debug('Create connection to ' + userId)
    return new Promise((resolve, reject) => {
      const apiCreate = this.api + 'createRoom?access_token=' + this.connection.access_token
      axios.post(apiCreate, { name: roomName, visibility: 'private' })
        .then((res, err) => {
          // Invite user to connect
          roomId = res.data.room_id
          const apiInvite = this.api + 'rooms/' + escape(roomId) + '/invite?access_token=' + this.connection.access_token
          return axios.post(apiInvite, { user_id: userId })
        })
        .then((res) => {
          resolve(roomId)
        })
        .catch((e) => {
          error(e)
          reject(e)
        })
    })
  }

  /**
   * Sends a Message.
   *
   * @param {string} roomId Room to send the message to.
   * @param {string} type Type of message.
   * @param {string} body Body of the message.
   * @param {string=} token access token (otherwise use the existing connection token)
   * @returns {Promise} Result of sending a message
   */
  sendMessage (roomId, type, body, token = false) {
    return new Promise((resolve, reject) => {
      const apiToken = (token === false) ? this.connection.access_token : token
      const apiSendMessage = this.api + 'rooms/' + escape(roomId) + '/send/m.room.message/' + this.txnId + '?access_token=' + apiToken
      axios.put(apiSendMessage, {
        msgtype: type,
        body: body
      })
        .then((res, err) => {
          this.txnId++
          resolve(res)
        })
        .catch((e) => {
          error(e)
          reject(e)
        })
    })
  }

  /**
   * Accepts invitation to join a room.
   *
   * @param {string} roomId RoomID
   * @returns {Promise} Result of the Matrix call
   */
  acceptConnection (roomId) {
    return new Promise((resolve, reject) => {
      const apiAccept = this.api + 'rooms/' + roomId + '/join?access_token=' + this.connection.access_token
      axios.post(apiAccept, {})
        .then((res) => {
          resolve(res)
        })
        .catch((e) => {
          error(e)
          reject(e)
        })
    })
  }

  /**
   * Extract Invitations from the API Call to matrix server - events
   *
   * @param {object} rooms Array of events related to rooms
   * @returns {object} array of invitations
   */
  getIncomingInvitations (rooms) {
    const roomEmpty = !Object.keys(rooms).length === 0 && rooms.constructor === Object
    const invitations = []
    if (!roomEmpty) {
      for (const roomId in rooms) {
        let invitation = {
          roomId
        }
        rooms[roomId].invite_state.events.forEach(element => {
          if (element.type === 'm.room.join_rules') {
            invitation = {
              ...invitation,
              sender: element.sender,
              join_rule: element.content.join_rule
            }
          } else if (element.type === 'm.room.member') {
            if (element.state_key === element.sender) {
              invitation = {
                ...invitation,
                membership: element.content.membership
              }
            } else {
              invitation = {
                ...invitation,
                origin_server_ts: element.origin_server_ts,
                event_id: element.event_id
              }
            }
          }
        })

        // If it's not me sending the invitation.
        if (invitation.sender !== this.matrixUser) {
          invitations.push({
            type: 'contact-incoming',
            roomId,
            sender: invitation.sender,
            payload: ''
          })
        }
      }
      return (invitations)
    }
  }

  /**
   * Extract Accepted Invitations from the API Call to matrix server - events
   *
   * @param {object} rooms Array of events related to rooms
   * @returns {Array} Array of all the new invitations to connect.
   */
  getUpdatedInvitations (rooms) {
    // Check if rooms is empty
    var updatedInvitations = []
    const roomEmpty = !Object.keys(rooms).length === 0 && rooms.constructor === Object
    if (!roomEmpty) {
      for (const roomId in rooms) {
        // Get the events in the Timeline.
        const events = rooms[roomId].timeline.events
        if (events.length > 0) {
          for (let i = 0; i < events.length; i++) {
            const element = events[i]
            // Get events for type m.room.member with membership join or leave.
            if (element.type === 'm.room.member' && element.sender !== this.matrixUser) {
              if (element.content.membership === 'join' || element.content.membership === 'leave') {
                updatedInvitations.push({
                  type: 'contact-add',
                  roomId: roomId,
                  sender: element.sender,
                  payload: element.content.membership
                })
              }
            }
          }
        }
      }
      return updatedInvitations
    }
  }

  /**
   * Extract Messages from events
   *
   * @param {object} rooms Array of events related to rooms
   * @returns {Array} Array of all the new invitations to connect.
   */
  getMessages (rooms) {
    const messages = []
    // Check if rooms is empty
    const roomEmpty = !Object.keys(rooms).length === 0 && rooms.constructor === Object
    if (!roomEmpty) {
      for (const roomId in rooms) {
        // Get the events in the Timeline for a room.
        const events = rooms[roomId].timeline.events
        if (events.length > 0) {
          for (let i = 0; i < events.length; i++) {
            const element = events[i]
            // Get messages.
            if (element.type === 'm.room.message' && element.sender !== this.matrixUser) {
              messages.push({
                type: element.content.msgtype === 'm.action' ? 'msg-action' : 'msg-text',
                roomId: roomId,
                sender: element.sender,
                payload: element.content
              })
            }
          }
        }
      }
    }
    return messages
  }

  /**
   * Upload a file
   *
   * @param {string} file contents
   * @param {string} filename filename
   * @param {string=} type mime-type
   * @returns {Promise} result of Matrix call
   */
  uploadFile (file, filename, type = 'application/text') {
    return new Promise((resolve, reject) => {
      // TODO: Check if file name follows MXC syntax
      // mxc://<server-name>/<media-id>
      //    <server-name> : The name of the homeserver where this content originated, e.g. matrix.org
      //    <media-id> : An opaque ID which identifies the content.`

      // Constructing route
      const apiCall = this.media +
        'upload?filename=' + filename +
        '&access_token=' + this.connection.access_token

      // Calling Matrix API
      axios.post(apiCall, file, { headers: { 'Content-type': type } })
        .then((res) => {
          resolve(res)
        })
        .catch((e) => {
          error(e)
          reject(e)
        })
    })
  }

  /**
   * Download file from Matrix
   *
   * @param {string} mediaId media ID
   * @param {string} filename file name
   * @param {string=} serverName server name
   * @returns {Promise} result of Matrix call
   */
  downloadFile (mediaId, filename, serverName = this.serverName) {
    return new Promise((resolve, reject) => {
      const apiCall = this.media + 'download/' + serverName + '/' + mediaId + '/' + filename
      axios.get(apiCall)
        .then((res) => {
          resolve(res)
        })
        .catch((e) => {
          error(e)
          reject(e)
        })
    })
  }

  /**
   * TODO - this seems to have issues
   *
   * @param {string} path File path to send
   * @param {string} roomId roomId to send the file to.
   * @returns {Promise} no result yet TODO
   */
  sendFile (path, roomId) {
    return new Promise((resolve) => {
      const chunks = []
      const reader = fs.createReadStream(path, { highWaterMark: 4 * 1024 })
      reader
        .on('data', function (chunk) {
          chunks.push(chunk)
          debug('Chunk ' + chunk.toString().length)
        })
        .on('end', function () {
          debug('The End')
          const file = fs.createWriteStream('example.pdf')
          for (let i = 0; i < chunks.length; i++) {
            file.write(chunks[i])
          }
          file.end()
          resolve()
        })
    })
  }

  /**
   * Returns the did associated to a matrix user
   *
   * @param {string} sender Sender
   * @returns {string} Full DID
   */
  extractDid (sender) {
    const parts = sender.split(':')
    return {
      matrixUser: parts[0].substr(1),
      matrixFederation: parts[1]
    }
  }
}
