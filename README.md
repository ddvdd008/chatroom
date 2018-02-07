手把手教你用nodejs+express搭建一个简易的多人聊天室

前言
--
本文主要是笔者在学习node的时候，作为练手的一个小项目，花了几天空余时间，边码边写教程的一个过程。适用于对node理论知识看的多，实战少的同学，那么现在就让我们开始吧！（临近过年，手上story大多已经完成，今天下午就开始写点吧 ——码于2018-02-07 15:21）

准备工作
--
1. 新建一个文件夹 chatroom
2. 在终端输入以下命令，按照步骤npm（没装过的去官网安装下node和npm）会自动给你生成一个package.json文件
    npm init
    //package.json
    {
        "name": "chatroom",
        "version": "1.0.0",
        "description": "A simple chatroom",
        "main": "index.js",
        "scripts": {
            "test": "echo \"Error: no test specified\" && exit 1"
        },
        "repository": {
            "type": "git",
            "url": "git+https://github.com/ddvdd008/chatroom.git"
        },
        "keywords": [
            "chatroom",
            "nodejs",
            "express"
        ],
        "author": "ddvdd",
        "license": "ISC",
        "bugs": {
            "url": "https://github.com/ddvdd008/chatroom/issues"
        },
        "homepage": "https://github.com/ddvdd008/chatroom#readme"
    }
3.  安装express和socket.io 
    npm install express --save  
    npm install socket.io --save 
    //package.json自动新增依赖
    "dependencies": {
        "express": "^4.16.2",
        "socket.io": "^2.0.4"
    }
因为我们使用express框架写后端服务，用socket.io（Socket.io实际上是WebSocket的父集，Socket.io封装了WebSocket和轮询等方法，他会根据情况选择方法来进行通讯。）来对客户端和服务端建立一个持久链接，便于通讯。

到这里准备工作进行的差不多了，下面我们开始一步步实现。

搭建web服务器
--
##express创建服务
学过node同学应该不陌生，利用http.createServer就能简单的创建一个服务器，这次我们利用express来创建服务。在项目根目录创建一个app.js。
    /**
    * Created by ddvdd on 2018-02-07.
    */
    const express = require('express');  
    const app = express();               // 创建express实例，赋值给app。
    const fs = require('fs');            // 这个是node的文件读取模块，用于读取文件
    const path = require('path');        // 这是node的路径处理模块，可以格式化路径

    app.listen(3000,()=>{                
        console.log("server running at 127.0.0.1:3000");       // 代表监听3000端口，然后执行回调函数在控制台输出。
    });

    /**
    * app.get(): express中的一个中间件，用于匹配get请求，说的简单点就是node处理请求的路由，对于不同url请求，让对应的不同app.get()去处理
    * '/': 它匹配get请求的根路由 '/'也就是 127.0.0.1:3000/就匹配到它了
    * req带表浏览器的请求对象，res代表服务器的返回对象
    */
    app.get('/',(req,res)=>{
        res.redirect('/chat.html');      // express的重定向函数。如果浏览器请求了根路由'/',浏览器就给他重定向到 '127.0.0.1:3000/chat.html'路由中
    });


    /**
    * 这里匹配到的是/chat.html就是上面重定向到的路径。
    */
    app.get('/chat.html',(req,res)=>{
        fs.readFile(path.join(__dirname,'./public/chat.html'),function(err,data){       //读取文件，readFile里传入的是文件路径和回调函数，这里用path.join()格式化了路径。
            if(err){
                console.error("读取chat.html发生错误",err);                    //错误处理
                res.send('4 0 4');                                           //如果发生错误，向浏览器返回404
            } else {
                res.end(data);                  //这里的data就是回调函数的参数，在readFile内部已经将读取的数据传递给了回调函数的data变量。
            }                                    //我们将data传到浏览器，就是把html文件传给浏览器
        })
    });
你们看了以后会说，这express框架看来也没那么简便啊，一个最简单的发送单页面的方法跟node自带http.createServer没太大区别饿，也挺麻烦的。从目前来看确实如此，我这不是为了让你们容易理解嘛～ express提供了一个非常强大的中间件，帮我们托管静态资源文件，下面我们就来实现：
    app.use('/',express.static(path.join(__dirname,'./public')));        //一句话就搞定。 
代替原来的：
    app.get('/chat.html',(req,res)=>{
        fs.readFile(path.join(__dirname,'./public/chat.html'),function(err,data){       
            if(err){
                console.error("读取chat.html发生错误",err);                    
                res.send('4 0 4');                                           
            } else {
                res.end(data);                  
            }                                    
        })
    });
