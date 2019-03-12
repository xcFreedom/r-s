## 准备工作

1. 前置库
   ```
     yum -y install gcc gcc-c++ autoconf pcre-devel make automake
     yum -y install wget httpd-tools vim
   ```

2. 查看本地nginx源
   ```
    yum list | grep nginx
   ```

3. 设置nginx源
   ```
    vi /etc/yum.repos.d/nginx.reop

    [nginx]
    name=nginx repo
    baseurl=http://nginx.org/packages/OS/osrelease/$basearch/
    gpgcheck=0
    enabled=1
   ```
   baseurl中的OS代表系统，osrealse代表系统版本
   ```
    baseurl=http://nginx.org/packages/centos/7/$basearch/
   ```
   
4. 下载nginx
   ```
    yum install nginx
   ```

5. 查看nginx版本
   ```
    nginx -v
   ```

6. 查看nginx安装位置
   ```
    rpm -ql nginx
   ```
   rpm是linux的rpm包管理工具，-q代表询问模式，-l代表返回列表。

7. 查看nginx.conf
   ```
    cd /etc/nginx
    ls
    vim nginx.conf
   ```
   内容如下：
   ```
    # 运行用户，默认是nginx，可以不设置
    user  nginx;

    #nginx进程，一般设置为和CPU核数一样
    worker_processes  1;

    # 错误日志存放目录
    error_log  /var/log/nginx/error.log warn;

    # 进程pid存放位置
    pid        /var/run/nginx.pid;


    events {
      # 单个后台进程的最大并发数
      worker_connections  1024;
    }

    http {
      # 文件扩展名于类型映射表
      include       /etc/nginx/mime.types;

      # 默认文件类型
      default_type  application/octet-stream;

      # 设置日志格式
      log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                        '$status $body_bytes_sent "$http_referer" '
                        '"$http_user_agent" "$http_x_forwarded_for"';

      # nginx访问日志存放位置
      access_log  /var/log/nginx/access.log  main;

      # 开启高效传输模式
      sendfile        on;

      # 减少网络报文段的数量
      #tcp_nopush     on;

      # 超时时间
      keepalive_timeout  65;

      # 开启gzip压缩
      #gzip  on;

      # 包含的子配置项位置和文件
      include /etc/nginx/conf.d/*.conf;
    }
   ```

8. 查看子配置项
   ```
    cd conf.d
    vim default.conf
   ```
   ```
    server {
      listen       80;   #配置监听端口

      server_name  localhost;  //配置域名

      #charset koi8-r;     
      #access_log  /var/log/nginx/host.access.log  main;
      
      location / {
          root   /usr/share/nginx/html;     #服务默认启动目录
          index  index.html index.htm;    #默认访问文件
      }

      #error_page  404              /404.html;   # 配置404页面

      # redirect server error pages to the static page /50x.html

      error_page   500 502 503 504  /50x.html;   #错误状态码的显示页面，配置后需要重启

      location = /50x.html {
          root   /usr/share/nginx/html;
      }


      # proxy the PHP scripts to Apache listening on 127.0.0.1:80
      #
      #location ~ \.php$ {
      #    proxy_pass   http://127.0.0.1;
      #}
      # pass the PHP scripts to FastCGI server listening on 127.0.0.1:9000
      #
      #location ~ \.php$ {
      #    root           html;
      #    fastcgi_pass   127.0.0.1:9000;
      #    fastcgi_index  index.php;
      #    fastcgi_param  SCRIPT_FILENAME  /scripts$fastcgi_script_name;
      #    include        fastcgi_params;
      #}
      # deny access to .htaccess files, if Apache's document root
      # concurs with nginx's one
      #
      #location ~ /\.ht {
      #    deny  all;
      #}
    }
   ```

9. 启动Nginx服务
    * nginx直接启动
       ```
        nginx
       ```
    * 使用systemctl命令启动（Linux命令启动，这种方法无论启动什么服务都是一样的，只是换一下服务的名字）
       ```
        systemctl start nginx.service
       ```

10. 查看Nginx服务
    ```
      ps aux | grep nginx
    ```

11. 停止Nginx服务的四种方法
    1. 立即停止服务
       ```
        nginx -s stop
       ```
    2. 从容停止服务
       ```
        nginx -s quit
       ```
    3. killall杀死进程
       ```
        killall nginx
       ```
    4. systemctl停止
       ```
        systemctl stop nginx.service
       ```

12. 重启Nginx服务
    1. systemctl重启
       ```
        systemctl restart nginx.service
       ```
    2. 重新载入配置文件
       ```
        nginx -s reload
       ```

## 访问控制
```
  location / {
    deny  ***.***.***.*** # 禁止访问
    allow ***.***.***.*** # 允许访问
  }
```
在同一个块下的两个权限指令，先出现的设置会覆盖后出现的设置

