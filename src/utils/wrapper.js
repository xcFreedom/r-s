import React, { Component } from 'react';

const Wrapper = (Content) => {
  return class extends Component {
    render() {
      return (
        <div>
          Wrapper
          <Content {...this.props} />
        </div>
      );
    }
  }
};

export default Wrapper;