/**
 * Created by ddvdd on 2018-02-07.
 */
const express = require('express');  
const app = express();               // 创建express实例，赋值给app。
const server = require('http').Server(app);  
const io = require('socket.io')(server);     //将socket的监听加到app设置的模块里。这两句理解不了的可以去socket.io官网去看
const path = require('path');        // 这是node的路径处理模块，可以格式化路径

const MongoClient = require('mongodb').MongoClient; //创建一个 MongoClient 对象，然后配置好指定的 URL 和 端口号
const url = "mongodb://localhost:27017/DATEBASE_CHATROOM";
 
const onlineUsers = [];              //当前在线人员
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
        checkUser(data,socket);
    });  
    /** 
     * 监听sendMessage,我们得到客户端传过来的data里的message，并存起来。 
     */  
    socket.on('sendMessage',(data)=>{  
        for(let _user of onlineUsers) {  
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
        usersNum = onlineUsers.length; 
        console.log(`当前在线登录人数：${usersNum}`);  
    });  
});  
//添加在线人数
const addOnlineUser = (data) => {
    onlineUsers.push({  
        username: data.username,  
        message: []  
    });
    usersNum = onlineUsers.length;
    console.log(`用户${data.username}登录成功，进入ddvdd聊天室，当前在线登录人数：${usersNum}`);  
}
//数据库操作为异步操作，利用promise简单封装下。
//异步封装数据库连接，并且打开集合userlist
const connectDB = () => {
    return new Promise((resolve,reject) => {
        MongoClient.connect(url, function(err, db) {
            if (err) {
                reject(err);  
            }
            const dbo = db.db("DATABASE_CHATROOM");
            const collection = dbo.collection("userlist");
            resolve({
                db:db,
                collection:collection
            });
        });
    });
}
//异步封装检测用户名是否已经注册
const isRegister = (dbObj,name) => {
    return new Promise((resolve,reject) => {
        dbObj.collection.find({username:name}).toArray(function(err, result) {
            if (err) {
                reject(err);  
            }
            resolve(Object.assign(dbObj,{result:result}));
        });
    });
}
//异步封装注册新增用户
const addUser = (dbObj,userData) => {
    return new Promise((resolve,reject) => {
        const myobj = userData;
        dbObj.collection.insertOne(myobj, function(err, res) {
            if (err) {
                reject(err);  
            }
            resolve(Object.assign(dbObj,res));
            dbObj.db.close();
        });
    });
}

//校验逻辑：
//1.用户是否已经登录 已经登录返回code=3
const isLogin = (data) => {
    let flag = false;
    onlineUsers.map((user) => {
        if(user.username === data.username){
            flag = true;
        }
    });
    return flag;
}
//2.用户是否已经注册，如果已经注册，校验密码是否正确，密码正确返回code=0，密码错误返回code=1，未注册返回code=2，
const checkUser = (data,socket) => {
    connectDB().then(dbObj => {
        return isRegister(dbObj,data.username);
    }).then(dbObj => {
        const userData = dbObj.result || [];
        if(userData.length > 0){
            if(userData[0].password === data.password){
                if(isLogin(data)){
                    socket.emit('loginResult',{code:3});
                }
                else{
                    addOnlineUser(data);
                    socket.emit('loginResult',{code:0});
                }
            }
            else{
                socket.emit('loginResult',{code:1});
            }
            dbObj.db.close();
        }
        else{
            addUser(dbObj,data).then(resolve => {
                addOnlineUser(data);
                socket.emit('loginResult',{code:'2-0'});
            },reject => {
                socket.emit('loginResult',{code:'2-1'});
            });
        }
        
    });
}
