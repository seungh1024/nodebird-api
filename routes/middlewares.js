const jwt=require('jsonwebtoken');

const RateLimit = require('express-rate-limit');

exports.isLoggedIn = (req,res,next)=>{
    if(req.isAuthenticated()){
        next();
    }else{
        res.status(403).send('로그인 필요');
    }
};
//passport 는 req 객체에 isAuthenticated 메서드를 추가
//로그인 중이면 req.isAuthenticated 가 true 이고 그렇지 않으면 false


exports.isNotLoggedIn = (req,res,next)=>{
    if(!req.isAuthenticated()){
        next();
    }else{
        const message=encodeURIComponent('로그인한 상태입니다');
        res.redirect(`/?error=${message}`);
    }
};

//isLoggedIn과 isNotLoggedIn 미들웨어를 만든것
//page라우터에서 사용할 것임

exports.verifyToken = (req,res,next)=>{
    try{
        req.decoded=jwt.verify(req.headers.authorization,process.env.JWT_SECRET);
        //req.headers.authorization->요청헤더에 저장된 토큰
        //사용자가 쿠키처럼 헤더에 토큰으 넣어 보낼 것임
        //jwt.verify메서드로 토큰 검증 가능
        //메서드의 첫 번째 인수로는 토큰을,두 번쨰 인수로는 토큰의 비밀키를 넣음
        //비밀키가 일치하지 않으면 인증 받을 수 없음->일치하지 않으면 에러 발생하여 catch로 감
        //인증에 성공하면 토큰의 내용이 반환되어 req.decoded에 저장됨
        //토큰의 내용은 조금 전에 넣은 사용자 아이디와 닉네임,발급자,유효기간 등
        //req.decoded를 통해 다음 미들웨어에서 토큰의 내용물을 사용할 수 있음
        return next();
    }catch(error){
        if(error.name=='TokenExpiredError'){//유효기간 초과
            return res.status(419).json({
                //419로 응답했는데 코드는 400번 대 숫자 중에서 마음대로 정해도 됨
                code:419,
                message:'토큰이 만료되었습니다',
            });
        }
        return res.status(401).json({
            code:401,
            message:'유효하지 않은 토큰입니다',
        });
    }
};

//무료 apiLimiter
exports.apiLimiter = new RateLimit({
    windowMs: 60*1000,//1분
    max:10,
    delayMs:0,
    handler(req,res){
        res.status(this.statusCode).json({
            code: this.statusCode,//기본값 429
            message:'무료 사용자는 1분에 한 번만 요청할 수 있습니다.',
        });
    },
});

//프리미엄 apiLimiter
exports.premiumApiLimiter = new RateLimit({
    windowMs: 60*1000,//1분
    max:1000,
    delayMs:0,
    handler(req,res){
        res.status(this.statusCode).json({
            code: this.statusCode,//기본값 429
            message:'유료 사용자는 1분에 천 번만 요청할 수 있습니다.',
        });
    },
});

exports.deprecated = (req,res)=>{
    res.status(410).json({
        code:410,
        message:'새로운 버전이 나왔습니다. 새로운 버전을 사용하세요.',
    });
};