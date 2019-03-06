# MVVM与虚拟DOM

## 背景

从前后端分离开始，前端就一直在探索未来的发展方向。从最初的多页面，每个页面单独引入JS、CSS资源开始，我们需要手动管理JS、CSS文件引入顺序，防止代码执行先后顺序出错，到后来的requireJS，动态引入JS、CSS文件。前端开发体验有了很大的提升。但是前端开发一直存在一个尴尬的问题，手动操作DOM。这个问题的困难点我认为主要在于两方面，一方面是因为历史原因，不同的浏览器，或者浏览器不同的版本，对DOM操作的API或者行为是不尽相同的，所以我们需要大量兼容性处理，这方面比较代表的库是jQuery。另一方面也就是我们今天主要介绍的内容。

## 前端MVC模式

无论是MVVM，还是MVP都是从MVC模式上演化而来的，所以我们先了解一下前端的MVC模式。MVC模式将程序划分为三个角色，在前端中它们的分层应该是这样的：
* View: 视图，数据展示，接受用户输入。
* Controller：响应用户输入，对数据操作。
* Model：管理程序数据，定义操作数据的行为。

其工作流程如下：
![MVC](/image/js_mvc_2.png)

用户在View上进行操作之后，用户的操作响应在Controller上，Controller根据用户的操作调用Model层的API，数据更新之后自然视图View展现的内容也需要更新。Model层此时可以向所有关联的视图发出通知，收到通知的视图重新获取最新的数据。MVC中的数据流是双向的，模型通知视图数据已经更新，视图查询模型中的数据，

前端目前的框架中，Backbone.js是贴近MVC模式的框架，但它并不是完全符合MVC模式的，前端框架中，我们习惯说Angular是MVP模式，Vue是MVVM模式，虽然它们都不是完全贴合的，我们可以统称为MV*模式.

我们现在以Backbone举例。假设我们有一个JS照片库的应用程序，在照片库中，照片的概念需要拥有自己的Model，因为它代表了一种独特的特定领域模型。这样的模型可以包含相关属性，例如标题，图片源和附加数据。特定照片存储在模型的实例总，并且模型是可以重复使用的。我们看一下Backbone实现的非常简单的模型示例。
```
  const Photo = Backbone.Model.extend({
    // 图片的默认属性
    defaults: {
      src: 'test.jpg',
      title: '一个测试的图片',
      viewed: false
    },
    initialize() {
      this.set({ src: this.defaults.src });
    }
  });
```
Backbone中，提供将模型组合在一起的方法，这些组被称为```collections```，如果它包含的任何模型被修改，collection允许我们基于它的通知编写逻辑，避免了手动观察单个模型实例。
```
  const PhotoGallery = Backbone.Collection.extend({
    model: Photo,

    // 过滤已经被查看过的图片
    viewed() {
      return this.filter(photo => photo.get('viewed'))
    },

    unviewed() {
      return this.without.apply(this, this.viewed());
    }
  });
```

View是Model的直观表示，它呈现了当前状态的视图，View通常会观察Model，并且在Model更改的时候得到通知，从而允许视图更新自身
```
  <script id="photo_template" type="text/template">
    <li class="photo">
      <h2><%= title %></h2>
      <img class="source" src="<%= src %>"/>
    </li>
  </script>
  const PhotoView = Backbone.View.extend({
    tagName: 'li',
    template: _.template($('#photo_template').html()),
    events: {
      'click img': 'toggleViewed'
    },
    initialize() {
      _.bindAll(this, 'render');
      this.model.bind('change', this.render);
      this.model.bind('destory', this.remove);
    },

    render() {
      $(this.el).html(this.template(this.model.toJSON()));
      return this;
    },

    toggleViewed() {
      this.model.viewed();
    }
  });
```

Controller是Model和View之间的中介，通常负责两个任务：在模型更改是更新视图，并在用户操作视图时更新模型。
在我们这个照片库程序中，控制器负责处理用户对特定照片的编辑，以及在编辑完成后更新模型。
在Backbone中，Backbone.View和Backbone.Router共享Controller的责任，View不仅负责视图渲染，也承担了事件的监听处理。（事实上现在的前端框架基本都是MV*系列的。）
```
  const PhotoRouter = Backbone.Router.extend({
    routes: { 'photos/:id': 'route' },
    route(id) {
      const item = photoCollection.get(id);
      const view = new PhotoView({ model: item });
      something.html(view.render().el);
    }
  });
```

