# JS构造器模式

## What？

在面向对象编程中，构造器是一个当新建对象的内存被分配后，用来初始化该对象的一个特殊函数。

对象构造器是被用来创建特殊类型的对象的。首先它要准备使用的对象，其次在对象初次呗创建时，通过接收参数，构造器要用来对成员的属性和方法进行赋值。

```
function defineProp(obj, key, value) {
  const config = {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  };
  Object.defineProperty(obj, key, config);
}

const person = Object.create(null);

defineProp(person, 'car', 'Delorean');
defineProp(person, 'dateOfBirth', '1981');
defineProp(person, 'hasBeard', false);



const driver = Object.create(person)l

defineProp(driver, 'topSpeed', '100mph');

driver.dateOfBirth // '1981'
driver.hasBeard // false
driver.topSpeed // 100mph
```

JS构造器模式就是JS的类写法
```
  function Car(a) {
    this.a = a;
  }
  Car.prototype.getValue = function() {
    return this.a
  }
```