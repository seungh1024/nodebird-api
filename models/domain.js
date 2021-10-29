const Sequelize = require('sequelize');

module.exports = class Domain extends Sequelize.Model{
    static init(sequelize){
        return super.init({
            host:{
                type:Sequelize.STRING(80),
                allowNull:false,
            },
            type:{
                type:Sequelize.ENUM('free','premium'),
                //ENUM은 넣을 수 있는 속성값을 제한하는 데이터 형식
                //여기서는 free,preminum 중에서 하나의 종류만 선택할 수 있음 이를 어기면 에러 발생
                allowNull:false,
            },
            clientSecret:{
                type:Sequelize.UUID,
                allowNull:false,
            },
            //클라이언트 비밀키는 다른 개발자들이 NodeBird API를 사용할 때 필요한 비밀 키임
            //UUID라는 타입을 가지는데 충돌 가능성이 매우 적은 랜덤한 문자열임
        },{
            sequelize,
            timestamps:true,
            paranoid:true,
            modelName:'Domain',
            tableName:'domains',
        });
    }

    static associate(db){
        db.Domain.belongsTo(db.User);
        //사용자 모델과 1대 다 관계. 사용자 한명이 여러 도메인을 소유할 수 있기 때문
    }
};

//도메인 모델로 인터넷 주소(host), 도메인 종류(type) 클라이언트 비밀키가 들어감