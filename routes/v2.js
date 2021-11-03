//v2를 만든 것은 기존의 라우터에서  새로운 미들웨어가 추가되었기 때문임
//기존 API버전과 호환되지 않기 때문이기도 함.

const express = require('express');
const jwt = require('jsonwebtoken');
const cors=require('cors');
const url=require('url');

const { verifyToken,apiLimiter,premiumApiLimiter}=require('./middlewares');
const { Domain, User, Post , Hashtag, sequelize}=require('../models');

const router=express.Router();

router.use(cors({
    credentials:true,//이 옵션은 Access-Control-Allow-Credentials 헤더를 true로 만듦
}));
//이 cors npm을 설치하고 라우터에 적용을 시켜야 다른 도메인 간에 쿠키가 공유됨
//서버 간의 도메인이 다른 경우에는 이 옵션을 활성화하지 않으면 로그인 안될 수 있음

router.use(async(req,res,next)=>{
    console.log('sex');
    console.log(url.parse(req.get('host')).href);
    const domain = await Domain.findOne({
        where:{host:url.parse(req.get('host')).href},
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

//api limit 초과했는지 검사하는 라우터
//use로 모두 이 라우터를 거친 후 실행됨 -> 공통 미들웨어
router.use(async(req,res,err,next)=>{
    const domain = await Domain.findOne({
        where:{host: url.parse(req.get('origin')).host},
    });
    if(!domain){
        next();
    }
    if(domain.type === 'premium'){
        premiumApiLimiter(req,res,next);
    }else{
        apiLimiter(req,res,next);
    }
})

router.post('/token',async(req,res)=>{
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

/**
 * @swagger
 *  /v2/token:
 *      post:
 *          tags:
 *          - token
 *          description: 토큰 발급 라우터
 *          produces:
 *          - application/json
 *          parameters:
 *              - name: clientSecret
 *                in : body
 *                required: true
 *                description: clientSecret 값을 json 형태로 입력하세요
 *                schema:
 *                  type: string
 * 
 *          responses:
 *              200:
 *               description: 토큰이 발급되었습니다.
 *               examples:
 *              401:
 *               description: 등록되지 않은 도메인입니다. 먼저 도메인을 등록하세요
 *              500:
 *               description: 서버 에러
 */

router.get('/test',verifyToken,(req,res)=>{
    res.json(req.decoded);
});

router.get('/posts/my',verifyToken,async(req,res,next)=>{
    try{
        await Post.findAll({where:{userId:req.decoded.id}})
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
    }catch(error){
        console.error(error);
        next(error);
    }
    
});
/**
 * @swagger
 *  /v2/posts/my:
 *      get:
 *          tags:
 *          - posts
 *          description: 나의 게시물 확인
 *          produces:
 *          - application/json
 * 
 *          responses:
 *              200:
 *               description: posts.
 *              500:
 *               description: 서버 에러
 */

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
        return res.status(500).json({
            code:500,
            message:'서버 에러',
        });
    }
});

/**
 * @swagger
 *  /v2/posts/hashtag/{title}:
 *      get:
 *          tags:
 *          - posts
 *          description: 게시물 해시태그 확인
 *          produces:
 *              - application/json
 *              
 *          responses:
 *              200:
 *               description: posts.
 *              500:
 *               description: 서버 에러
 */

//팔로워나 팔로잉 목록을 가져오는 API만들기
//팔로워 목록 보기
router.get('/follower',verifyToken,async(req,res,next)=>{
    try{
        const [result,metadata] = await sequelize.query(
            `select nick from users 
             where id in 
             (select followerId from Follow 
             where followingId = ${req.decoded.id});`
        );
        console.log(result);
        console.log(req.decoded.id);
        return res.status(200).json({
            code:200,
            payload:result
        });
    }catch(error){
        console.error(error);
        next(error);
    }
    
});
/**
 * @swagger
 *  /v2/follower:
 *      get:
 *          tags:
 *          - follow
 *          description: 내 팔로워 확인
 *          produces:
 *              - application/json
 * 
 *              
 *          responses:
 *              200:
 *               description: posts
 *              500:
 *               description: 서버 에러
 */

//팔로잉 하는 사람 목록 확인
router.get('/following',verifyToken,async(req,res,next)=>{
    console.log(req.decoded);
    try{
        const [result,metadata] = await sequelize.query(
            `select nick from users 
             where id in 
             (select followingId from Follow 
             where followerId = ${req.decoded.id});`
        );
        console.log(result);
        console.log(req.decoded.id);
        return res.status(200).json({
            code:200,
            payload:result
        });
    }catch(error){
        console.error(error);
        next(error);
    }
    
});
/**
 * @swagger
 *  /v2/following:
 *      get:
 *          tags:
 *          - follow
 *          description: 내가 팔로우 하는 사람 확인
 *          produces:
 *              - application/json
 * 
 *              
 *          responses:
 *              200:
 *               description: payload
 *              500:
 *               description: 서버 에러
 */

//팔로워 팔로윙 찾는 기능을 이렇게 해도 됨
//한 번에 모두 확인할 수 있게 했음
router.get('/follow',verifyToken,async(req,res,next)=>{
    try{
        const user = await User.findOne({
            where:{id:req.decoded.id}
        });
        const follower = await user.getFollowers({
            attributes:['id','nick']
        });
        const following = await user.getFollowings({
            attributes:['id','nick']
        });

        return res.json({
            code:200,
            follower,
            following,
        })
    }catch(error){
        console.error(error);
        next(error);
    }
});
/**
 * @swagger
 *  /v2/follow:
 *      get:
 *          tags:
 *          - follow
 *          description: 내 팔로워,팔로잉 확인
 *          produces:
 *              - application/json
 * 
 *              
 *          responses:
 *              200:
 *               description: follower,following
 *              500:
 *               description: 서버 에러
 */


module.exports = router;