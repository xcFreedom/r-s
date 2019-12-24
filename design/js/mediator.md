# 中介者模式

中介者是一个行为设计模式，通过将组件质检显示的直接的引用替换成通过中心点来交互的方式，来做到松耦合。
从实现角度讲，中介者模式是观察者模式中的共享被观察者对象。在这个系统中的对象之间直接的发布/订阅关系被牺牲掉了，取而代之的是维护一个通信的中心节点。

也可以认为是一个补充-用于应用级别的通知，例如不同子系统质检的通信，子系统本身很复杂，可能需要使用发布/订阅模式来做内部组件之间的解耦。

## 基础实现
```
  var mediator = (function () {
    var topics = {};

    var subscribe = function(topic, fn) {
      if (!topics[topic]) {
        topics[topic] = [];
      }

      topics[topic].push({ context: this, callback: fn });

      return this;
    };

    var publish = function(topic) {
      var args;
      if (!topics[topic]) {
        return false;
      }
      args = Array.prototype.slice.call(arguments, 1);

      for (var i = 0, l = topics[topic].length; i < l; i++) {
        var subscription = topics[topic][i];
        subscription.callback.apply(subscription.context, args);
      }
      return this;
    }

    return {
      publish,
      subscribe,
      installTo(obj) {
        obj.subscribe = subscribe;
        obj.publish = publish;
      },
    };
  })()
```

## 高级实现
为中间人支持主题命名空间，用户拆卸和一个更加稳定的发布/订阅系统。
首先，让我们实现subscription的概念，我们可以考虑一个中间人主题的注册。
通过生成对象实体，我们稍后能够简单的更新认购，而不需要去取消注册，然后重新注册它们。subscription可以写成一个使用被称作一个选项对象或者一个上下文环境的函数。

```
(function(root) {
  function guidGenerator() {}

  function Subscriber(fn, options, context) {
    if (!this instanceof Subscriber) {
      return new Subscriber(fn, options, context);
    } else {
      this.id = guidGenerator();
      this.fn = fn;
      this.options = options;
      this.context = context;
      this.topic = null;
    }
  }
})();
```
当中间人 发布在 中间人实体 上 被调用的时候 中间人主题中包含的回调和子主题启动。它也包含操作数据列表的方法，

```
function Topic(namespace) {
  if (!(this instanceof Topic)) {
    return new Topic(namespace);
  } else {
    this.namespace = namespace || '';
    this._callbacks = [];
    this._topics = {};
    this.stopped = false;
  }
}

Topic.prototype = {
  constructor: Topic,
  AddSubscriber(fn, options, context) {
    var callback = new Subscriber(fn, options, context);
    this._callbacks.push(callback);
    callback.topic = this;
    return callback;
  },
}
```

我们的主题实体被当做中间人调用的一个参数被传递。使用一个方便实用的calledStopPropagation()方法，回调就可以进一步被传播开来
```
  StopPropagation: function() {
    this.stopped = true;
  }
```

我们也能够使得当提供一个GUID的标识符的时候检索订购用户更加容易：
```
GetSubscriber(identifier) {
  for (var x = 0, y = this._callbacks.length; x < y; x++) {
    if (this._callbacks[x].id === identifier || this._callbacks[x].fn === identifier) {
      return this._callbacks[x];
    }
  }

  for (var z in this._topics) {
    if (this._topics.hasOwnProperty(z)) {
      var sub = this._topics[z].GetSubscriber(identifier);
      if (sub !== undefined) {
        return sub;
      }
    }
  }
}
```

接着，在我们需要的情况下，我们也能够提供添加新主题，检查现有的主题或者检索主题的简单方法：
```
AddTopic(topic) {
  this._topics[topic] = new Topic(`${this.namespace ? this.namespace + ':' : ''}${topic}`);
}

HasTopic(topic) {
  return this._topics.hasOwnProperty(topic)；
}

ReturnTopic(topic) {
  return this._topics[topic];
}
```

如果我们觉得不再需要它们了，我们也可以明确的删除这些subscription，
```
RemoveSubscriber(identifier) {
  if (!identifier) {
    this._callbacks = [];
    for (var z in this._topics) {
      if (this._topics.hasOwnProperty(z)) {
        this._topics.RemoveSubscriber(identifier);
      }
    }
  }

  for (var y = 0, x = this._callbacks.length; y < x; y++) {
    if (this._callbacks[y].fn === identifier || this._callbacks[y].id === identifier) {
      this._callbacks[y].topic = null;
      this._callbacks.splice(y, 1);
      x--;
      y--;
    }
  }
}
```

