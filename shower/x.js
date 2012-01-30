GLOBAL.DEBUG = true;

test = require("assert");

var Db = require('../lib/mongodb').Db,
  Connection = require('../lib/mongodb').Connection,
  Server = require('../lib/mongodb').Server,
  after = require("after"),
  Stak = require("stak");

var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : Connection.DEFAULT_PORT;

var LINE_SIZE = 120;

var dbStack = Stak.make(
    function openDatabase() {
        this.db.open(this.next)
    },
    function dropDatabase(err, db) {
        this.db = db;
        db.dropDatabase(this.next);
    },
    function getAuthors(err, results) {
        console.log("===================================================================================");
        console.log(">> Adding Authors");
        this.db.collection('authors', this.next);
    },
    function createIndex(err, collection) {
        this.collection = collection;
        collection.createIndex(
            [
                "meta",
                ['_id', 1],
                ['name', 1],
                ['age', 1]
            ],
            this.next
        );
    },
    function insertAuthors(err, indexName) {
        console.log("===================================================================================");        
        this.authors = {};
        this.collection.insert(
            [{
                "name": "William Shakespear",
                "email": "william@shakespeare.com",
                "age": 587
            }, {
                "name": "Jorge Luis Borges",
                "email": "jorge@borges.com",
                "age": 123
            }],
            this.next
        );
    },
    function saveAuthors(err, docs) {
        docs.forEach(function (doc) {
            console.dir(doc);
            this.author[doc.name]
        }, this);

        this.next();
    },
    function findAuthors() {
        console.log("===================================================================================");        
        console.log(">> Authors ordered by age ascending");        
        console.log("===================================================================================");   
        this.collection.find({}, {
            'sort': [['age', 1]]
        }, this.next);
    },
    function (err, cursor) {
        cursor.each(function (err, author) {
            if (author != null) {
                console.log("[" + author.name + "]:[" + author.email + "]:[" + author.age + "]");
            } else {
                console.log("===================================================================================");        
                console.log(">> Adding users");        
                console.log("===================================================================================");
                authorStack.handle(Object.create(this));
            }
        });
    }
);

var authorStack = Stak.make(
    function openUserCollection() {
        this.db.collection("users", this.next);
    },
    function insertUsers(err, userCollection) {
        this.users = {};
        this.userCollection = userCollection;
        userCollection.insert(
            [{
                "login": "jdoe",
                "name": "John Doe",
                "email": "john@doe.com"
            }, {
                "login": "lsmith",
                "name": "Lucy Smith",
                "email": "lucy@smith.com"
            }],
            this.next
        );
    }, 
    function storeUsers(err, docs) {
        docs.forEach(function (doc) {
            console.dir(doc);
            this.users[doc.login] = doc;
        }, this);

        this.next();
    },
    function findUsers() {
        console.log("===================================================================================");        
        console.log(">> Users ordered by login ascending");        
        console.log("===================================================================================");
        this.userCollection.find({}, {
            "sort": [['login', 1]]
        }, this.next); 
    },
    function (err, cursor) {
        cursor.each(function (err, user) {
            if (user != null) {
                console.log("[" + user.login + "]:[" + user.name + "]:[" + user.email + "]");
            } else {
                console.log("===================================================================================");        
                console.log(">> Adding articles");        
                console.log("===================================================================================");
                articleStack.handle(Object.create(this));
            }
        });
    }
);

var articleStack = Stak.make(
    function () {
        this.db.collection("article", this.next)
    },
    function (err, articlesCollection) {
        this.articlesCollection = articlesCollection;
        articlesCollection.insert([
            { 
                'title':'Caminando por Buenos Aires', 
                'body':'Las callecitas de Buenos Aires tienen ese no se que...', 
                'author_id': this.authors['Jorge Luis Borges']._id
            },
            { 
                'title':'I must have seen thy face before', 
                'body':'Thine eyes call me in a new way', 
                'author_id': this.authors['William Shakespeare']._id, 
                'comments':[{'user_id': this.users['jdoe']._id, 'body':"great article!"}]
            }
        ], this.next);
    },
    function (err, docs) {
        docs.forEach(function (doc) {
            console.dir(doc);
        });

        this.next();
    },
    function () {
        console.log("===================================================================================");        
        console.log(">> Articles ordered by title ascending");        
        console.log("===================================================================================");        
        this.articlesCollection.find({}, {
            "sort": [["title", 1]]
        }, this.next);
    },
    function (err, cursor) {
        var next = after(cursor.length, this.next);
        cursor.each(function (err, article) {
            if (article != null) {
                console.log("[" + article.title + "]:[" + article.body + "]:[" + article.author_id.toHexString() + "]");
                console.log(">> Closing connection");
                next();
            }
        });
    },
    function () {
        this.db.close();
    }
);