在这个例子中，View、Model、Controller的分级还是比较清晰的，它们是1 : 1 : 1的关系，但是这只是一种理想状态。在实际应用中，一个View可能会依靠多个Model支持，并且交互的增加导致View的控制代码迅速膨胀，难以维护；Controller还必须承担将用户的输入转发到对应的Model中；单个Model的更新需要通知多个View，Model也不可能保持纯粹的请求数据，它还需要保存大量的UI状态，比如Tab页切换。

![图片](/image/js_mvc_3.png)



## MVVM框架的出现

在之前的例子中，我们可以看到有几处开发痛点：开发需要手动在View中监听Model变化，同时当数据更新时，需要主动使用DOM API 更新视图；当DOM发生变化时，需要开发者主动获取DOM的数据，把数据同步或者提交；同样的数据映射到不同的视图时，我们不仅需要新的视图，还需要一套新的DOM操作，复用性低；DOM操作穿插在逻辑中，使得逻辑繁琐，代码可维护性差；

所以，我们希望：
1. 业务逻辑应该专注于操作Model；
2. 数据与视图间的同步，不再需要人为干预；
3. 更新DOM不希望有大量的显示操作；
   
同时，我们还希望：
1. 方便，快速的实现视图逻辑；
2. 方便地创建、连接和复用组件；
3. 管理状态和路由；

基于这些原因，MVVM模式出现在前端开发中。

## 什么是MVVM

MVVM就是Model-View-ViewModel，View层代表了视图、模版，负责将数据模型转化为UI展示出来。Model层代表了模型、数据，可以在Model层中定义数据修改和操作。ViewModel层连接Model和View。

在MVVM的架构下，View层和Model层并没有直接的联系，而是通过ViewModel层进行交互。ViewModel层通过双向数据绑定将View层和Model层连接了起来，使得View层和Model层的同步工作完全是自动的。因此开发者只需关注业务逻辑，无需手动操作DOM，复杂的数据状态维护交给框架统一管理。

MVVM模式的模型如下图：

![MVVM](/image/js_mvvm_1.png)

MVVM框架的核心就是ViewModel的实现，ViewModel的实现中比较重要的就是双向绑定这一功能的实现，在不同的框架中，它的实现方式是不同的，下面列出了Angular和Vue的实现思路。

#### 脏检查机制

Angular采用的是脏检查机制。当发生了某种事件（比如用户输入），Angulat会循环遍历所有的数据观察者，判断当前值是否和之前的值有区别，来决定是否更新视图。

脏数据检测虽然存在低效的问题，但是不关心数据是通过什么方式改变的，都可以完成任务。

#### 数据劫持

Vue内部使用了```Object.defineProperty()```来实现双向绑定，通过这个函数可以监听到```set```和```get```行为，但是这种方式是存在缺陷的：
1. 只能对属性进行数据劫持，所以需要深度遍历整个对象。下面是一个简单的例子：
  ```
    function defineReactive(obj, key, val) {
      Object.defineProperty(obj, key, {
        enumerable: true,
        configurable: true,
        get: function reactiveGetter() {
          console.log('get value', val)
          return val
        },
        set: function reactiveSetter(newVal) {
          console.log('change value', newVal)
          val = newVal
        }
      })
    }
    function observe(obj) {
      Object.keys(obj).forEach(key => {
        defineReactive(obj, key, obj[key])
      })
    }
    const test = {a: {b: 1}};
    observe(test);
    test.a //打印 get value { b: 1 };
    test.a.b // 打印  get value { b: 1 };
    test.a.b = 2; //打印 get value { b: 1 };
  ```
  这个例子可以看出，无论我们对```test.a.b```取值还是赋值，都没有监听到这个行为。因为需要深度遍历整个对象。
2. 对于数组的部分原生方法不能监听到变化，Vue监听数组变化是通过hack的方法，重写了部分数组方法。

## Vue双向绑定的简单实现

Vue官方文档的附图：

![Vue](/image/vue.webp)

拿一个Vue的例子来说明在Vue中MVVM的分层：
```
  <script scr="vue.js"></script>
  <!-- 这里是View -->
  <div id="demo">
    {{message}}
    <input v-model="message">
  </div>

  <script>
    const vm = new Vue({ // ViewModel在Vue内部实现，我们可以把vm这个对象当作ViewModel
      el: '#demo',
      data: { // data是 Model
        message: 'hello'
      }
    });
  </script>
```
结合示例代码说明一下，Vue中Model是一个简单的JS对象。View通过DOM Listener和Model建立绑定关系。Model通过Directives(指令)，如代码中的```{{message}}```，```v-model="message"```与View建立绑定关系。指令是混杂在html片段中的，需要能够正确的解析指令和表达式，不同的指令需要不同的DOM更新方式；Model的更新触发指令的视图更新需要有一定的保证机制；另外DOM Listener需要抹平浏览器差异；下面是Vue总体的设计思路：