通过递归子主题将发布任意参数的能够包含到订购服务对象中：
```
Publish: function( data ){

    for( var y = 0, x = this._callbacks.length; y < x; y++ ) {

        var callback = this._callbacks[y], l;
          callback.fn.apply( callback.context, data );

      l = this._callbacks.length;

      if( l < x ){
        y--;
        x = l;
      }
    }

    for( var x in this._topics ){
      if( !this.stopped ){
        if( this._topics.hasOwnProperty( x ) ){
          this._topics[x].Publish( data );
        }
      }
    }

    this.stopped = false;
  }
};
```

接着我们暴露我们将主要交互的调节实体。
```
function Mediator() {
  if (!(this instanceof Mediator)) {
    return new Mediator();
  } else {
    this._topics = new Topic('');
  }
}
```

想要更多先进的用力，我们可以看看调解支持的主题命名空间，下面这样的asinbox:messages:new:read.GetTopic 返回基于一个命名空间的主题实体。
```
Mediator.prototype = {
  contructor: Mediator,
  GetTopic: function(namespace) {
    var topic = this._topics,
      namespaceHierarchy = namespace.split(':');
    
    if (namespace === '') {
      return topic;
    }

    if (namespaceHierarchy.length > 0) {
      for (var i = 0, j = namespaceHierarchy.length; i < j; i++) {
        if (!topic.HasTopic(namespaceHierarchy[i])) {
          topic.AddTopic(namespaceHierarchy[i]);
        }

        topic = topic.ReturnTopic(namespaceHierarchy[i]);
      }
    }
  }

  return topic;
}
```

定义Mediator.Subscriber方法，它接受一个主题命名空间，一个将要被执行的函数，选项和又一个在订阅中调用函数的上下文环境。这样就创建了一个主题，如果这样的一个主题存在的话
```
Subscriber(topicName, fn, options, context) {
  var options = options || {},
      context = context || {},
      topic = this.GetTopic(topicName),
      sub = topic.AddSubscriber(fn, options, context);
  
  return sub;
}
```

根据这一点，我们可以进一步定义能够访问特定订阅用户，或者将他们从主题中递归删除的工具
```
GetSubscriber(identifier, topic) {
  return this.GetTopic(topic || '').GetSubscriber(identifier);
},
Remove(topicName, identifier) {
  return this.GetTopic(topicName).RemoveSubscriber(identifier);
}
```

我们主要的发布方式可以让我们随笔发布数据到选定的主题命名空间。
主题可以向下递归，例如：一个对a:b的post将发送到a:b:c和a:b:c:d，它将像这样呗使用Mediator.Publish('a:b', \[args\]);

```
Publish(topicName) {
  var args = Array.prototype.slice.call(arguments, 1),
      topic = this.GetTopic(topicName);
  args.push(topic);
  this.GetTopic(topicName).Publish(args);
}
```

## 优缺点

中介者模式最大的好处就是。它节约了对象或者组件之间的通信信道，这些对象或者组件存在于多对多到多对一的系统之中。由于解耦水平的因素，添加新的发布或者订阅者是相对容易的。

也许使用这个模式最大的缺点是它可以引入一个单点故障。在模块之间放置一个中间人也可能会造成性能损失，因为它们经常是间接地进行通信。由于松耦合的特性，仅仅盯着广播很难去确认系统是如何作出反应的。

这就是说，提醒我们自己解耦的系统有许多其他的好处，是很有用的 --- 如果我们的模块互相之间直接的进行通信，对于模块的改变会对我们系统的其他部分产生多米诺连锁效应。这个问题在解耦系统中很少需要被考虑到。

## 中介者与观察者

开发人员往往不知道中介者模式与观察者模式之间的区别。不可否认，这两种模式之间有一点点重叠。

“在观察者模式中，没有封装约束的单一对象”。取而代之，观察者和主题必须合作来维护约束。通信的模式决定于观察者和主题相互关联的方式：一个单独的主题经常有许多的观察者，而有时候一个主题的观察者是另一个观察者的主题。

中间人和观察者都提倡松耦合，然而，中间人默认使用让对象严格通过中间人进行通信的方式实现松耦合。观察者模式则创建了观察者对象，这些观察者对象会发布触发对象认购的感兴趣的事件。

中间人VS门面
不久我们的描述就将涵盖门面模式，但作为参考之用，一些开发者也想知道中间人和门面模式之间有哪些相似之处。它们都对模块的功能进行抽象，但有一些细微的差别。

中间人模式让模块之间集中进行通信，它会被这些模块明确的引用。门面模式却只是为模块或者系统定义一个更加简单的接口，但不添加任何额外的功能。系统中其他的模块并不直接意识到门面的概念，而可以被认为是单向的。