# 命令模式

命令模式的目标是将方法的调用、请求或者操作封装到一个单独的对象中，给我们酌情执行同时参数化和传递方法调用的能力。另外，它使得我们能将对象从实现了行为的对象，对这些行为的调用进行解耦。为我们带来了换出具体的对象，这翊更深程度的整体灵活性

具体类是对基于类的编程语言的最好解释，并且同抽象类的理解联系紧密。

抽象类定义了一个接口，但并不需要提供对它的所有成员函数的实现。

它扮演者驱动其他类的基类角色，被驱动类实现了缺失的函数而被成为具体类。

命令模式背后的一般理念是为我们提供了从任何执行中的命令分离出  发出命令的责任，取而代之将这一责任委托给其他的对象。

实现明智简单的命令对象，将一个行为和 对象 对调用这个行为的需求 都绑定到了一起。它们始终都包含一个执行操作。所有带有相同接口的命令对象能够被简单地根据需要调换，这被认为是命令模式最大的好处之一。

```
(function () {
  var CarManager = {
    requestInfo(model, id) {
      return model + id;
    },
    buy(model, id) {
      return 'buy success';
    },
    arrangeViewing(model, id) {
      return 'arrange viewing success'
    }
  }
})()
```

上面这段代码，调用者通过直接调用CarManager内部的方法，如果CarManager的核心API发生改变，可能需要所有直接访问这些方法的对象也跟着被修改，这可以被看成一种耦合，违背了OOP方法。

```
  CarManager.execute = function(name) {
    return CarManager[name] && CarManager[name].apply(CarManager, [].slice.call(argument, 1));
  }
```

我们的调用如下：
```
CarManager.execute('requestInfo', 'test', 123);
```