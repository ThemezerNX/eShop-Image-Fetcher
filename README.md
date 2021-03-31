# Introduction

This is a small library that fetches images for an application based on its title ID using Nintendo's GraphQL API at https://graph.nintendo.com/.

# Example

```js
import Fetcher from "@themezernx/eshop-image-fetcher";

const fetcher = new Fetcher("US");
const url = await fetcher.fetchAll("01000D1006CEC000");
console.log("All Images:", url);
```

# Build

```bash
# install dependencies
yarn

# compile the script
yarn run build
```
