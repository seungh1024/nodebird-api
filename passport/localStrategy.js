const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
//로그인 전략을 구현한 것
//passport-local모듈에서 strategy생성자를 불러와서 그 안에 전략을 구현하면 됨
const bcrypt = require('bcrypt');

const User = require('../models/user');

module.exports=()=>{
    passport.use(new LocalStrategy({
        //strategy생성자를 불러와서 그 안에 전략 구현하는 것
        usernameField: 'email',
        passwordField:'password',
        //LocalStrategy 생성자의 첫 번째 인수로 주어진 객체는 전략에 관한 설정을 함
        //각각의 필드에는 일치하는 로그인 라우터의 req.body속성명을 적으면 뙴
    },async(email,password,done)=>{//여기서부터 실제 전략 시작 얘가 두 번째 인수가 됨
        //async의 매개변수는 위에서 입력한 이메일,패스워드와 세 번째 매개변수는 done함수이고
        //이 done함수는 passport.authenticate의 콜백 함수임
        try{
            const exUser = await User.findOne({where:{email}});
            //이메일로 유저를 찾음
            if(exUser){//유저가 있다면
                const result = await bcrypt.compare(password,exUser.password);
                //패스워드와 유저의 패스워드를 bcrypt.compare 함수로 비밀벊를 비교함
                if(result){
                    done(null,exUser);
                    //비밀번호가 일치하다면 done함수의 두 번째 인수로 사용자 정보를 넣어서 보냄
                    //req.user인가? 거기로
                    //첫 번째 인수를 사용하는 경우는 서버 쪽에서 에러가 발생 했을 때만

                    //done(null,exUser)가 
                    //passport.authenticate('loccal',(authError,user,info))에서
                    //null이 authError,exUser가 user로 받는 것. 로그인 성공 시에
                }else{
                    done(null,false,{message:'비밀번호가 일치하지 않습니다.'});
                    //done함수의 세번째 인수를 사용하는 경우는 로그인 처리 과정에서 비밀번호가
                    //일치하지 않거나 존재하지 않는 회원일 때와 같은 사용자 정의 에러 발생했을 때임
                    
                    //로그인 실패시엔 위의 authenticate 콜백 함수에서
                    //authError,user,info에 각각 null,false,message가 들어가는 것
            
                }
            }else{
                done(null,false,{message:'가입되지 않은 회원입니다.'});
            }
        }catch(error){
            console.error(error);
            done(error);
            //여기 done의 error는 authError로 가는 것
            //done 이 호출된 후에는 authenticate의 콜백함수에서 나머지 로직이 실행됨
            //로그인 성공하면 메인 페이지로 리다이렉트 하여 회원정보가 뜸
        }
    }));
};