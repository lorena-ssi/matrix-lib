# User stories to be tested

As a user I want to Connect to Matrix

### Basics
- Create new user in Matrix (local enviroment with homeserver)
- Test Login to user1
- Create another user in Matrix (local enviroment with homeserver)
- Login to user2
- Listen (user1) to all events, check nextBatch and array of events

### Connection
- Create a connection with user2
- user 2 should accept the invitation
- user 1 should leave and forget the room

### Messages
- A message should be sent from user 1 to user 2

### Files
- A file should be uploaded/downloaded fomr Matrix
