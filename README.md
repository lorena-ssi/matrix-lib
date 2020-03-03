# matrix-lib

`matrix-lib` is a caelum api for matrix connection used in `Lorena SSI`.

## Installation

```bash
npm @lorena-ssi/matrix-lib
```

## Getting Started

```javascript
const Matrix = require('@lorena-ssi/lorena-matrix')
// Creating class Matrix with parameter `homesrever`
const matrix = new Matrix('https://matrix.org')
// Check if user exists
if ( (await matrix.available(username)) ) {
    // Registering to matrix `homeserver` with `username` and `password`
    const primaryUser = await matrix.register('username', 'password')
    // Connecting to account with username `username` and password `password`
    matrix.connect(username, password)
        .then((res)=>{console.log("Connected:", res)})
        .catch((e)=>{console.log("Error:", e)})
    // Read events: If argument=='' then all history events are reveived
    matrix.events('')
        .then((a,b)=>{console.log("Correct:", a)})
        .catch((e)=>{console.log("Error in events:", e)})
}
```
