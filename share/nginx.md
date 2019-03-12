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


## 查看配置文件花括号对应

1. ```grep -Ei "\{|\}" nginx.conf```
2. ```grep -Ei "\{|\}" nginx.cong | cat -A```