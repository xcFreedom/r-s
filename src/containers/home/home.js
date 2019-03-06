import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './style/index.css';

import { Wrapper } from '~/utils';

// window.GlobalPJT = {
//   getDeviceInfo: function() {
//     return {"User-Agent":"Mozilla/5.0 (iPhone; CPU iPhone OS 12_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/16B91","Platform":"iOS","Device-ID":"iPhone11,8","Version":"1.0.0","Language":"en"};
//   },
//   getEnv: function() {
//     return 'test';
//   },
//   getTokenInfo: function() {
//     return {};
//   },
//   isApp: function() {
//     return true;
//   }
// };

@Wrapper
export default class Home extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }
  
  componentDidMount() {
    // var originalPostMessage = window.postMessage;
    // var patchedPostMessage = function(message, targetOrigin, transfer) { 
    //   originalPostMessage(message, targetOrigin, transfer);
    // };
    // patchedPostMessage.toString = function() { 
    //   return String(Object.hasOwnProperty).replace('hasOwnProperty', 'postMessage'); 
    // };

    
    //   document.cookie = 'accessToken=';
    //   document.cookie = 'refreshToken=';
    

    // window.GlobalPJT = {
    //   getDeviceInfo: function() {
    //     return {"User-Agent":"Mozilla/5.0 (iPhone; CPU iPhone OS 12_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/16B91","Platform":"iOS","Device-ID":"iPhone11,8","Version":"1.0.0","Language":"en"};
    //   },
    //   getEnv: function() {
    //     return '{{ENV}}';
    //   },
    //   getTokenInfo: function() {
    //     return {"accessToken":"","refreshToken":""};
    //   },
    //   isApp: function() {
    //     return true;
    //   },
    //   navigate: patchedPostMessage
    // };
  }


  async test() {
    const resp = await Promise.resolve({ code: 200 });
  }

  click = () => {
    let deviceInfo = '{}';
    let env = 'xxx';
    try {
      deviceInfo = JSON.stringify(window.GlobalPJT.getDeviceInfo());
      env = window.GlobalPJT.getEnv();
      window.GlobalPJT.navigate('goBack')
    } catch(err) {
      console.log(err);
      env = err.toString();
    }
    this.setState({ deviceInfo, env, cookie: document.cookie });
    this.props.history.replace('?a=b');
  }

  render() {
    return (
      <div className="home" onClick={this.click}>
        Home 
        <div>{this.state.deviceInfo}</div>
        <div>{this.state.env}</div>
        <div>{this.state.cookie}</div>
        <input type="file" />
        <input type="text" />
      </div>
    )
  }
}
