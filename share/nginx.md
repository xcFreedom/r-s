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