![VUE](/image/vue_mvvm.webp)

在绑定阶段，Observer获取new Vue()中的data数据，通过Object.defineProperty赋予getter和setter。Compiler对DOM节点指令进行扫描和解析，并订阅Watcher来更新视图。Watcher在消息订阅器Dep中进行管理。在更新阶段，当数据变更是，会出发setter函数，立即会触发相应的通知，开始遍历所有的订阅者，调用其指令的update方法，进行视图更新。

从上面的思路出发，这里给出Vue的简单实现
```
  // html
  <div id="app">
    <input type="text" v-model="text">
    {{ text }}
  </div>
  // js
  <script>
    function nodeToFragment(node, vm) {
      const flag = document.createDocumentFragement();
      let child;
      while (child = node.firstChild) {
        compile(child, vm);
        flag.appendChild(child);
      }
      return flag;
    }

    function observe(obj, vm) {
      // Object.keys获取对象的所有的key，返回一个字符串数组
      Object.keys(obj).forEach((key) => {
        defineReactive(vm, key, obj[key]);
      });
    }

    function defineReactive(obj, key, val) {
      const dep = new Dep();
      Object.defineProperty(obj, key, {
        get() {
          if (Dep.target) {
            dep.addSub(Dep.target);
          }
          return val;
        },
        set(newVal) {
          if (newVal === val) return;
          val = newVal;
          dep.notify();
        }
      });
    }

    function compile(node, vm) {
      const reg = /\{\{(.*)\}\}/;
      // 元素节点
      if (node.nodeType === 1) {
        const attr = node.attributes;
        for (let i = 0; i < attr.length; i++) {
          if (attr[i].nodeName === 'v-model') {
            let name = attr[i].nodeValue;
            node.addEventListener('input', function(e) {
              vm[name] = e.target.value;
            });
            node.value = vm[name];
            node.removeAttribute('v-model');
          }
        }
        new Watcher(vm, node, name, 'input');
      }

      // 文本节点
      if (node.nodeType === 3) {
        if (reg.test(node.nodeValue)) {
          let name = RegExp.$1;
          name = name.trim();
          new Watcher(vm, node, name, 'text');
        }
      }
    }

    function Watcher(vm, node, name, nodeType) {
      Dep.target = this;
      this.name = name;
      this.node = node;
      this.vm = vm;
      this.nodeType = nodeType;
      this.update();
      Dep.target = null;
    }

    Watcher.prototype = {
      constructor: Watcher,
      update() {
        this.get();
        if (this.nodeType === 'text) {
          this.node.nodeValue = this.value;
        }
        if (this.nodeType === 'input') {
          this.node.value = this.value;
        }
      },
      get() {
        this.value = this.vm[this.name]; // 触发相应属性的get
      }
    }

    function Dep() {
      this.subs = [];
    }
    Dep.prototype = {
      constructor: Dep,
      addSub(sub) {
        this.subs.push(sub);
      },
      notify() {
        this.subs.forEach(sub => sub.update());
      }
    }

    function Vue(options) {
      this.data = options.data;
      const data = this.data;
      observe(data, this);
      const id = options.el;
      const el = document.getElemenetById(id);
      const dom = nodeToFragment(el, this);
      el.appendChild(dom);
    }
  </script>
```

## 虚拟DOM产生的原因

虽然MVVM框架的出现，让开发从DOM操作中解脱出来，但是这并不意味着我们不再需要调用DOM API了，笑。框架内部对DOM节点的创建、删除、更新仍然需要以来DOM API。而JS操作DOM，会引发浏览器的重绘/重排，尤其是重排，对性能的影响较大，因为浏览器需要重新计算各元素的位置、大小等信息。MVVM中Model于View的同步，这也意味着大量的View变动，那么怎么能降低这一影响呢？这就是虚拟DOM这一个概念出现的来源。

虚拟DOM简单来说就是通过JS对象模拟DOM对象，从而频繁操作DOM，使得浏览不停的重新绘制界面而引发的卡顿。

