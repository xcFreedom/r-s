import React, { Component } from 'react'
import PropTypes from 'prop-types'

export const AsyncComponent = (cb) => (
    class AsyncComponent extends Component {
        constructor(props) {
            super(props);
            this.state = {};
        }

        componentWillMount() {
            cb().then(Content => {
                console.log(Content);
                this.setState({ Content: Content.default })
            })
        }
        
        render() {
            const { Content } = this.state;
            return (
                Content
                    ? <Content {...this.props} />
                    : 'loading'
            )
        }
    }
);