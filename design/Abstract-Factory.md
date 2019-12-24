# 抽象工厂模式（对象创建型）

## 意图
提供一个创建一系列相关或相互依赖对象的接口，而无需指定它们具体的类。

## 适用性

以下情况可以使用Abstract Factory模式：
1. 一个系统要独立于它的产品的创建、组合和表示时。
2. 一个系统要由多个产品系列中的一个来配置时。
3. 当你要强调一系列相关的产品对象的设计以便联合使用时。
4. 当你提供一个产品类库，而只想显示它们的接口而不是实现时。

## 优缺点

1. 分离具体类：抽象工厂模式帮助你控制一个应用创建的对象的类。因为一个工厂封装创建产品对象的责任和过程，它将客户与类的实现分离。客户通过它们的抽象接口操作实例。产品的类名也在具体工厂的实现中被分离；它们不出现在客户代码中。
2. 它使得易于交换产品系列：一个具体工厂类在一个应用中仅出现一次 - 即在它初始化的时候。这使得改变一个应用的具体工厂变得很容易。它只需改变具体的工厂即可使用不同的产品配置。
3. 它有利于产品的一致性
4. 难以支持新种类的产品

## 实现 - maze

类`MazeFactory`可以创建迷宫的组件。它建造房间、墙壁和房间之间的门。它可以用于一个从文件中读取迷宫说明图，并建造相应迷宫的程序。或者它可以被用于一个随机建造迷宫的程序。建造迷宫的程序将`MazeFactory`作为一个参数，这样程序员就能指定要创建的房间、墙壁和门等类。
```
  class MazeFactory {
    public:
      MazeFactory();

      virtual Maze* MakeMaze() const
        { return new Maze; }
      
      virtual Wall* MakeWall() const
        { return new Wall; }

      virtual Room* MakeRoom(int n) const
        { return new Room(n); }

      virtual Door* MakrDoor(Room* r1, Room* r2) const
        { return new Door(r1, r2); }
  }
```

回想一下建立一个由两个房间和它们之间的门组成的小迷宫的成员函数 CreateMaze。 CreateMaze对类名进行硬编码，这使得很难用不同的组件创建迷宫.

以MazeFacotry为参数的新版本的CreateMaze
```
  Maze* MazeGame::CreateMaze (MazeFactory& factory) {
    Maze* aMaze = factory.MakeMaze();
    Room* r1 = factory.MakeRoom(1);
    Room* r2 = factory.MakeRoom(2);
    Door* aDoor = factory.MakeDoor(r1, r2);

    aMaze->AddRoom(r1);
    aMaze->AddRoom(r2);

    r1->SetSide(North, factory.MakeWall());
    r1->SetSide(East, aDoor);
    r1->SetSide(South, factory.MakeWall());
    r1->SetSide(West, factory.MakeWall());

    r2->SetSide(North, factory.MakeWall());
    r2->SetSide(East, factory.MakeWall());
    r2->SetSide(South, factory.MakeWall());
    r2->SetSide(West, aDoor);

    return aMaze;
  }
```

我们创建MazeFactory的子类EnchantedMazeFactory，这是一个创建施了魔法的迷宫的工厂。EnchantedMazeFactory将重定义不同的成员函数并返回Room、Wall等不同的子类。
```
  class EnchantedMazeFactory : public MazeFactory {
    public:
      EnchantMazeFactory();

      virtual Room* MakeRoom(int n) const
        { return new EnchantedRoom(n, CaseSpell()); }
      vitrual Door* MkarDoor(Room* r1, Room* r2) const
        { return new DoorNeedingSpell(r1, r2); }

    protected:
      Spell* CaseSpell() const;
  }
```

现在假设我们想生成一个房间里有炸弹的迷宫游戏。炸弹爆炸可以毁坏墙壁。所以我们需要RoomWithABomb和BombedWall。
我们将定义最后一个类是BombedMazeFactory，它是MazeFactory的子类，保证了墙壁是BombedWall类，房间是RoomWithABomb。
BombedMazeFactory仅需要重定义两个函数：
```
  Wall* BombedMazeFactory::MakeWall () const {
    return new BombedWall;
  }

  Room* BombedMazeFactory::MakeRoom(int n) const {
    return new RoomWithABombed(n);
  }
  
```

Abstract Factory类通常用工厂方法实现，但它们也可以用Prototype实现。
一个具体的工厂通常是一个单件