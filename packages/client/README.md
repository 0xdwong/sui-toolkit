# Sui Toolkit Client

This project was built with [Create React App](https://github.com/facebook/create-react-app).

## Available Commands

In the project directory, you can run:

### `yarn start`

Runs the app in development mode.  
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.


### `yarn build`

Builds the production version of the app to the `build` folder.  
It correctly bundles React and optimizes the build for best performance.


## Deployment Instructions

1. Run `yarn build` to generate the production version
2. Deploy the contents of the `build` folder to your website server
3. Ensure the server is configured to handle single-page application routing

### Deployment to Walrus site
```
site-builder publish ./build \
--site-name sui-toolkit \
--epochs max
```

For Walrus site documentation, see [walrus-sites](https://docs.wal.app/walrus-sites/intro.html)