# 工厂模式

工厂模式是另一种关注对象创建概念的创建型模式。

它的领域中同其他模式的不同之处在于它没有明确要求我们要使用一个构造器。取而代之，一个工厂能提供一个创建对象的公共接口，我们可以在其中指定我们希望被创建的工厂对象的类型。

试想一下，在我们被要求创建一种类型的UI组件时，我们就有一个UI工厂。并不是通过直接使用new操作符，或者通过另外一个构造器来创建这个组件，我们取而代之的向一个工厂对象索要一个新的组件。我们告知工厂我们需要什么类型的组件，工厂会将其初始化，然后返回供我们使用。

```
function Car(options) {
  this.doors = options.doors || 4;
  this.state = options.state || 'brand new';
  this.color = options.color || 'silver';
}

function Truck(options) {
  this.state = options.state || 'used';
  this.wheelSize = options.wheelSize || 'large';
  this.color = options.color || 'blue';
}

function VehicleFactory() {}

VehicleFactory.prototype.vehicleClass = Car;
VehicleFactory.prototype.createVehicle = function(options) {
  if (options.vehicleType === 'car') {
    this.vehicleClass = Car;
  } else {
    this.vehicleClass = Truck;
  }

  return new this.vehicleClass(options);
}

var carFactory = new VehicleFactory();
var car = carFactory.createVehicle({
  vehicleType: 'car',
  color: 'yellow',
  doors: 6,
});
```

```
var movingTruck = carFactory.createVehicle( {
                      vehicleType: "truck",
                      state: "like new",
                      color: "red",
                      wheelSize: "small" } );
```

```
// 这段代码略蠢，没啥屁用
function TruckFactory () {}
TruckFactory.prototype = new VehicleFactory();
TruckFactory.prototype.vehicleClass = Truck;

var truckFactory = new TruckFactory();
var myBigTruck = truckFactory.createVehicle( {
                    state: "omg..so bad.",
                    color: "pink",
                    wheelSize: "so big" } );
```

## 何时使用工厂模式

* 当我们的对象或者组件设置涉及到高程度级别的复杂度时。
* 当我们需要根据我们所在的环境方便的生成不同对象的实体时。
* 当我们在许多共享同一个属性的许多小型对象或者组件上工作时。
* 当带有其他仅仅需要满足一种API约定的对象的组合对象工作时，这对于解耦来说是有用的。

## 抽象工厂

抽象工厂的目标是以一个通用的目标将一组独立的工厂进行封装。它将一堆对象的实现细节从它们的一般用例中分离。
抽象工厂应该被用在一种 必须从 其 创建或生成对象 的方式处 独立，或者需要同多种类型的对象一起工作的系统中。

🌰：一个发动机工厂，它定义了获取/注册发动机类型的方式。抽象工厂会被命名为AbstractVehicleFactory。抽象工厂将允许像car或者truck的发动机类型的定义，并且构造工厂将仅实现满足发动机合同的类。

```
var AbstractVehicleFactory = (function () {
  var types = {};
  return {
    getVehicle(type, customizations) {
      var Vehicle = types[type];
      return Vehicle ? (new Vehicle(customization)) : null;
    },
    registerVehicle(type, Vehicle) {
      var proto = Vehicle.prototype;

      if (proto.drive && proto.breakDown) {
        types[type] = Vehicle;
      }

      return AbstractVehicleFactory;
    }
  }
})()
```