__dirname表示当前文件所在的绝对路径，所以我们使用path.join将app.js的绝对路径和public加起来就得到了public的绝对路径。用path.join是为了避免出现 ././public 这种奇怪的路径，express.static就帮我们托管了public文件夹中的静态资源。只要有 127.0.0.1：3000/XXX/AAA 的路径都会去public文件夹下找XXX文件夹下的AAA文件然后发送给浏览器。 

现在再来看这段代码是不是简介了很多，具体了解app.use()干了什么的同学可以去[这里](http://blog.csdn.net/u010977147/article/details/60956502)
##socket.io建立客户端和服务端的链接
创建完上面的服务后，我们需要把socket.io引用进来，让客户端和服务端建立长久链接。我们把app.js进行如下改造：
    /**
    * Created by ddvdd on 2018-02-07.
    */
    const express = require('express');  
    const app = express();               // 创建express实例，赋值给app。
    const server = require('http').Server(app);  
    const io = require('socket.io')(server);     //将socket的监听加到app设置的模块里。这两句理解不了的可以去socket.io官网去看
    const path = require('path');        // 这是node的路径处理模块，可以格式化路径

    server.listen(3000,()=>{                
        console.log("server running at 127.0.0.1:3000");       // 代表监听3000端口，然后执行回调函数在控制台输出。  
    });  
    ...
    ...
    app.use('/',express.static(path.join(__dirname,'./public')));        //一句话就搞定。  

    /*socket*/  
    io.on('connection',(socket)=>{              //监听客户端的连接事件  
        
    });  
io.on表示监听某个事件，该事件一发生，就触发回调函数。’connection‘就是一个事件名，它已经定义好了，只要用户连接上就会触发。现在app.js基本已经完成，我们在根目录执行：
    node app.js
![](https://github.com/ddvdd008/chatroom/raw/master/Logo/1517991609394.jpg)
现在访问http://127.0.0.1:3000/static/chat.html:
![](https://github.com/ddvdd008/chatroom/raw/master/Logo/1517991905275.jpg)
哎？啥也没有。。。那不废话！我们都没url请求对应的静态资源！
##添加静态html
我们在项目根目录创建public文件夹，public文件夹里面新建chat.html文件：
    <!DOCTYPE html>  
    <html lang="en">  
    <head>  
        <meta charset="UTF-8">  
        <title>聊天室</title>   
    </head>  
    <body>  
    这是我们的聊天室  
    </body>  
    </html>  
现在我们刷新下页面，你看页面出现了：
![](https://github.com/ddvdd008/chatroom/raw/master/Logo/1517992230366.jpg)
到这里其实一个最简单的浏览器和web服务器协作的项目就已经完成，后面我们要不断完善页面，给服务器后端加业务功能来实现多人聊天室。
基本功能实现
--
1. 登陆功能，我们需要一个用户名，（不需要密码），该用户名必须客户端服务器都有存储。每次传输信息基本都需要包括用户名，否则不知道是谁发的。
2. 群聊功能，我们需要分辨信息来己方和对方
##登陆功能实现
最基本的登陆界面由一个用户名输入框和登录按钮组成：
    //chat.html
    <!DOCTYPE html>  
    <html lang="en">  
    <head>  
    <meta charset="UTF-8">  
    <title>聊天室</title>
    <style>
        *{
            margin:0;
            padding:0;
            box-sizing: border-box;
            -webkit-box-sizing: border-box;
            -moz-box-sizing: border-box;
        }
        .container{
            position: absolute;
            top:0;
            left:0;
            right:0;
            bottom:0;
            background-color: grey;
            padding: 50px;
        }
        .container .title{
            width:300px;
            margin: 0 auto;
            font-size: 30px;
            font-family: 'Franklin Gothic Medium';
            font-weight: bold;
            text-align: center;
            margin-bottom:50px;
        }
        .container .login-wrap{
            width:400px;
            padding: 20px;
            border: 1px solid #000;
            margin: 0 auto;
            text-align: center;
        }
        .login-wrap .user-ipt{
            width:360px;
            text-align: center;
            vertical-align: middle;
        }
        .login-wrap .login-button{
           width:60px;
           height:24px;
           line-height:20px;
           font-size: 14px;
           padding: 2px 0;
           border-radius: 5px;
           margin-top:10px;
        }
    </style>   
    </head>  
    <body>  
        <div class="container">
            <div class="title">欢迎来到ddvdd聊天室</div>
            <div class="login-wrap">
                <div class="user-ipt">
                    <span class="user-name">用户名：</span>
                    <input class="name-ipt" type="text" />
                </div>
                <button class="login-button">登陆</button>
            </div>
        </div>
    </body>  
    </html>
简单的加点样式，静态页面就完成了，我们刷新下页面：
![](https://github.com/ddvdd008/chatroom/raw/master/Logo/1517994833306.jpg)