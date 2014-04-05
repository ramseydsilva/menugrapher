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
            name: 'John Smith',
            passwordString: 'johnsmith'
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
            name: "Ramsey D'silva",
            passwordString: 'ramseydsilva'
        },
        tokens: []
    }
];
module.exports.users = users;
module.exports.user = users[0];
