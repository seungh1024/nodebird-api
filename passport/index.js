const passport = require('passport');
const local =require('./localStrategy');
const kakao = require('./kakaoStrategy');
const User = require('../models/user');

module.exports=()=>{
    passport.serializeUser((user,done)=>{
        //serializeUser는 로그인 시 실행되며 req.session 객체에 어떤 데이터를 저장할지 정하는 메서드
        //매개변수로 user를 받고 
        done(null,user.id);
        //done함수의 두 번째 인수로 user.id를 넘김
        //첫 번째 인수는 에러 발생 시 사용함
        //두 번째 인수에는 저장하고 싶은 데이터를 넣음
        //세션에 사용자 정보를 모두 저장하면 용량이 너무 커지기 때문에 사용자 아이디만 저장하는 것임
    });

    passport.deserializeUser((id,done)=>{
        //라우터에 로그인 이후의 요청과정에서 요청이 도달하기 전에 passport.session 미들웨어가
        //passport.deserializeUser 메서드를 호출함

        //매 요청 시 실행됨
        //passport.session 미들웨어가 이 메서드를 호출함
        //serializeUser 의 done의 두 번째 인수로 넣은 데이터가 deserializeUser의 매개변수가 됨
        //위에서 받은 사용자 아이디가 되는 것
        console.log('-============================');
        User.findOne({
            where:{id},//아이디로 데이터 베이스의 유저정보 조회
            include:[{
                model:User,
                attributes:['id','nick'],
                as:'Followers',
            },{
                model:User,
                attributes:['id','nick'],
                as:'Followings',
            }],
            //세션에 저장된 아이디로 사용자 정보를 조회할 때 팔로잉 목록,팔로워 목록도 같이 조회
            //include 에서 attributes를 계속 지정하고 있는데 이는 실수로 비밀번호 조회를 방지하기 위함
        })
            .then(user=>done(null,user))
            //조회한 정보를 req.user에 저장함
            //이렇게 저장하면 라우터에서 req.user 객체를 사용 가능함
            .catch(err=>done(err));
    });

    local();
    kakao();
}