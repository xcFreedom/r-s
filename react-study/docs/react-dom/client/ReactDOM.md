# ReactDOM


## ReactDOM定义


reactdom
```
  /**
     @param {React$Element<any>} element
     @param {*} container        DOMContainer
     @param {Function} [callback]
  */
  const ReactDOM = {
    render(element, container, callback) { // 项目入口
      return legacyRenderSubtreeIntoContainer( // 从container开始渲染子树
        null,
        element,
        container,
        false,
        callback
      );
    }
  }
```

## 测试1

## 测试2