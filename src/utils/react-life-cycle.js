import React, { Component } from 'react';
import ReactDOM from 'react-dom';

const defaultProps = new Proxy({ a: 1, b: 2 }, {
  get(target, propKey, receiver) {
    console.log(propKey, '-------------------------getDefaultProps-------------------------');
    return target[propKey];
  }
});

export const ReactLifeCycleOld = (Content) => {
  return class extends Content {
    static defaultProps = defaultProps;

    state = { number: 0 }

    wrapper = null;

    componentWillMount() {
      console.log('-------------------------componentWillMount-------------------------');
      console.log('set State number: 1')
      this.setState({
        number: 1
      });
    }

    componentDidMount() {
      console.log('-------------------------componentDidMount-------------------------')
    }

    componentWillUnmount() {
      console.log('-------------------------componentWillUnmount-------------------------')
    }

    componentWillReceiveProps(nextProps) {
      console.log(nextProps);
      console.log('-------------------------componentWillReceiveProps-------------------------')
    }

    shouldComponentUpdate() {
      console.log('-------------------------shouldComponentUpdate-------------------------');
      return true;
    }

    componentWillUpdate() {
      console.log('-------------------------componentWillUpdate-------------------------');
    }

    componentDidUpdate() {
      console.log('-------------------------componentDidUpdate-------------------------')
    }

    render() {
      console.log('-------------------------render-------------------------')
      return (
        <div>
          {
            super.render()
          }
          <button
            onClick={() => {
              console.log('-------------------------setState number++ -------------------------')
              this.setState({
                number: this.state.number + 1
              });
              setTimeout(() => {
                this.setState({
                  number: this.state.number + 1
                });
              }, 2000);
            }}
          >
            change state!
          </button>
        </div>
      );
    }
  }
};

export const ReactLifeCycleNew = (Content) => {
  return class extends Content {
    static defaultProps = defaultProps;

    state = { number: 0 }

    wrapper = null;

    componentWillMount() {
      console.log('-------------------------componentWillMount-------------------------')
    }

    componentDidMount() {
      console.log('-------------------------componentDidMount-------------------------')
    }

    componentWillUnmount() {
      console.log('-------------------------componentWillUnmount-------------------------')
    }

    componentWillReceiveProps(nextProps) {
      console.log(nextProps);
      console.log('-------------------------componentWillReceiveProps-------------------------')
    }

    shouldComponentUpdate() {
      console.log('-------------------------shouldComponentUpdate-------------------------');
      return true;
    }

    componentWillUpdate() {
      console.log('-------------------------componentWillUpdate-------------------------');
    }

    componentDidUpdate() {
      console.log('-------------------------componentDidUpdate-------------------------')
    }

    render() {
      console.log('-------------------------render-------------------------')
      return (
        <div>
          {
            super.render()
          }
          <button
            onClick={() => {
              console.log('-------------------------setState number++ -------------------------')
              this.setState({
                number: this.state.number + 1
              });
            }}
          >
            change state!
          </button>
        </div>
      );
    }
  }
};