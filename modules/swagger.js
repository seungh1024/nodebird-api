const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    swaggerDefinition:{
        info:{
            title: 'Test API',
            version: '1.0.0',
            description: 'Test API with express',
        },
        host: 'localhost:8002',
        basePath: '/',
        securityDefinitions:{
            jwt: {
                type: 'apiKey',
                name: 'authorization', 
                //이름으로 어디에 토큰이 있는지 지정해줘야 함
                in: 'header',
            }
        },
        security:[
            { jwt:[] }
        ]
    },
    apis: ['./routes/*.js', './swagger/*']
};

const specs = swaggerJsdoc(options);

module.exports = {
    swaggerUi,
    specs
}