## Nginx设置虚拟主机

虚拟主机是指在一台物理主机服务器上划分出多个磁盘空间，每个磁盘空间都是一个虚拟主机，每台虚拟主机都可以对外提供Web服务，并且互不干扰。在外间看来，虚拟主机就是一台独立的服务器主机

1. 基于端口号配置虚拟主机。原理就是Nginx监听多个端口，根据不同的端口号，来区别不同的网站
   ```
    server {
      listen       8001;
      server_name  localhost;
      root         /usr/share/nginx/html/html8001;
      index        index.html
    }
   ```

2. 基于IP配置虚拟主机
   ```
    server {
      listen       80;
      server_name  ***.***.***.***;
      root         /usr/share/nginx/html/html8001;
      index        index.html;
    }
   ```

3. 使用域名设置虚拟主机
   1. 先对域名进行解析，这样域名才能正确定位到我们的云服务器上，新建了```jsxiaocheng.com```和```api.jsxiaocheng.com```这两个解析
   2. 更改nginx配置
      ```
        server {
          listen          80;
          server_name     jsxiaocheng.com;
          ...
        }


        server {
          listen          80;
          server_name     api.jsxiaocheng.com;
          ...
        }
      ```


## 查看配置文件花括号对应

1. ```grep -Ei "\{|\}" nginx.conf```
2. ```grep -Ei "\{|\}" nginx.cong | cat -A```


## Nginx反向代理

正向代理：假设我们访问```www.google.com```，因为被墙的原因，访问不了，这时候我们连VPN，VPN的这台服务器是可以访问```www.google.com```的，这就是正向代理的一种方式。它把不让我们访问的服务器的请求，代理到一个可以访问该请求的代理服务器上（proxy服务器），再转发给我们。简单来说就是我们想访问目标服务器，但是没有权限。这时候代理服务器有权限访问服务器，并且我们有访问代理服务器的权限，这时候我们就可以通过访问代理服务器，代理服务器访问真实服务器，把内容给我们呈现出来。

反向代理：客户端发送请求，想要访问服务器上的内容。内容发送到代理服务器上，这个代理服务器再把请求发送到自己设置好的内部服务器上，而用户想获得的内容就在这些设置好的服务器上。
反向代理的好处：
  * 安全性：用户只能通过外来网络访问代理服务器，并且不知道自己访问的真实服务器是哪一台，可以很好的提供安全保护
  * 功能性：反向代理的主要用途是为多个服务器提供负载均衡、缓存等功能，负载均衡就是一个网站的内容被部署在若干服务器上，可以把这些服务器看成一个集群，那Nginx可以将接收到的客户端请求“均匀的”分配到这个集群中所有的服务器上，从而实现服务器压力的平均分配。

```
  server {
    listen         80;
    server_name    test.jsxiaocheng.com;

    location / {
      proxy_pass   http://jsxiaocheng.com;
    }
  }
```

反省代理还有些常用的指令：
* proxy_set_header: 在将客户端请求发送给后端服务器之前，更改来自客户端的请求头信息。
* proxy_connect_timeout: 配置Nginx与后端服务器尝试建立连接的超时时间；
* proxy_read_timeout: 配置Nginx向后端服务器发出read请求后的超时时间；
* proxy_send_timeout: 配置Nginx向后端服务器发怵write请求后的超时时间；
* proxy_redirect: 用于修改后端服务器返回的响应头中的location和refresh；

## Nginx适配PC或移动设备

```
server {
    listen         80;
    server_name    api.jsxiaocheng.com;

    location / {
        root       /usr/share/nginx/html/pc;
        if ($http_user_agent ~* '(Android|webOS|iPhone|iPod|BlackBerry)') {
          root     /usr/share/nginx/html/mobile;
        }
        index      index.html;
    }
}
```

## Nginx的Gzip压缩配置

Nginx提供了专门的gzip模块，并且模块中的指令非常丰富：
* gzip: 该指令用于开启或关闭gzip模块；
* gzip_buffers: 设置系统获取鸡哥单位的缓存用于存储gzip的压缩结果数据流。
* gzip_comp_level: gzip压缩比，压缩级别是1-9，1的压缩级别最低，9的压缩级别最高。压缩级别越高压缩率越大，耗时越长。
* gzip_disable: 可以通过该指令对一些特定的User-Agent不使用压缩功能。
* gzip_min_length: 设置允许压缩的页面最小字节数，页面字节数从相应消息头的Content-length中进行获取。
* gzip_http_version: 识别HTTP协议版本
* gzip_proxied： 用于设计启用或禁用从代理服务器上收到相应内容gzip压缩。
* gzip_vary: 用于在响应消息头中添加Vary：Accept-Encoding，使代理服务器根据请求头中的Accept-Encoding识别是否启用gzip压缩。