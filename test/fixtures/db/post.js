'use strict';

var posts = [
    { 
        pic: {
            originalPath: 'test.jpg',
            originalUrl: 'test.jpg',
            thumbPath: 'test.jpg',
            thumbUrl: 'test.jpg'
        },
        title: 'My first post',
        description: 'This is a dummy description'
    },
    {
        pic: {
            originalPath: 'test2.jpg',
            originalUrl: 'test2.jpg',
            thumbPath: 'test2.jpg',
            thumbUrl: 'test2.jpg'
        },
        title: 'My second post',
        description: 'This is a dummy description 2'
    }
];
module.exports.posts = posts;
module.exports.post = posts[0];
