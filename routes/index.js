const express = require('express');
const { v4: uuidv4 } = require('uuid');
//형식이 특이함 패키지의 변수나 함수를 불러올 때 이름을 바꿀 수 있음
//v4를 uuidv4로 바꾼 것
const {User,Domain}=require('../models');
const {isLoggedIn}=require('./middlewares');

const router = express.Router();

router.get('/',async(req,res,next)=>{
    try{
        const user =await User.findOne({
            where:{id:req.user && req.user.id || null},
            include:{model:Domain},
        });
        res.render('login',{
            user,
            domains:user&&user.Domains,
        });
    }catch(err){
        console.error(err);
        next(err);
    }
});
//접속시 로그인 화면을 보여주는 라우터

router.post('/domain',isLoggedIn,async(req,res,next)=>{
    try{
        await Domain.create({
            UserId:req.user.id,
            host:req.body.host,
            type:req.body.type,
            clientSecret:uuidv4(),
            //clientSecret의 값을 uuid패키지를 통해 생성하는데 그 중 4버전을 사용함->uuidv4
            //36자리 문자열 형식으로 생김
        });
        res.redirect('/');
    }catch(err){
        console.error(err);
        next(err);
    }
});
//도메인 등록 라우터(post) 이며 폼으로부터 온 데이터를 도메인 모델에 저장함

module.exports = router;