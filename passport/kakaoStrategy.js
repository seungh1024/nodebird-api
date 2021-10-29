const passport = require('passport');
const KakaoStrategy=require('passport-kakao').Strategy;
//passport-kakao모듈에서 Strategy생성자를 불러와 전략 구현함

const User = require('../models/user');

module.exports=()=>{
    passport.use(new KakaoStrategy({
        clientID:process.env.KAKAO_ID,
        //clientID는 카카오에서 발급해 주는 아이디임 노출되면 안되니까 위에 처럼 설정함
        //아이디를 발급받아 .env파일에 넣을 것. 그렇게 해야함
        callbackURL:'/auth/kakao/callback',
        //카카오로부터 인증 결과를 받을 라우터 주소임
    },async(accessToken,refreshToken, profile, done)=>{
        console.log('kakao profile',profile);
        console.log('sex',profile.displayName);
        try{
            const exUser=await User.findOne({
                where:{snsId: profile.id, provider:'kakao'},
                //기존에 카카오를 통해 회원가입한 사용자가 있는지 조회함
            });
            if(exUser){
                done(null,exUser);
                //있다면 사용자 정보와 함께 done함수 호출하고 종료
            }else{
                const newUser = await User.create({
                    email:profile._json && profile._json.kaccount_email,
                    nick:profile.displayName,
                    snsId:profile.id,
                    provider:'kakao',
                });
                //없다면 회원가입 진행
                //카카오에서는 인증 후 callbackURL에 적힌 주소로
                //accessToken,refreshToken,profile을 보냄
                //profile에는 사용자 정보 들어있음 카카오에서 보내주는 것이므로
                //데이터는 console.log 로 확인해보는게 좋음 그래서 위에 콘솔로 출력한것
                //profile 객체에서 원하는 정보를 꺼내와서 회원가입을 하면 됨
                done(null,newUser);
                //사용자 생성 후 done 호출
            }
        }catch(error){
            console.error(error);
            console.log('sex');
            done(error);
        }
    }));
};