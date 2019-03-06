import React from 'react';
import ReactDOM from 'react-dom';
import Routes from './routes/routes';


if (process.env.NODE_ENV === 'development') {
  // const HotContainer = require('react-hot-loader').AppContainer;
  // const App = document.getElementById('app');
  ReactDOM.render(
    // <HotContainer>
      <div>111</div>,
    // </HotContainer>,
    document.getElementById('app')
  );

  // if (module.hot) {
  //   module.hot.accept();
  // }
} else {
  ReactDOM.render(
    <Routes />,
    document.getElementById('app')
  )
}