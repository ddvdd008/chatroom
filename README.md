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
###login页面重构
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
                    <input id="name" class="name-ipt" type="text" />
                </div>
                <button id="loginbutton" class="login-button">登陆</button>
            </div>
        </div>
    </body>  
    </html>
简单的加点样式，静态页面就完成了，我们刷新下页面：
![](https://github.com/ddvdd008/chatroom/raw/master/Logo/1517994833306.jpg)
###login页面交互
昨天下午写到一半。。。部门突然要去团建聚会，只能匆匆提交代码，草草了事。今天一大早来到公司继续给大家码。—— 码于2018-02-08 09:35 

废话不多说进入正题，登陆这块交互，当用户访问服务器并且成功登陆算一个在线登陆人数，每登陆一个用户，服务器都会把用户信息存入一个数组中，保存在服务器，这里要注意一点，服务器会对用户登陆的用户名进行校验，校验结果会返回给客户端，客户端通过校验结果，改变当前页面是否进入聊天页面。

上面的服务器和客户端交互都是通过socket.io来实现通讯的，前端的业务交互我们这里就采用jquery来实现，在public文件夹下新建js文件夹，下载jquery-3.2.1.min.js、新建main.js。然后对chat.html引入需要的sdk：
    <script src="js/jquery-3.2.1.min.js"></script>
    <script src="js/main.js"></script>
    //socket.io官网要求这么引入
    <script src="/socket.io/socket.io.js"></script>
引入完sdk，我们对main的js添加登录功能：
    //main.js
    /**
    * Created by ddvdd on 2018-02-08.
    */
    $(function(){
        const url = 'http://127.0.0.1:3000';
        let _username = '';
        let _$inputname = $('#name');
        let _$loginButton = $('#loginbutton');

        let socket = io.connect(url);

        //设置用户名，当用户登录的时候触发
        let setUsername = () => {
            
            _username = _$inputname.val().trim();    //得到输入框中用户输入的用户名

            //判断用户名是否存在
            if(_username) {
                socket.emit('login',{username: _username});   //如果用户名存在，就代表可以登录了，我们就触发登录事件，就相当于告诉服务器我们要登录了
            }
            else{
                alert('请输入用户名！');
            }
        };
        
        
        
        /*前端事件*/
        _$loginButton.on('click',function (event) {    //监听按钮的点击事件，如果点击，就说明用户要登录，就执行setUsername函数
            setUsername();
        });

        /*socket.io部分逻辑*/  
        socket.on('loginResult',(data)=>{  
            /** 
            * 如果服务器返回的用户名和刚刚发送的相同的话，就登录 
            * 否则说明有地方出问题了，拒绝登录 
            */  
            if(data.code === 0) {  
                // 登陆成功，切换至聊天室页面  
            }
            else if(data.code ===1){  
                alert('用户已登录！');  
            }
            else{
                alert('登录失败！');
            }
        })  

    });
    //app.js
    /**
    * Created by ddvdd on 2018-02-07.
    */
    const express = require('express');  
    const app = express();               // 创建express实例，赋值给app。
    const server = require('http').Server(app);  
    const io = require('socket.io')(server);     //将socket的监听加到app设置的模块里。这两句理解不了的可以去socket.io官网去看
    const path = require('path');        // 这是node的路径处理模块，可以格式化路径

    const users = [];                    //用来保存所有的用户信息  
    let usersNum = 0;                    //统计在线登录人数

    server.listen(3000,()=>{                
        console.log("server running at 127.0.0.1:3000");       // 代表监听3000端口，然后执行回调函数在控制台输出。  
    });  


    /**
    * app.get(): express中的一个中间件，用于匹配get请求，说的简单点就是node处理请求的路由，对于不同url请求，让对应的不同app.get()去处理
    * '/': 它匹配get请求的根路由 '/'也就是 127.0.0.1:3000/就匹配到它了
    * req带表浏览器的请求对象，res代表服务器的返回对象
    */
    app.get('/',(req,res)=>{
        res.redirect('/static/chat.html');      // express的重定向函数。如果浏览器请求了根路由'/',浏览器就给他重定向到 '127.0.0.1:3000/chat.html'路由中
    });

    /** 
    * __dirname表示当前文件所在的绝对路径，所以我们使用path.join将app.js的绝对路径和public加起来就得到了public的绝对路径。 
    * 用path.join是为了避免出现 ././public 这种奇怪的路径 
    * express.static就帮我们托管了public文件夹中的静态资源。 
    * 只要有 127.0.0.1：3000/XXX/AAA 的路径都会去public文件夹下找XXX文件夹下的AAA文件然后发送给浏览器。 
    */  
    app.use('/static',express.static(path.join(__dirname,'./public')));        //一句话就搞定。  

    /*socket*/  
    io.on('connection',(socket)=>{              //监听客户端的连接事件  
        
        socket.on('login',(data)=>{  

            if(checkUserName(data)){
                socket.emit('loginResult',{code:1});   //code=1 用户已登录 
            }
            else{
                //将该用户的信息存进数组中  
                users.push({  
                    username: data.username,  
                    message: []  
                }); 
                socket.emit('loginResult',{code:0});   //code=0 用户登录成功
                usersNum = users.length;  
                console.log(`用户${data.username}登录成功，进入ddvdd聊天室，当前在线登录人数：${usersNum}`);  
            }
            
        });  

        //断开连接后做的事情  
        socket.on('disconnect',()=>{          //注意，该事件不需要自定义触发器，系统会自动调用  
            usersNum = users.length; 
            console.log(`当前在线登录人数：${usersNum}`);  
        });  
    });  
    //校验用户是否已经登录
    const checkUserName = (data) => {
        let isExist = false;
        users.map((user) => {
            if(user.username === data.username){
                isExist = true;
            }
        });
        return isExist;
    }
上面代码大家需要了解以下几点：
1. socket.on 表示监听事件，后面接一个回调函数用来接收emit发出事件传递过来的对象。
2. socket.emit 用来触发事件，传递对象给on监听事件。
3. 我们socket连接之后的监听触发事件都要写在io.on('connection'）的回调里面，因为这些事件都是连接之后发生的，就算是断开连接的事件 disconnect 也是在连接事件中发生的，没有正在连接的状态，哪来的断开连接呢？
4. 理解虽然服务器端只有app.js一个文件，但是不同的客户端连接后信息是不同的，所以我们必须要将一些公用的信息，比如说，储存所有登录用户的数组，所有用户发送的所有信息存储在外部，一定不能存储在connecion里

效果展示：
![](https://github.com/ddvdd008/chatroom/raw/master/Logo/1518062749658.jpg)
![](https://github.com/ddvdd008/chatroom/raw/master/Logo/1518062685921.jpg)
![](https://github.com/ddvdd008/chatroom/raw/master/Logo/1518062816499.jpg)
##群聊功能实现
写完简单的登录功能，现在我们来写这项目最重要的功能群聊。首先我们先来处理下页面，因为功能简单，所以不单独建立html来显示聊天室，就直接写在login页面，通过class名称的变化来切换登录后，聊天室的显示。
###聊天室页面重构
下面我们对chat.html进行整改：
    <!DOCTYPE html>  
    <html lang="en">  
    <head>  
        <meta charset="UTF-8">  
        <title>聊天室</title>
        <script src="js/jquery-3.2.1.min.js"></script>  
        <script src="js/main.js"></script>  
        <script src="/socket.io/socket.io.js"></script>  
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
                background-color: darkgrey;
                padding: 50px;
                overflow-y: scroll;
            }
            .container .title{
                margin: 0 auto;
                font-size: 30px;
                font-family: 'Franklin Gothic Medium';
                font-weight: bold;
                text-align: center;
                margin-bottom:20px;
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
            .chat-wrap .chat-content{
                width:100%;
                height:600px;
                background-color: whitesmoke;
                padding:10px;
            }
            .chat-wrap .send-wrap{
                margin-top: 20px;
            }
            .message-ipt{
                width: 200px;
                height: 100px;
                padding: 0 5px;
                vertical-align: bottom;
            }
            .chat-content p{
                display: block;
                margin-bottom: 10px;
            }
            .chat-content p .msg{
                display: inline-block;
                padding: 8px 11px;
                border-radius:6px;
            }
            .chat-content .self-message .msg{
                background-color:#d0e7ff;
                border: 1px solid #c9dfff;
            }
            .chat-content .other-message .msg{
                background-color:white;
                border: 1px solid #eee;
            }
            .chat-content .self-message{
                text-align:right;
            }
            .chat-content .other-message{
                text-align-last:left;
            }
        </style>   
    </head>  
    <body>  
        <div class="container">
            <div id="loginbox" class="login-wrap">
                <div class="title">登录</div>
                <div class="user-ipt">
                    <span class="user-name">用户名：</span>
                    <input id="name" class="name-ipt" type="text" />
                </div>
                <button id="loginbutton" class="login-button">登录</button>
            </div>
            <div id="chatbox" class="chat-wrap" style="display:none">
                <div id="content" class="chat-content">
                    <!-- 聊天内容 -->
                </div>
                <div class="send-wrap">
                    <textarea rows="3" cols="20" id="chatmessage" class="message-ipt" type="textarea" placeholder="请输入要发送的信息内容"></textarea>
                </div>
            </div>
        </div>
    </body>  
    </html>  
新增chatbox容器来作为聊天室，里面有一个群聊的聊天框，和一个发送消息的文本框。通过上面loginResult回调，对loginbox进行隐藏，显示chatbox：
    //显示聊天室界面
    let showChatRoom = () => {
        /** 
         * 1.隐藏登录框，取消它绑定的事件 
         * 2.显示聊天界面 
         */ 
        $('#loginbox').hide('slow');
        _$loginButton.off('click');
        /** 
        * 显示聊天界面，并显示一行文字，欢迎用户 
        */
        $(`<div class="title">欢迎${_username}来到ddvdd聊天室</div>`).insertBefore($("#content"));  
        $("#chatbox").show('slow');
    }
###消息事件发送监听机制
聊天一定是客户端触发的，所以发送信息是客户端触发，服务器监听。
服务器监听到发送信息的事件后会存储信息，然后触发发送信息成功事件广播给所有客户端，将信息传给所有客户端。

发送消息sendMessage事件
    //main.js
    //发送消息
    let sendMessage = function () {  
        /** 
         * 得到输入框的聊天信息，如果不为空，就触发sendMessage 
         * 将信息和用户名发送过去 
         */  
        let _message = _$chattextarea.val();  
      
        if(_message) {  
            socket.emit('sendMessage',{username: _username, message: _message});  
        }
        else{
            alert('请输入发送消息！');
        }  
    }; 
    ...
    /*聊天事件*/  
    _$chattextarea.on('keyup',function (event) {  
        if(event.keyCode === 13) {  
            sendMessage();  
            _$chattextarea.val('');  
        }  
    });
服务器端监听sendMessage事件
    //app.js
    /** 
     * 监听sendMessage,我们得到客户端传过来的data里的message，并存起来。 
     */  
    socket.on('sendMessage',(data)=>{  
        for(let _user of users) {  
            if(_user.username === data.username) {  
                _user.message.push(data.message);  
                //信息存储之后触发receiveMessage将信息发给所有浏览器-广播事件  
                io.emit('receiveMessage',data);  
                break;  
            }  
        }  
    });  
我们是遍历服务器端的用户数组，找到该用户，将发送的信息存起来，然后触发receiveMessage事件广播到所有浏览器，sendMessage是写在connection里，login之外的，为什么这么做大家一定要理解，发送消息是连接时候做的事情，而不是登录时做的事情。
注意的是，我使用的是io.emit，他是真正的广播到所有浏览器，socket.broadcast.emit则不会广播到自己的浏览器。

客户端监听receiveMessage事件
    //main.js
    socket.on('receiveMessage',(data)=>{  
        /** 
         * 
         * 监听服务器广播的消息
         */  
        showMessage(data);
    })  
    //显示消息
    let showMessage = function (data) {  
        //先判断这个消息是不是自己发出的，然后再以不同的样式显示  
        if(data.username === _username){  
            $("#content").append(`<p class='self-message'><span class='msg'>${data.message}</span><span class='name'> :${data.username}</span></p>`);  
        }else {  
            $("#content").append(`<p class='other-message'><span class='name'>${data.username}: </span><span class='msg'>${data.message}</span></p>`);  
        }  
    };   
写到这边，我们的聊天室基本功能已经完成了，来看看效果吧！打开三个浏览器，分别登录老大、老二、老三，发一句“大噶好～，我是渣渣辉！”。
![](https://github.com/ddvdd008/chatroom/raw/master/Logo/1518335901114.jpg)
![](https://github.com/ddvdd008/chatroom/raw/master/Logo/1518335985326.jpg)
![](https://github.com/ddvdd008/chatroom/raw/master/Logo/1518336042785.jpg)

总结
--
[github地址](https://github.com/ddvdd008/chatroom)