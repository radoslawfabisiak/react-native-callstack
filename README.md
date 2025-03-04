# @radoslawfabisiak/react-native-callstack

A React Native callstack worker to queue and retry failed API calls from app-level fails, now open-sourced!

# @radoslawfabisiak/react-native-callstack

A React Native callstack worker to queue and retry failed API calls—saved ~500k calls/month from app-level failures, now open-sourced from 14+ years of dev experience!

## Installation

Install the package and its dependency:

```bash
npm install @radoslawfabisiak/react-native-callstack
```

## Overview

This package creates a persistent callstack worker that runs in the background, retrying failed API calls caused by app-level issues (e.g., bad internet, device crashes). It’s designed to be initialized once as a global instance and triggered in your main component’s `useEffect`. Saved us ~500k API calls monthly—~70% server load reduction—by deduplicating and throttling retries.

## Setup

1. **Create a Global Instance**

   Define the callstack with your API functions in a separate file (e.g., `callstack.js`):

   ```javascript
   // callstack.js
   import ReactNativeCallstack from "@radoslawfabisiak/react-native-callstack";
   import { askForUser, askForProducts } from "./api";

   export const callstack = new ReactNativeCallstack({
     functionMap: {
       askForProducts: async () => await askForProducts(),
       askForUser: async ({ id }) => await askForUser(id),
       // Add more API functions as needed
     },
   });
   ```

2. **Initialize in Main Component**

   In your main component, initialize the worker in a `useEffect`:

   ```javascript
   // Main.js
   import React, { useEffect } from "react";
   import { callstack } from "./callstack";

   function Main() {
     useEffect(() => {
       callstack
         .initialize()
         .catch((err) => console.error("Callstack init failed:", err));
     }, []);

     return <YourApp />;
   }

   export default Main;
   ```

3. **Add Failed Calls on Error**

   Import and use the `callstack` instance wherever API calls fail:

   ```javascript
   // api.js
   import { callstack } from "./callstack";

   async function askForUser(id) {
     try {
       const result = await apiFunctionToGetUser({ id });
       return result;
     } catch (error) {
       callstack.add({
         type: "askForUser",
         payload: { id },
         error: new Error("Network"),
       });
     }
   }
   ```

## Features

- **App-Level Queuing**: Captures failures before server contact (e.g., bad signal, device issues).
- **Deduplication**: Keeps one call per type/payload—drops duplicates, saves retries.
- **Persistence**: Uses AsyncStorage to survive app restarts.
- **Custom Function Mapping**: Pass your API functions with precise payload handling—no guesswork.
- **Background Worker**: Runs every 500ms (configurable) after one-time initialization.

## Configuration Options

- `maxAttempts`: Max retries before giving up (default: 3600).
- `interval`: Retry interval in ms (default: 500).
- `functionMap`: Object mapping call types to async functions (required).

Example with custom options:

```javascript
export const callstack = new ReactNativeCallstack({
  maxAttempts: 10,
  interval: 1000,
  functionMap: {
    getMyProducts: async ({ userId }) => await getMyProducts(userId),
  },
});
```

## Custom Error Handling

Override the default `onError` callback:

```javascript
callstack.add({
  type: "getMyProducts",
  payload: { userId: "123" },
  error: new Error("Offline"),
  onError: ({ type, attempts, error }) =>
    console.log(`${type} failed ${attempts}x:`, error),
});
```

## Why It’s Awesome

Built from a real-world app by catching app-level fails traditional tools miss. Open-sourced from 14+ years of dev scars—install it, queue your fails, save your app!

## Contributing

Fork it, tweak it, PRs welcome—let’s make mobile dev smoother together!

## Cooperation

Do you need help with implementing callstack in your project? Feel free to contact me on LinkedIn—I’d be happy to assist!

Find me at: [https://www.linkedin.com/in/radek-fabisiak/](https://www.linkedin.com/in/radek-fabisiak/).
