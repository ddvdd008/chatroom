/**
 * Created by ddvdd on 2018-02-08.
 */
$(function(){
    const url = 'http://127.0.0.1:3000';
    let _username = '';
    let _password = '';
    let _$inputname = $('#name');
    let _$inputpassword = $('#password');
    let _$loginButton = $('#loginbutton');
    let _$chattextarea = $('#chatmessage');

    let socket = io.connect(url);

    //设置用户名，当用户登录的时候触发
    let setUsername = () => {
        
        _username = _$inputname.val().trim();    //得到输入框中用户输入的用户名
        _password = _$inputpassword.val();  //得到输入框中用户输入的密码
        //判断用户名或者密码是否为空
        if(_username && _password) {
            socket.emit('login',{
                username: _username,
                password: _password
            });   //把用户名和密码传给服务端，就相当于告诉服务器我们要登录了
        }
        else{
            alert('请输入用户名或者密码！');
        }
    };

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
    let showMessage = function (data) {  
        //先判断这个消息是不是自己发出的，然后再以不同的样式显示  
        if(data.username === _username){  
            $("#content").append(`<p class='self-message'><span class='msg'>${data.message}</span><span class='name'> :${data.username}</span></p>`);  
        }else {  
            $("#content").append(`<p class='other-message'><span class='name'>${data.username}: </span><span class='msg'>${data.message}</span></p>`);  
        }  
    };   
    /*前端事件*/
    _$loginButton.on('click',function (event) {    //监听按钮的点击事件，如果点击，就说明用户要登录，就执行setUsername函数
        setUsername();
    });

    /*聊天事件*/  
    _$chattextarea.on('keyup',function (event) {  
        if(event.keyCode === 13) {  
            sendMessage();  
            _$chattextarea.val('');  
        }  
    });
    /*socket.io部分逻辑*/  
    socket.on('loginResult',(data)=>{  
        /** 
         * 如果服务器返回的用户名和刚刚发送的相同的话，就登录 
         * 否则说明有地方出问题了，拒绝登录 
         */  
        if(data.code === 0) {  
            showChatRoom();       //登录成功，显示聊天室  
        }
        else if(data.code ===1){  
            alert('密码错误');  
        }
        else if(data.code ==='2-0'){
            alert('注册成功');
            showChatRoom();       //登录成功，显示聊天室  
        }
        else if(data.code ==='2-1'){
            alert('注册失败');
        }
        else if(data.code ===3){  
            alert('该用户已经登录');  
        }
        else{
            alert('登录失败！');
        }
    })  

    socket.on('receiveMessage',(data)=>{  
        /** 
         * 
         * 监听服务器广播的消息
         */  
        showMessage(data);
    })  
});