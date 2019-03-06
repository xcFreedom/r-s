import React, { Component } from 'react';
import { ReactLifeCycle } from '~/utils';

export default class LifeCycle extends Component {

  constructor(props) {
    super(props);
    this.state = {
      text: 'lifeCycle',
      showTest: true
    };
  }

  render() {
    return (
      <div>
        <button
          onClick={() => this.setState({ text: 'button click' })}
        >
          change props!
        </button>
        <button
          onClick={() => this.setState({ showTest: !this.state.showTest })}
        >
          toggle 'Test'
        </button>
      </div>
    )
  }
}
