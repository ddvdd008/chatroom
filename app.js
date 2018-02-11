
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