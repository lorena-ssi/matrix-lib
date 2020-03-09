# matrix-lib

`matrix-lib` is a caelum api for matrix connection used in `Lorena SSI`.

[![Build Status](https://travis-ci.com/lorena-ssi/matrix-lib.svg?branch=master)](https://travis-ci.com/lorena-ssi/matrix-lib)
[![Coverage Status](https://coveralls.io/repos/github/lorena-ssi/matrix-lib/badge.svg?branch=travis)](https://coveralls.io/github/lorena-ssi/matrix-lib?branch=travis)

## Installation

```bash
npm @lorena-ssi/matrix-lib
```

## Getting Started

```javascript
const Matrix = require('@lorena-ssi/lorena-matrix')
// Creating class Matrix with parameter `homeserver`
const matrix = new Matrix('https://matrix.org')
// Check if user exists
if ( (await matrix.available(username)) ) {
    // Registering to matrix `homeserver` with `username` and `password`
    const primaryUser = await matrix.register('username', 'password')
    // Connecting to account with username `username` and password `password`
    matrix.connect(username, password)
        .then((res)=>{console.log("Connected:", res)})
        .catch((e)=>{console.log("Error:", e)})
    // Read events: If argument=='' then all history events are received
    matrix.events('')
        .then((a,b)=>{console.log("Correct:", a)})
        .catch((e)=>{console.log("Error in events:", e)})
}
```
