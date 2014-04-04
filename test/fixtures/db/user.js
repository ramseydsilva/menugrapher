'use strict';

var users = [
    {
        email: 'johnsmith@gmail.com',
        password: 'johnsmith',
        profile: {
            picture: '',
            website: '',
            location: '',
            gender: '',
            name: 'John Smith'
        },
        tokens: []
    },
    {
        email: 'ramseydsilva@gmail.com',
        password: 'ramseydsilva',
        profile: {
            picture: '',
            website: '',
            location: '',
            gender: '',
            name: "Ramsey D'silva"
        },
        tokens: []
    }
];
module.exports.users = users;
module.exports.user = users[0];