举个例子：
```
  // 这里有一个ul，其中包含了5个li
  <ul>
    <li></li>
    <li></li>
    <li></li>
    <li></li>
    <li></li>
  </ul>
  // 我们用数组来表示上面这段html
  [1, 2, 3, 4, 5]
  // 现在我们用 [1, 2, 5, 4]，来替换上面那个数组
```
我们可以看出先前的ul中的第三个li被移除了，第四项和第五项交换了位置，但是以上操作对应到DOM中，代码就是这样的
```
ul.childNodes[2].remove();
let fromNode = ul.childNodes[4];
let toNode = ul.childNodes[3];
ul.replaceChild(fromNode.cloneNode(true), toNode);
ul.replaceChild(toNode.cloneNode(true), fromNode);
```
在实际操作中，我们还需要给每个节点一个标记，作为判断同一个节点的依据，事实上React、Vue、小程序都是这样做的。
既然DOM对象可以通过JS对象模拟，那么返回来也可以通过JS对象来渲染出对应的DOM

```
  class Element {
    constructor(tag, props, children, key) {
      this.tag = tag;
      this.props = props;
      if (Array.isArray(children)) {
        this.children = children;
      } else if (typeof children === 'string') {
        this.key = children;
        this.children = null;
      }

      if (key) {
        this.key = key;
      }
    }

    render() {
      const root = this.create();
      document.body.appendChild(root);
      return root;
    }

    create() {
      return this._createElement(this.tag, this.props, this.children, this.key)
    }

    _createElement(tag, props, children, key) {
      let el = document.createElement(tag);
      for (let prop in props) {
        if (props.hasOwnProperty(prop)) {
          el.setAttribute(prop, props[prop]);
        }
      }
      if (key) {
        el.setAttribute('key', key);
      }
      if (children) {
        children.forEach((element) => {
          let child;
          if (element instanceof Element) {
            child = this._createElement(element.tag, element.props, element.children, element.key);
          } else {
            child = document.createTextNode(element);
          }
          el.appendChild(child);
        });
      }
      return el;
    }
  }
```

## React中的diff算法
既然我们已经通过JS来模拟了DOM节点，接下来我们需要判断旧数据和新数据之间的差异，然后将差异一次性更新到DOM中。

DOM是多叉树的结构，如果需要完整对比两颗数的差异，传统diff算法通过递归对节点进行依次对比，时间复杂度为O(n ^ 3)，React结合实际分析，制定大胆策略，讲时间复杂度降低到O(n);

diff策略:
1. Web UI 中 DOM 节点跨层级的移动操作特别少，可以忽略不计。
2. 拥有相同类的两个组件将会生成相似的树形结构，拥有不同类的两个组件将会生成不同的树形结构。
3. 对于同一层级的一组子节点，它们可以通过唯一 id 进行区分。

#### 不同节点类型的比较
React中比较两个虚拟DOM节点，当两个节点不同时，分为两种情况：
1. 节点类型不同。
2. 节点类型相同，属性不同。

对于第一种情况，当树中的同一位置前后输出了不同类型的节点，React直接删除前面的节点，然后创建并插入新的节点，简单来说，让一个节点从div变成span时，简单的直接删除div节点，并插入一个新的span节点。需要注意的是，删除节点意味着彻底销毁该节点，而不再比较是否有另一个节点等同于该删除的节点。同时该删除的节点之下如果有子节点，那么这些子节点也会被完全删除，不再进行后面的比较。这个逻辑也同样被应用再React组件的比较中。

#### 逐层节点比较
React中，树的比较算法其实没有特别复杂，两颗树只会对同一层次的节点进行比较，如图：
![逐层比较](/image/diff_tree.png)
React只会对相同颜色方框内的节点进行比较，当发现节点已经不存在，则该节点及其子节点会被完全删除掉。这样只需要对树进行一次遍历，便能完成整个DOM树的比较；


感受一下：
```
    Old                        New
       A                           A
      / \                         / \
     /   \                       /   \
    B     D       ==>           D     B
   /                                   \
  C                                     C
```
就上面两树的变化，传统diff算法首先要对比每个节点是否相同，也就是：
```
  OA -> NA
  OA -> ND
  OA -> NB
  OA -> NC
  OB -> NA
  ...
```
查找不同的时间复杂度为O(n ^ 2)，找到差异后计算最小转换方式，最终结果为O(n ^ 3);

React策略：
```
  OA -> NA // 相同
  OB -> ND // 不同，删除OB节点
  OD -> NB // 不同，删除OD节点
  Null -> NC // old树没有
```
所有节点只遍历一次，时间复杂度为O(n);