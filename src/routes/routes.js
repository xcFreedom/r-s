import React, { Component } from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

import { AsyncComponent } from './asyncComponent';
import LifeCycle from '~/containers/life-cycle/life-cycle';

const AsyncHome = AsyncComponent(() => import('~/containers/home/home'));

export default class Routes extends Component {
  render() {
    return (
      <BrowserRouter>
        <Switch>
          <Route exact path="/" component={AsyncHome} />
          <Route exact path="/lifecycle" component={LifeCycle} />
        </Switch>
      </BrowserRouter>
    );
  }
}