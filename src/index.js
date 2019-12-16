import React from 'react';
import ReactDOM from 'react-dom';

import App from './main';

if (process.env.NODE_ENV === 'development') {
  // const HotContainer = require('react-hot-loader').AppContainer;
  ReactDOM.render(
    <App />,
    document.getElementById('app')
  );

  // if (module.hot) {
  //   module.hot.accept();
  // }
}