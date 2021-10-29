
const express = require('express');
const jwt = require('jsonwebtoken');

const {verifyToken,deprecated} = require('./middlewares');
const { Domain,User,Post,Hashtag}=require('../models');

const router = express.Router();

router.use(deprecated);//기존 v1라우터를 사용하면 deprecated로 경고 메시지를 띄워줌
//실제 서비스 운영 시에는 v2가 나왔다고 v1을 바로 닫거나 410 에러를 주면 안됨
//일정 기간을 두고 옮겨가는 것이 좋음 -> 사용자가 변경된 부분을 자신의 코드에 반영할 시간이 필요하기 때문
//이렇게 다음 버전을 추가하면서 순차적으로 이전 것을 제거하면 됨

router.post('/token',async(req,res)=>{
    //토큰을 발급하는 라우터
    const {clientSecret}=req.body;
    try{
        const domain = await Domain.findOne({
            where:{clientSecret},
            include:{
                model:User,
                attribute:['nick','id'],
            },//도메인을 찾고
        });
        if(!domain){//없으면 도메인 등록하라는 에러메세지 전달
            return res.status(401).json({
                code:401,
                message:'등록되지 않은 도메인입니다. 먼저 도메인을 등록하세요',
            });
        }
        const token = jwt.sign({//등록된 도메인이라면 토큰을 발급해서 응답함
            id:domain.User.id,
            nick:domain.User.nick,
        },process.env.JWT_SECRET,{
            expiresIn:'1m',//1분->유효기간. 60*1000처럼 밀리초 단위로 적어도 됨
            issuer:'nodebird',//발급자
        });
        //sign메서드의 첫 번째 인수는 토큰의 내용임->사용자 아이디와 닉네임 넣었음
        //두 번째 인수는 토큰의 비밀키->JWT_SECRET 이거 비밀키라서 유출 안되게 조심해야함
        //세 번째 인수는 토큰의 설정->유효기간,발급자 설정해줌
        return res.json({
            code:200,
            messaeg:'토큰이 발급되었습니다',
            token,
        });
    }catch(error){
        console.error(error);
        return res.status(500).json({
            code:500,
            message:'서버 에러hi',
        });
    }
});

router.get('/test',verifyToken,(req,res)=>{
    //사용자가 토큰을 테스트해볼 수 있는 라우터
    res.json(req.decoded);
    //verifyToken 에서 req.decoded에 저장한 것
    //verifyToken으로 검증 성공했으면 토큰의 내용물을 응답으로 보냄
});

router.get('/posts/my',verifyToken,(req,res)=>{
    Post.findAll({where:{userId:req.decoded.id}})
        .then((posts)=>{
            console.log(posts);
            res.json({
                code:200,
                payload:posts,
            });
        })
        .catch((error)=>{
            console.error(error);
            return res.status(500).json({
                code:500,
                message:'서버 에러',
            });
        });
});

router.get('/posts/hashtag/:title',verifyToken,async(req,res)=>{
    try{
        const hashtag = await Hashtag.findOne({where:{title:req.params.title}});
        if(!hashtag){
            return res.status(404).json({
                code:404,
                message:'검색 결과가 없습니다',
            });
        }
        const posts = await hashtag.getPosts();
        return res.json({
            code:200,
            payload:posts,
        });
    }catch(error){
        console.error(error);
        return res. status(500).json({
            code:500,
            message:'서버 에러',
        });
    }
});

module.exports = router;
