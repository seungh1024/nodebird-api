//v2를 만든 것은 기존의 라우터에서  새로운 미들웨어가 추가되었기 때문임
//기존 API버전과 호환되지 않기 때문이기도 함.

const express = require('express');
const jwt = require('jsonwebtoken');
const cors=require('cors');
const url=require('url');

const { verifyToken,apiLimiter}=require('./middlewares');
const { Domain, User, Post , Hashtag}=require('../models');

const router=express.Router();

router.use(cors({
    credentials:true,//이 옵션은 Access-Control-Allow-Credentials 헤더를 true로 만듦
}));
//이 cors npm을 설치하고 라우터에 적용을 시켜야 다른 도메인 간에 쿠키가 공유됨
//서버 간의 도메인이 다른 경우에는 이 옵션을 활성화하지 않으면 로그인 안될 수 있음

router.use(async(req,res,next)=>{
    const domain = await Domain.findOne({
        where:{host:url.parse(req.get('origin')).host},
        //http같은 프로토콜을 떼어내기 위해 url.parse를 이용하였고
        //req.get('origin')과 호스트가 일치하는 것이 있는지 찾음
    });
    if(domain){//있다면 cors를 허용해서 다음 미들웨어로 보냄
        cors({
            origin: req.get('origin'),
            //origin 속성에 허용할 도메인만 따로 적음
            //*을 적으면 모든 도메인을 허용
            //여기선 기입한 것만 허용시켰음
            // 다른 도메인도 추가하고 싶으면 배열을 사용하면 됨
            credentials: true,
        })(req,res,next);
    }else{//없다면 다음으로 보냄
        next();
    }
});
//10.1의 프런트에서 key를 가지고 요청해서 이 비밀키가 모두에게 노출됨
//이 비밀키를 가지고 다른 도메인들이 api서버에 요청 보낼 수 있음 이 문제를 막기위해 만든 것임
//(req,res,next)인수를 직접 줘서 호출했는데 이는 미들웨어의 작동 방식을 커스터마이징 하고 싶을 때 이렇게 함
//router.use(cors());
//rotuer.use((req,res,next)=>{
//    cors()(req,res,next);
//}); 이거두개는 같은 역할을 함
router.post('/token',apiLimiter,async(req,res)=>{
    const {clientSecret}=req.body;
    try{
        const domain = await Domain.findOne({
            where:{clientSecret},
            include:{
                model:User,
                attribute:['nick','id'],
            },
        });
        if(!domain){
            return res.status(401).json({
                code:401,
                message:'등록되지 않은 도메인입니다. 먼저 도메인을 등록하세요',
            });
        }
        const token = jwt.sign({
            id:domain.User.id,
            nick:domain.User.nick,
        },process.env.JWT_SECRET,{
            expiresIn:'30m',//30분
            issuer:'nodebird',
        });
        return res.json({
            code:200,
            message:'토큰이 발급되었습니다',
            token,
        });
    }catch(error){
        console.error(error);
        return res.status(500).json({
            code:500,
            message:'서버에러',
        });
    }
});

router.get('/test',verifyToken,apiLimiter,(req,res)=>{
    res.json(req.decoded);
});

router.get('/posts/my',apiLimiter,verifyToken,(req,res)=>{
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

router.get('/posts/hashtag/:title',verifyToken,apiLimiter,async(req,res)=>{
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
        return res.status(500).json({
            code:500,
            message:'서버 에러',
        });
    }
});

module.exports = router;