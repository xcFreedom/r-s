```
  var mySingleton = (function () {
    var instance;

    function init() {
      function privateMethod() {
        console.log('I am private');
      }

      var privateVariable = 'i\'m also private';

      var privateRandomNumber = Math.random();

      return {
        publicMethod() {
          console.log('public')
        },
        getRandomNumber() {
          return privateRandomNumber;
        },
      };
    }

    return {
      getInstance() {
        if (!instance) {
          instance = init();
        }
        return instance;
      }
    }
  })()
```


* 每个类只有一个实例，这个实例必须通过一个广为人知的接口，来被客户访问。
* 子类如果要扩展这个唯一的实例，客户可以不用修改代码就能使用这个扩展后的实例。

```
  mySingleton.getInstance = function() {
    if (this._instance == null) {
      if (isFoo()) {
        this._instance = new FooSingletion();
      } else {
        this._instance = new BasicSingleton();
      }
    }
    return this._instance;
  }
```