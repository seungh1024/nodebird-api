const express = require('express');
const passport = require('passport');
const bcrypt =require('bcrypt');
const {isLoggedIn,isNotLoggedIn}=require('./middlewares');
const User = require('../models/user');

const router = express.Router();

router.post('/join',isNotLoggedIn,async(req,res,next)=>{
    //로그인 페이지 요청으로 로그인이 되어있으면 안됨
    const{email,nick,password}=req.body;
    //본문에서 적은 이메일 닉네임 패스워드를 받아옴
    try{
        const exUser=await User.findOne({where:{email}});
        //같은 이메일로 가입한 사용자를 데이터베이스에서 찾음
        if(exUser){
            return res.redirect('/join?error=exist');
            //이미 가입한 이메일이라면 회언가입 페이지로 되돌려 보냄
            //단 주소뒤에 에러를 쿼리스트링으로 표시함
        }
        const hash=await bcrypt.hash(password, 12);
        //같은 이메일로 가입한 사람이 없으면 비밀번호를 암호화 함 ->해쉬 알고리즘으로
        //두 번째 인수는 반복횟수랑 비슷한 개념 숫자가 커질수록 암호화를 많이함->시간 오래걸림,안전함
        //12이상 추천하며 31까지 사용가능
        await User.create({
            email,
            nick,
            password: hash,
        });
        //유저 생성(디비에)
        return res.redirect('/');
        //다시 첫번째 화면으로
    }catch(error){
        console.error(error);
        return next(error);
    }
});

router.post('/login',isNotLoggedIn,(req,res,next)=>{
    //로그인 요청, 역시 로그인 되어있으면 안됨
    //전략->로그인 할 때의 동작 이라고 생각하면 됨
    passport.authenticate('local',{session: false},(authError,user,info)=>{
        //passport.authenticate('local')미들웨어가 로컬 로그인 전략을 수행함
        //미들웨어인데 라우터 미들웨어 안에 있음
        //사용자 정의 기능 추가하고 싶을 때 이렇게 사용 가능. 맨 밑에 (req,res,next)붙여서
        //인수로 제공하여 호출하면됨 
        console.log(user);
        if(authError){
            console.error(authError);
            return next(authError);
        }
        if(!user){
            return res.redirect(`/?loginError=${info.message}`);
        }
        //전략이 성공하거나 실패하면 authenticate메서드의 콜백 함수 실행됨
        //콜백 함수의 첫 번째 매개변수(authErr)값이 있다면 실패한 것
        //두 번째 매개변수(user) 값이 있으면 성공한 것이고 req.login메서드를 호출함
        return req.login(user,(loginError)=>{
            if(loginError){
                console.error(loginError);
                return next(loginError);
            }
            return res.redirect('/');
        });
        //passport는 req 객체에 login,logout 메서드를 추가함
        //req.login은 serializeUser를 호출하고 req.login에 제공하는 user 객체가
        //serializeUser로 넘어감
    })(req,res,next);//미들웨어 내의 미들웨어에는 (req,res,next)붙여야 함
});

router.get('/logout',isLoggedIn,(req,res)=>{
    req.logout();
    req.session.destroy();
    res.redirect('/');
});
//로그아웃 라우터
//req.logout 메서드는 req.user 객체를 제거하고
//req.session.destroy는 세션 객체의 내용을 제거함 후에 메인페이지로 돌아감. 그럼 로그인 해제되어 있을 것

router.get('/kakao',passport.authenticate('kakao'));
//Get /auth/kakao 로 접근하면 카카오 로그인 과정 시작됨
//로그인 전략을 수행하는데 처음에는 카카오 로그인 창으로 리다이렉트 함
//그 창에서 로그인 후 성공 여부결과를 GET /auth/kakao/callback으로 받음
router.get('/kakao/callback',passport.authenticate('kakao',{
    //여기서 카카오 로그인 전략을 다시 수행함
    //passport.authenticate 메서드에 콜백함수를 제공하지 않는데
    //카카오 로그인은 로그인 성공 시 내부적으로 req.login을 호출하기 때문
    failureRedirect:'/',
    //그래서 실패했을 시 어디로 이동할 지를 failureRedirect속성에 적음
}),(req,res)=>{
    res.redirect('/');
    //성공 시에도 어디로 이동할지를 다음 미들웨어에 적음
});
//카카오 로그인 라우터임
module.exports=router;